"use client";

// One-time notice after the admin changes a rule in Settings → Policy.
// No re-signing: people who joined before the change see it once, open the
// rules or dismiss, and it's gone.

import Link from "next/link";
import { useLocale } from "next-intl";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex";
import { POLICY_CHROME, type PolicyLocale } from "./policyCopy";

export function PolicyUpdatedBanner({ rulesHref }: { rulesHref: string }) {
  const raw = useLocale();
  const locale: PolicyLocale = raw === "en" || raw === "kk" || raw === "ar" ? raw : "ru";
  const me = useQuery(api.users.getMe, {});
  const policy = useQuery(api.policyConstants.get, me ? {} : "skip");
  const markSeen = useMutation(api.users.markPolicySeen);
  if (!me || !policy?.updatedAt) return null;
  const seen = me.policySeenAt ?? me.createdAt;
  if (seen >= policy.updatedAt) return null;
  const c = POLICY_CHROME[locale];
  const dismiss = () => void markSeen({});
  return (
    <div
      role="status"
      style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "10px 14px", marginBottom: 16, borderRadius: 12,
        background: "var(--omnic-tenant-primary-soft)", color: "var(--omnic-gray-900)",
      }}
    >
      <span style={{ flex: 1, minWidth: 180, fontWeight: 600 }}>{c.bannerText}</span>
      <Link href={rulesHref} className="btn btn-tenant btn-sm" onClick={dismiss}>{c.bannerOpen}</Link>
      <button className="btn btn-secondary btn-sm" onClick={dismiss}>{c.bannerDismiss}</button>
    </div>
  );
}
