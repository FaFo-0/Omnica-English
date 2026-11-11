"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex";
import { TenantPublicLogo } from "@/components/public/tenant-logo";
import { PolicyView, packLinesFrom } from "@/components/policy/PolicyView";
import { POLICY_CHROME, type PolicyLocale } from "@/components/policy/policyCopy";

const LOCALES: PolicyLocale[] = ["ru", "en", "kk", "ar"];

export function PublicPolicyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("lang");
  const locale: PolicyLocale = LOCALES.includes(requested as PolicyLocale) ? (requested as PolicyLocale) : "ru";
  const c = POLICY_CHROME[locale];
  const policy = useQuery(api.policyConstants.getPublic, {});
  const launch = useQuery(api.tenantSettings.getPublicLaunchInfo);
  const catalogue = useQuery(api.pricing.getPublicCatalogue, { locale });
  const [status, setStatus] = useState("");
  useEffect(() => { document.title = `${c.title} — ${launch?.name ?? "Omnica English"}`; }, [c.title, launch?.name]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/policy?lang=${locale}`);
      setStatus(c.copied);
    } catch {
      setStatus(c.copyFailed);
    }
  }

  const updated = policy?.updatedAt
    ? new Date(policy.updatedAt).toLocaleDateString(locale === "kk" ? "kk-KZ" : locale, { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <main
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-[#faf7ef] px-4 py-5 text-[#26143f] sm:px-8"
      style={{ "--policy-accent": launch?.primaryColor ?? "#6716A4" } as CSSProperties}
    >
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-[#26143f]/15 pb-4">
          <Link href={`/?lang=${locale}`} aria-label={c.home}>
            <TenantPublicLogo logoUrl={launch?.logoUrl} name={launch?.name ?? "Omnica English"} size={40} />
          </Link>
          <select
            aria-label={c.language}
            className="rounded-full border border-[#26143f]/20 bg-white px-3 py-2 text-sm font-semibold"
            value={locale}
            onChange={(e) => router.replace(`/policy?lang=${e.target.value}`, { scroll: false })}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="kk">Қазақша</option>
            <option value="ar">العربية</option>
          </select>
        </header>

        <section className="py-7">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl" style={{ color: "var(--policy-accent)" }}>{c.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-[#63566e] sm:text-lg">{c.intro}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="rounded-full bg-[var(--policy-accent)] px-5 py-3 text-sm font-bold text-white" onClick={() => void copyLink()}>
              {c.copy}
            </button>
            {updated && <span className="text-sm font-semibold text-[#645b70]">{c.updated}: {updated}</span>}
          </div>
          <p aria-live="polite" className="mt-2 min-h-5 text-sm">{status}</p>
        </section>

        {policy === undefined ? (
          <p role="status">{c.loading}</p>
        ) : (
          <PolicyView locale={locale} policy={policy} packs={packLinesFrom(catalogue)} audience="student" />
        )}

        {launch?.supportWhatsappUrl && (
          <p className="mt-8 rounded-2xl bg-white p-4 text-center text-[15px] shadow-sm">
            {c.questions}{" "}
            <a className="font-bold underline underline-offset-4" href={launch.supportWhatsappUrl} target="_blank" rel="noreferrer">{c.whatsapp}</a>
          </p>
        )}
        <p className="mt-6 pb-8 text-center text-sm">
          <Link className="underline underline-offset-4" href="/sign-in">{c.signIn}</Link>
        </p>
      </div>
    </main>
  );
}
