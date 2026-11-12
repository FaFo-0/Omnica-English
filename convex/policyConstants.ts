// The academy's live policy numbers. POLICY_DEFAULTS (convex/lib/policy.ts)
// plus whatever the admin changed in Settings → Policy. Every screen that
// states a rule — /policy, the guides, the calendar dialogs — reads from here,
// so the words always match what the server enforces.

import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireTenant, requireTenantPermission, ACADEMY_ID } from "./lib/tenant";
import {
  POLICY,
  POLICY_DEFAULTS,
  POLICY_LIMITS,
  resolvePolicy,
  type PolicyKey,
} from "./lib/policy";

async function settingsRow(ctx: QueryCtx, orgId: string) {
  return await ctx.db
    .query("tenantSettings")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .unique();
}

function fixedRules() {
  return {
    reservationMinutes: POLICY.reservationMinutes,
    teachingMinutes: POLICY.teachingMinutes,
    bookingGranularityMinutes: POLICY.bookingGranularityMinutes,
    lessonStartEarlyMinutes: POLICY.lessonStartEarlyMinutes,
  };
}

/** Signed-in: live values plus the fixed rules (admin Settings, guides, dialogs). */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireTenant(ctx);
    const settings = await settingsRow(ctx, orgId);
    return {
      ...fixedRules(),
      ...resolvePolicy(settings?.policy),
      updatedAt: settings?.policyUpdatedAt ?? null,
    };
  },
});

/** Signed-out: the shareable /policy page. Rules only — nothing private. */
export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const settings = await settingsRow(ctx, ACADEMY_ID);
    return {
      ...fixedRules(),
      ...resolvePolicy(settings?.policy),
      updatedAt: settings?.policyUpdatedAt ?? null,
    };
  },
});

/** Admin editor: defaults and allowed ranges, so the form can validate and reset. */
export const getEditor = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireTenantPermission(ctx, "scheduling.edit");
    const settings = await settingsRow(ctx, orgId);
    return {
      values: resolvePolicy(settings?.policy),
      defaults: POLICY_DEFAULTS,
      limits: POLICY_LIMITS,
      updatedAt: settings?.policyUpdatedAt ?? null,
    };
  },
});

export const update = mutation({
  args: { values: v.record(v.string(), v.number()) },
  handler: async (ctx, { values }) => {
    const { orgId } = await requireTenantPermission(ctx, "scheduling.edit");
    const settings = await settingsRow(ctx, orgId);
    if (!settings) throw new Error("Tenant settings not initialized");
    const next: Record<string, number> = {};
    for (const [key, value] of Object.entries(values)) {
      if (!(key in POLICY_DEFAULTS)) throw new Error(`Unknown policy setting: ${key}`);
      const [min, max] = POLICY_LIMITS[key as PolicyKey];
      if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${key} must be a whole number from ${min} to ${max}`);
      }
      // Store only what differs from the default, so a later default change
      // still reaches settings the admin never touched.
      if (value !== POLICY_DEFAULTS[key as PolicyKey]) next[key] = value;
    }
    const merged = resolvePolicy(next);
    if (merged.noShowPingMinutes >= merged.noShowWaitMinutes) {
      throw new Error("The late-teacher reminder must come before the no-show refund");
    }
    if (merged.expiryWarnSecondDays >= merged.expiryWarnFirstDays) {
      throw new Error("The second expiry warning must be closer to expiry than the first");
    }
    await ctx.db.patch(settings._id, {
      policy: next,
      policyUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});
