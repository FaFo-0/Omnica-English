import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireTenant } from "./lib/tenant";
import { pushMessage, type NotifRole, type NotificationLocale } from "./lib/notificationRegistry";

// Phone/browser push for the installed app. The bell stays the system of
// record; this is a best-effort outbox the minute cron drains. Only rows from
// the last half hour are considered, so a newly turned-on phone never gets a
// burst of old history and a long outage never replays stale reminders.
const WINDOW_MS = 30 * 60_000;
const MAX_ATTEMPTS = 3;
const MAX_DEVICES_PER_USER = 10;

const platformValidator = v.optional(v.union(v.literal("ios"), v.literal("android"), v.literal("desktop")));

/** Public VAPID key the browser needs to subscribe. Null = push not set up. */
export const getConfig = query({
  args: {},
  handler: async () => ({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null }),
});

/** Whether this device (by endpoint) is on, and how many devices the member has. */
export const getMyStatus = query({
  args: { endpoint: v.optional(v.string()) },
  handler: async (ctx, { endpoint }) => {
    const { orgId, user } = await requireTenant(ctx);
    const devices = await mySubscriptions(ctx, orgId, user.externalId);
    return {
      deviceCount: devices.length,
      thisDevice: !!endpoint && devices.some((d) => d.endpoint === endpoint),
    };
  },
});

/** Save (or move to this member) the device's push subscription. */
export const subscribe = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string(), platform: platformValidator },
  handler: async (ctx, args) => {
    const { orgId, user } = await requireTenant(ctx);
    if (!/^https:\/\//.test(args.endpoint) || args.endpoint.length > 2048) {
      throw new Error("Invalid push subscription");
    }
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        organizationId: orgId,
        userId: user.externalId,
        p256dh: args.p256dh,
        auth: args.auth,
        platform: args.platform,
        // A device handed to a different person starts fresh: no notifications
        // created before they turned it on.
        ...(existing.userId !== user.externalId ? { createdAt: now } : {}),
        lastSeenAt: now,
      });
      return { saved: true };
    }
    await ctx.db.insert("pushSubscriptions", {
      organizationId: orgId,
      userId: user.externalId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      platform: args.platform,
      createdAt: now,
      lastSeenAt: now,
    });
    // Phones get replaced; keep the newest handful per person.
    const devices = await mySubscriptions(ctx, orgId, user.externalId);
    for (const stale of devices.slice(0, Math.max(0, devices.length - MAX_DEVICES_PER_USER))) {
      await ctx.db.delete(stale._id);
    }
    return { saved: true };
  },
});

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const { user } = await requireTenant(ctx);
    const row = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (row && row.userId === user.externalId) await ctx.db.delete(row._id);
  },
});

/** "Send me a test" from Profile — goes to every device the member has on. */
export const sendTestToMe = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId, user } = await requireTenant(ctx);
    const devices = await mySubscriptions(ctx, orgId, user.externalId);
    if (devices.length === 0) throw new Error("Notifications are not on for any device yet");
    await ctx.scheduler.runAfter(0, internal.pushNode.sendTest, {
      organizationId: orgId,
      userId: user.externalId,
      locale: user.locale ?? "en",
    });
  },
});

/** Staff: which members have reminders on at least one device (🔔 column). */
export const listReachableUserIds = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, user } = await requireTenant(ctx);
    if (user.role !== "admin" && user.role !== "teacher") return [];
    const rows = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_organization_and_userId", (q) => q.eq("organizationId", orgId))
      .take(2000);
    return [...new Set(rows.map((r) => r.userId))];
  },
});

async function mySubscriptions(ctx: QueryCtx | MutationCtx, orgId: string, userId: string) {
  return await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_organization_and_userId", (q) => q.eq("organizationId", orgId).eq("userId", userId))
    .take(50);
}

// ── outbox ───────────────────────────────────────────────────────────

/** Cron entry point. Cheap check in the default runtime; only wakes the Node
 *  sender when there is actually something to send. */
export const kick = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return { scheduled: false };
    const pending = await pendingDeliveries(ctx, 1);
    if (pending.length === 0) return { scheduled: false };
    await ctx.scheduler.runAfter(0, internal.pushNode.deliverPending, {});
    return { scheduled: true };
  },
});

export const listPendingDeliveries = internalQuery({
  args: {},
  handler: async (ctx) => await pendingDeliveries(ctx, 100),
});

async function pendingDeliveries(ctx: QueryCtx, limit: number) {
  const since = Date.now() - WINDOW_MS;
  const recent = await ctx.db.query("notifications").order("desc").take(300);
  const out: Array<{
    notificationId: Id<"notifications">;
    title: string;
    body: string;
    url: string;
    devices: Array<{ id: Id<"pushSubscriptions">; endpoint: string; p256dh: string; auth: string }>;
  }> = [];
  for (const row of recent) {
    if (row._creationTime < since) break;
    if (row.pushSentAt || row.withdrawnAt) continue;
    const devices = (await mySubscriptions(ctx, row.organizationId, row.recipientId)).filter(
      (d) => d.createdAt <= row.createdAt
    );
    if (devices.length === 0) continue;
    const recipients = await ctx.db
      .query("users")
      .withIndex("by_organization_and_externalId", (q) =>
        q.eq("organizationId", row.organizationId).eq("externalId", row.recipientId)
      )
      .collect();
    const recipient = recipients[recipients.length - 1];
    if (!recipient || recipient.role === "removed") continue;
    const message = pushMessage(
      row.kind,
      row.payload as Record<string, unknown>,
      row.link,
      recipient.role as NotifRole,
      (recipient.locale ?? "en") as NotificationLocale
    );
    out.push({
      notificationId: row._id,
      ...message,
      devices: devices.map((d) => ({ id: d._id, endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth })),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export const recordResult = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    retry: v.boolean(),
    goneDeviceIds: v.array(v.id("pushSubscriptions")),
  },
  handler: async (ctx, { notificationId, retry, goneDeviceIds }) => {
    for (const id of goneDeviceIds) {
      if (await ctx.db.get(id)) await ctx.db.delete(id);
    }
    const row = await ctx.db.get(notificationId);
    if (!row || row.pushSentAt) return;
    const attempts = (row.pushAttemptCount ?? 0) + 1;
    await ctx.db.patch(notificationId, {
      pushAttemptCount: attempts,
      ...(!retry || attempts >= MAX_ATTEMPTS ? { pushSentAt: new Date().toISOString() } : {}),
    });
  },
});

export const listDevicesForUser = internalQuery({
  args: { organizationId: v.string(), userId: v.string() },
  handler: async (ctx, { organizationId, userId }) =>
    (await mySubscriptions(ctx, organizationId, userId)).map((d) => ({
      id: d._id,
      endpoint: d.endpoint,
      p256dh: d.p256dh,
      auth: d.auth,
    })),
});

export const removeDevices = internalMutation({
  args: { ids: v.array(v.id("pushSubscriptions")) },
  handler: async (ctx, { ids }) => {
    for (const id of ids) if (await ctx.db.get(id)) await ctx.db.delete(id);
  },
});
