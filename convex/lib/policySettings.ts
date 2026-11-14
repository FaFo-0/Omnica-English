// Loads the academy's live policy numbers (POLICY_DEFAULTS + admin overrides
// from tenantSettings.policy). Every rule check reads through this so a save
// in Settings → Policy takes effect on the next action.

import type { QueryCtx } from "../_generated/server";
import { resolvePolicy, type PolicyValues } from "./policy";

export async function loadPolicy(ctx: QueryCtx, orgId: string): Promise<PolicyValues> {
  const settings = await ctx.db
    .query("tenantSettings")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .unique();
  return resolvePolicy(settings?.policy);
}
