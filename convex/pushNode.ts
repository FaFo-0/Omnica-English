"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type Device = { id: Id<"pushSubscriptions">; endpoint: string; p256dh: string; auth: string };
type Outcome = "sent" | "gone" | "retry";

function configure(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  // Apple rejects localhost subjects; the academy site is a valid contact URL.
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://omnicaenglish.com", publicKey, privateKey);
  return true;
}

async function sendOne(device: Device, payload: Record<string, unknown>): Promise<Outcome> {
  try {
    await webpush.sendNotification(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify(payload),
      // A lesson reminder is useless tomorrow: let the push service drop it.
      { TTL: 6 * 3600, urgency: "high" }
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 0;
    // 404/410: the person turned notifications off or removed the app.
    // 400/403/413: this subscription will never accept our messages.
    if ([400, 403, 404, 410, 413].includes(status)) return "gone";
    console.error("[push] send failed", status, (error as Error).message);
    return "retry";
  }
}

export const deliverPending = internalAction({
  args: {},
  handler: async (ctx): Promise<{ configured: boolean; delivered: number }> => {
    if (!configure()) return { configured: false, delivered: 0 };
    const items: Array<{ notificationId: Id<"notifications">; title: string; body: string; url: string; devices: Device[] }> =
      await ctx.runQuery(internal.push.listPendingDeliveries, {});
    let delivered = 0;
    for (const item of items) {
      const outcomes = await Promise.all(
        item.devices.map(async (device) => ({
          device,
          outcome: await sendOne(device, {
            title: item.title,
            body: item.body,
            url: item.url,
            tag: item.notificationId,
          }),
        }))
      );
      if (outcomes.some((o) => o.outcome === "sent")) delivered += 1;
      await ctx.runMutation(internal.push.recordResult, {
        notificationId: item.notificationId,
        retry: outcomes.some((o) => o.outcome === "retry"),
        goneDeviceIds: outcomes.filter((o) => o.outcome === "gone").map((o) => o.device.id),
      });
    }
    return { configured: true, delivered };
  },
});

const TEST_COPY: Record<string, { title: string; body: string }> = {
  en: { title: "Notifications are on ✓", body: "This is how Omnica English will remind you about lessons." },
  ru: { title: "Уведомления включены ✓", body: "Так Omnica English будет напоминать вам об уроках." },
  ar: { title: "الإشعارات مفعّلة ✓", body: "هكذا سيذكّرك Omnica English بالدروس." },
  kk: { title: "Хабарламалар қосылды ✓", body: "Omnica English сабақтар туралы осылай еске салады." },
};

export const sendTest = internalAction({
  args: { organizationId: v.string(), userId: v.string(), locale: v.string() },
  handler: async (ctx, { organizationId, userId, locale }): Promise<{ configured: boolean; sent: number }> => {
    if (!configure()) return { configured: false, sent: 0 };
    const devices: Device[] = await ctx.runQuery(internal.push.listDevicesForUser, { organizationId, userId });
    const copy = TEST_COPY[locale] ?? TEST_COPY.en;
    const outcomes = await Promise.all(
      devices.map(async (device) => ({ device, outcome: await sendOne(device, { ...copy, url: "/portal", tag: "test" }) }))
    );
    const gone = outcomes.filter((o) => o.outcome === "gone").map((o) => o.device.id);
    if (gone.length) await ctx.runMutation(internal.push.removeDevices, { ids: gone });
    return { configured: true, sent: outcomes.filter((o) => o.outcome === "sent").length };
  },
});
