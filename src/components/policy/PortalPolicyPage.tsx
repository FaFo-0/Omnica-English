"use client";

import { useLocale } from "next-intl";
import type { CSSProperties } from "react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex";
import { PolicyView, packLinesFrom } from "./PolicyView";
import { POLICY_CHROME, type PolicyLocale } from "./policyCopy";

/** Rules inside a portal — same view as the public /policy page. */
export function PortalPolicyPage({ audience }: { audience: "student" | "all" }) {
  const raw = useLocale();
  const locale: PolicyLocale = raw === "en" || raw === "kk" || raw === "ar" ? raw : "ru";
  const c = POLICY_CHROME[locale];
  const policy = useQuery(api.policyConstants.get, {});
  const catalogue = useQuery(api.pricing.getPublicCatalogue, { locale });
  return (
    <div style={{ maxWidth: 820, "--policy-accent": "var(--omnic-tenant-primary)" } as CSSProperties}>
      <h1 className="h1" style={{ margin: "0 0 6px" }}>{c.title}</h1>
      <p className="body-sm" style={{ marginBottom: 18 }}>
        {c.intro}
      </p>
      {policy === undefined ? (
        <div className="body">{c.loading}</div>
      ) : (
        <PolicyView locale={locale} policy={policy} packs={packLinesFrom(catalogue)} audience={audience} />
      )}
    </div>
  );
}
