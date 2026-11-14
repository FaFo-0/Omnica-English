import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex";
import { resolveLandingLocale } from "@/lib/publicLandingLocale";

export const dynamic = "force-dynamic";

// Link the academy sends in WhatsApp/Telegram once someone agrees to a trial:
// omnicaenglish.com/trial. It opens sign-up with the trial pack chosen; after
// onboarding the student's billing page asks them to confirm the request.
// Nothing is ordered automatically.
const LOCALE_CURRENCY = { ru: "KZT", kk: "KZT", ar: "SAR", en: "USD" } as const;

export default async function TrialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams(Object.entries(raw).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []));
  const locale = resolveLandingLocale(params);
  const settings = await fetchQuery(api.currencies.publicSettings, {}).catch(() => null);
  const currency = settings?.enabledCurrencies.includes(LOCALE_CURRENCY[locale]) ? LOCALE_CURRENCY[locale] : "USD";
  const catalogue = await fetchQuery(api.pricing.getPublicCatalogue, { locale, currency }).catch(() => []);
  // The trial is the family whose only pack is a single lesson (same rule the billing cards use for the compact trial layout).
  const trial = catalogue.find((group) => group.packs.length === 1 && group.packs[0]!.lessons === 1)?.packs[0];
  const target = new URLSearchParams({ lang: locale, currency });
  if (trial) target.set("pack", trial.packId);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "ref"]) {
    const value = params.get(key);
    if (value) target.set(key, value);
  }
  redirect(`/sign-up?${target.toString()}`);
}
