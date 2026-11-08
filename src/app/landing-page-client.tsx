"use client";

import { useLocale } from "@/i18n/provider";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { ArrowRight, BookOpen, Check, ChevronDown, Mic2 } from "lucide-react";
import { api } from "@convex";
import type { CataloguePackOffer } from "../../convex/lib/pricingCatalogue";
import { LanguageSelectControl } from "@/components/layout/language-switcher";
import { TenantPublicLogo } from "@/components/public/tenant-logo";
import { parseAttribution, storeAttribution, withAttribution } from "@/lib/attribution";
import { LANDING_COPY, PUBLIC_LANGUAGE_OPTIONS, type LandingCopy } from "@/lib/publicLandingCopy";
import { buildLandingLanguageHref, buildPublicHref, formatLandingLessonCount, landingUnit, resolveLandingLocale, type PublicLandingLocale } from "@/lib/publicLandingLocale";

const WHATSAPP = "https://wa.me/message/7M72VAH5Z4Z4C1";
const CURRENCY_KEY = "omnica-currency";
/** Which currency a visitor most likely pays in, before they pick one. */
const LOCALE_CURRENCY: Record<PublicLandingLocale, string> = { ru: "KZT", kk: "KZT", ar: "SAR", en: "USD" };
const NUMBER_LOCALE: Record<PublicLandingLocale, string> = { ru: "ru-RU", kk: "kk-KZ", en: "en-US", ar: "ar-SA" };

const subscribeCurrencyPreference = (notify: () => void) => {
  window.addEventListener("storage", notify);
  window.addEventListener("popstate", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("popstate", notify);
  };
};
const currencyPreferenceSnapshot = () => {
  const fromUrl = new URLSearchParams(window.location.search).get("currency");
  if (fromUrl) return fromUrl.toUpperCase();
  try { return localStorage.getItem(CURRENCY_KEY)?.toUpperCase() ?? ""; } catch { return ""; }
};

/** Landing prices are shown in whole units: a converted "136,92 $" reads like a calculator, not a price. */
function formatMoney(amount: number, currency: string, locale: PublicLandingLocale) {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(Math.round(amount));
}
function currencySymbol(currency: string, locale: PublicLandingLocale) {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.49 0 .14 5.35.13 11.92c0 2.1.55 4.16 1.59 5.98L.03 24l6.27-1.64a11.9 11.9 0 0 0 5.75 1.46h.01c6.57 0 11.92-5.35 11.93-11.92a11.85 11.85 0 0 0-3.47-8.42ZM12.06 21.8h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.88 9.88 0 0 1-1.52-5.27c0-5.46 4.44-9.9 9.91-9.9a9.84 9.84 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7.01c-.01 5.46-4.45 9.9-9.92 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.3 1.26.49 1.69.62.71.23 1.35.2 1.86.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" /></svg>;
}

function CurrencyPills({ value, options, onChange, label, locale, compact = false }: { value: string; options: string[]; onChange: (code: string) => void; label: string; locale: PublicLandingLocale; compact?: boolean }) {
  return <div role="radiogroup" aria-label={label} dir="ltr" className="inline-flex shrink-0 items-center rounded-full border border-[#26143f]/15 bg-white p-0.5">
    {options.map((code) => {
      const active = code === value;
      const symbol = currencySymbol(code, locale);
      return <button key={code} type="button" role="radio" aria-checked={active} onClick={() => onChange(code)} className={`min-h-9 rounded-full px-2.5 text-xs font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-purple-600 sm:px-3 ${active ? "bg-[#26143f] text-white" : "text-[#4a3a5c] hover:bg-[#26143f]/8"}`}>
        {!compact && symbol !== code && <span aria-hidden="true" className="me-1">{symbol}</span>}{code}
      </button>;
    })}
  </div>;
}

function sharedBenefits(packs: CataloguePackOffer[]) {
  const [first, ...rest] = packs;
  return (first?.benefits ?? []).filter((benefit) => rest.every((pack) => pack.benefits.includes(benefit)));
}

function PackCard({ offer, copy, locale, href, whatsappUrl, shared }: { offer: CataloguePackOffer; copy: LandingCopy; locale: PublicLandingLocale; href: string; whatsappUrl: string; shared: string[] }) {
  const percent = offer.salePercent ?? (offer.listPrice > 0 ? Math.round((1 - offer.netPrice / offer.listPrice) * 100) : 0);
  const extras = offer.benefits.filter((benefit) => !shared.includes(benefit));
  return <article className="flex min-w-0 flex-col rounded-3xl border border-[#26143f]/12 bg-white p-6 shadow-[0_10px_30px_-22px_#26143f66] sm:p-7">
    <div className="flex items-start justify-between gap-3">
      <h4 className="text-2xl font-black tracking-tight">{formatLandingLessonCount(offer.lessons, locale)}</h4>
      {offer.onSale && percent > 0 && <span className="rounded-full bg-[#e8f7ee] px-2.5 py-1 text-xs font-extrabold text-[#17703d]">{copy.sale(String(Math.round(percent)))}</span>}
    </div>
    <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <strong className="text-4xl font-black tracking-tight" style={{ color: "var(--public-accent)" }}><bdi>{formatMoney(offer.netPrice, offer.currency, locale)}</bdi></strong>
      {offer.onSale && <del className="text-lg font-semibold text-[#8a8094]"><bdi>{formatMoney(offer.listPrice, offer.currency, locale)}</bdi></del>}
    </div>
    <p className="mt-2 text-sm font-bold text-[#26143f]">{copy.perLesson(formatMoney(offer.netPrice / offer.lessons, offer.currency, locale))}</p>
    <p className="mt-1 text-sm text-[#6d6478]">{copy.validity(`${new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(offer.expiryDays)} ${landingUnit(offer.expiryDays, "day", locale)}`)}</p>
    {extras.length > 0 && <ul className="mt-4 space-y-2">{extras.map((benefit) => <li key={benefit} className="flex gap-2 text-sm text-[#57505f]"><Check size={16} className="mt-0.5 shrink-0 text-[#17703d]" aria-hidden="true" /><span dir="auto">{benefit}</span></li>)}</ul>}
    <div className="mt-auto pt-6">
      <Link href={href} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#26143f] px-5 font-bold text-white transition-colors hover:bg-[#4b2774] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">{copy.choose}<ArrowRight size={17} className="rtl:rotate-180" aria-hidden="true" /></Link>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-10 items-center justify-center gap-2 text-sm font-bold text-[#17703d] hover:underline"><WhatsAppIcon size={16} />{copy.ask}</a>
    </div>
  </article>;
}

export function LandingPageClient() {
  const { setLocale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = resolveLandingLocale(searchParams);
  const copy = LANDING_COPY[locale];
  const attribution = parseAttribution(searchParams);
  const [currencyOverride, setCurrencyOverride] = useState<string | null>(null);
  const rememberedCurrency = useSyncExternalStore(subscribeCurrencyPreference, currencyPreferenceSnapshot, () => "");
  const currencySettings = useQuery(api.currencies.publicSettings, {});
  const enabledCurrencies = currencySettings?.enabledCurrencies ?? [];
  const candidate = currencyOverride ?? rememberedCurrency;
  const currency = enabledCurrencies.includes(candidate) ? candidate : enabledCurrencies.includes(LOCALE_CURRENCY[locale]) ? LOCALE_CURRENCY[locale] : "USD";
  const setCurrency = (code: string) => {
    try { localStorage.setItem(CURRENCY_KEY, code); } catch { /* Storage can be unavailable in private sessions. */ }
    setCurrencyOverride(code);
  };
  const signupHref = withAttribution(`/sign-up?lang=${locale}&currency=${encodeURIComponent(currency)}`, attribution);
  const packHref = (packId: string) => withAttribution(`/sign-up?lang=${locale}&currency=${encodeURIComponent(currency)}&pack=${encodeURIComponent(packId)}`, attribution);
  const catalogue = useQuery(api.pricing.getPublicCatalogue, currencySettings ? { locale, currency } : "skip");
  const launchInfo = useQuery(api.tenantSettings.getPublicLaunchInfo);
  const name = launchInfo?.name ?? "Omnica English";
  const primary = launchInfo?.primaryColor ?? "#6716A4";
  const supportEmail = launchInfo?.supportEmail;
  const whatsappUrl = launchInfo?.supportWhatsappUrl ?? WHATSAPP;
  const homeHref = buildLandingLanguageHref(locale, searchParams);

  // A family whose only pack is a single lesson is the trial; everything else is a regular pack family.
  const trialGroup = catalogue?.find((group) => group.packs.length === 1 && group.packs[0]!.lessons === 1);
  const trial = trialGroup?.packs[0];
  const packGroups = catalogue?.filter((group) => group !== trialGroup) ?? [];
  const trialHref = trial ? packHref(trial.packId) : signupHref;
  const trialPrice = trial ? formatMoney(trial.netPrice, trial.currency, locale) : null;

  useEffect(() => { storeAttribution(attribution); }, [attribution]);
  useEffect(() => {
    setLocale(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.title = `${copy.metaTitle} — ${name}`;
  }, [locale, copy.metaTitle, name, setLocale]);

  const currencyPills = (compact: boolean) => enabledCurrencies.length > 1 && <CurrencyPills value={currency} options={enabledCurrencies} onChange={setCurrency} label={copy.currency} locale={locale} compact={compact} />;
  const sectionTitle = "mt-3 max-w-3xl text-[2rem] font-black leading-[1.1] tracking-[-.035em] sm:text-5xl";
  const eyebrow = "text-xs font-black uppercase tracking-[.16em] text-[#6b329a]";

  return (
    <main id="top" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} data-public-landing className="min-h-screen overflow-x-clip bg-[#faf7ef] text-[#191327]" style={{ "--public-accent": primary } as React.CSSProperties}>
      <header className="sticky top-0 z-40 border-b border-[#26153b]/10 bg-[#faf7ef]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-8">
          <Link href={homeHref} className="flex min-w-0 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-600" aria-label={copy.home}>
            <TenantPublicLogo logoUrl={launchInfo?.logoUrl} name={name} size={48} className="h-9! w-auto! rounded-lg sm:h-11!" />
          </Link>
          <nav className="ms-6 hidden items-center gap-1 text-sm font-semibold lg:flex" aria-label={copy.home}>
            <a href="#how" className="rounded-full px-3 py-2 hover:bg-[#281640]/8">{copy.navHow}</a>
            <a href="#prices" className="rounded-full px-3 py-2 hover:bg-[#281640]/8">{copy.navPrices}</a>
            <a href="#faq" className="rounded-full px-3 py-2 hover:bg-[#281640]/8">{copy.navFaq}</a>
          </nav>
          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:block">{currencyPills(false)}</div>
            <LanguageSelectControl value={locale} onChange={(nextLocale) => router.push(buildLandingLanguageHref(nextLocale, searchParams))} options={PUBLIC_LANGUAGE_OPTIONS} ariaLabel={copy.language} label={locale.toUpperCase()} />
            <Link href={`/sign-in?lang=${locale}`} className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold hover:bg-[#281640]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 sm:px-3">{copy.signIn}</Link>
            <Link href={trialHref} className="hidden rounded-full bg-[#26143f] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4b2774] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 md:inline-flex">{copy.register}</Link>
          </div>
        </div>
        {enabledCurrencies.length > 1 && <div className="flex items-center justify-center gap-2 border-t border-[#26153b]/8 px-4 py-1.5 sm:hidden"><span className="text-xs font-semibold text-[#6d6478]">{copy.currency}:</span>{currencyPills(true)}</div>}
      </header>

      {/* Hero */}
      <section className="relative isolate px-4 pb-14 pt-8 sm:px-8 sm:pt-14 lg:pb-24" aria-labelledby="hero-heading">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(ellipse_at_85%_20%,#f5db8e_0%,transparent_50%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#26143f]/15 bg-white/70 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.12em] text-[#532879]"><span className="h-2 w-2 rounded-full bg-[#eab500]" />{copy.eyebrow}</p>
            <h1 id="hero-heading" className="max-w-[16ch] text-[clamp(2.2rem,9.5vw,4.75rem)] font-black leading-[1.04] tracking-[-.045em]">{copy.heroA} <span style={{ color: primary }}>{copy.heroB}</span></h1>
            <p className="mt-5 max-w-xl text-base leading-[1.7] text-[#4c4558] sm:mt-6 sm:text-lg">{copy.hero}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href={trialHref} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#26143f] px-7 py-3 font-bold text-white shadow-[0_10px_30px_#26143f33] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-purple-600">
                {copy.ctaTrial}{trialPrice && <span className="rounded-full bg-[#ffca00] px-2.5 py-0.5 text-sm font-black text-[#26143f]"><bdi>{trialPrice}</bdi></span>}
              </Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-[#1f9d55] bg-white px-6 font-bold text-[#17703d] transition-colors hover:bg-[#e8f7ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"><WhatsAppIcon />{copy.ctaWhatsapp}</a>
            </div>
            <ul className="mt-7 grid gap-2.5 text-sm font-semibold text-[#4c4558] sm:flex sm:flex-wrap sm:gap-x-6">
              {copy.heroFacts.map((fact) => <li key={fact} className="flex items-center gap-2"><Check size={17} className="shrink-0 text-[#1f9d55]" aria-hidden="true" />{fact}</li>)}
            </ul>
          </div>
          <div role="img" aria-label={copy.illustration} className="relative mx-auto w-full max-w-[500px] rotate-[-1deg] rounded-[2rem] bg-[#26143f] p-4 text-white shadow-[16px_20px_0_#e9ce80] sm:p-6">
            <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#e7d8f7]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#ff5d5d]" />{copy.lesson}</p>
            <div className="rounded-[1.5rem] bg-[#462572] p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ffca00] text-[#26143f]"><Mic2 size={21} /></span><span className="text-sm font-semibold">{copy.live}</span></div><div aria-hidden="true" className="mt-6 flex h-12 items-end gap-1.5">{[26, 46, 34, 58, 39, 64, 29, 53, 40, 61, 35, 48, 27, 59, 33, 43, 25, 49, 30, 57].map((height, i) => <span key={i} className="min-w-0 flex-1 rounded-full bg-[#ffca00]" style={{ height: `${height * 0.75}px`, opacity: i % 3 ? .8 : 1 }} />)}</div></div>
            <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-4 text-[#26143f]"><p className="text-[11px] font-bold uppercase tracking-wider text-[#705988]">{copy.review}</p><p lang="en" dir="ltr" className="mt-2 text-base font-black sm:text-lg">{copy.word}</p><p className="mt-1 text-sm">{copy.wordExample}</p></div><div className="rounded-2xl bg-[#ffca00] p-4 text-[#26143f]"><p className="text-[11px] font-bold uppercase tracking-wider">{copy.card}</p><p lang="en" dir="ltr" className="mt-2 text-base font-black sm:text-lg">{copy.cardFront}</p><p className="mt-1 text-sm">{copy.cardBack}</p></div></div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#e7d8f7]"><Check size={16} className="shrink-0" />{copy.teacher}</p>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="bg-white px-4 py-14 sm:px-8 sm:py-24" aria-labelledby="pain-heading">
        <div className="mx-auto max-w-7xl">
          <p className={eyebrow}>{copy.painEyebrow}</p>
          <h2 id="pain-heading" className={sectionTitle}>{copy.painTitle}</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">{copy.pains.map((pain) => <li key={pain} className="rounded-3xl bg-[#faf7ef] p-6 text-lg leading-relaxed text-[#3d3449]">{locale === "en" ? `“${pain}”` : `«${pain}»`}</li>)}</ul>
          <p className="mt-8 max-w-3xl border-s-4 border-[#ffca00] ps-5 text-lg font-semibold leading-8 text-[#26143f] sm:text-xl">{copy.painAnswer}</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-28 px-4 py-14 sm:px-8 sm:py-24" aria-labelledby="how-heading">
        <div className="mx-auto max-w-7xl">
          <p className={eyebrow}>{copy.howEyebrow}</p>
          <h2 id="how-heading" className={sectionTitle}>{copy.howTitle}</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{copy.steps.map(([title, body], index) => <li key={title} className="rounded-3xl border border-[#26143f]/10 bg-white p-6"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#26143f] text-sm font-black text-[#ffca00]">{index + 1}</span><h3 className="mt-5 text-xl font-black tracking-tight">{title}</h3><p className="mt-2 leading-7 text-[#57505f]">{body}</p></li>)}</ol>
        </div>
      </section>

      {/* Between lessons */}
      <section className="bg-white px-4 py-14 sm:px-8 sm:py-24" aria-labelledby="between-heading">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className={eyebrow}>{copy.betweenEyebrow}</p>
            <h2 id="between-heading" className={sectionTitle}>{copy.betweenTitle}</h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-[#57505f]">{copy.betweenText}</p>
            <ul className="mt-6 space-y-3">{copy.between.map((item) => <li key={item} className="flex items-start gap-3 font-semibold"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#ffca00] text-[#26143f]"><Check size={14} aria-hidden="true" /></span>{item}</li>)}</ul>
          </div>
          <div role="img" aria-label={copy.illustration} className="rounded-[1.75rem] border border-[#d5c8dd] bg-[#faf7ef] p-5 shadow-[12px_12px_0_#ddd2ed] sm:p-9"><div className="flex items-center justify-between gap-3 border-b border-[#ddd5e3] pb-5"><div className="flex items-center gap-3 font-bold text-[#3d2459]"><BookOpen size={21} />{copy.readingSample}</div><span className="rounded-full bg-[#f2e9fb] px-3 py-1 text-xs font-bold text-[#5b2b85]">A2</span></div><p lang="en" dir="ltr" className="mt-8 font-serif text-3xl leading-snug tracking-tight sm:text-4xl">Every small <mark className="rounded bg-[#ffdf70] px-1 text-inherit">step</mark> helps you grow.</p><p className="mt-8 border-s-4 border-[#ffca00] ps-4 text-sm leading-6 text-[#57505f]">{copy.readingHint}</p></div>
        </div>
      </section>

      {/* About the school */}
      <section className="bg-[#26143f] px-4 py-14 text-white sm:px-8 sm:py-24" aria-labelledby="school-heading">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#ffdb6c]">{copy.schoolEyebrow}</p>
          <h2 id="school-heading" className="mt-3 max-w-3xl text-[2rem] font-black leading-[1.1] tracking-[-.035em] sm:text-5xl">{copy.schoolTitle}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#e2d9e9]">{copy.schoolText}</p>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">{copy.schoolPoints.map(([title, body]) => <li key={title} className="rounded-3xl bg-white/8 p-6"><h3 className="text-xl font-black text-[#ffca00]">{title}</h3><p className="mt-2 leading-7 text-[#e2d9e9]">{body}</p></li>)}</ul>
        </div>
      </section>

      {/* Prices */}
      <section id="prices" className="scroll-mt-28 px-4 py-14 sm:px-8 sm:py-24" aria-labelledby="prices-heading">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={eyebrow}>{copy.pricesEyebrow}</p>
              <h2 id="prices-heading" className={sectionTitle}>{copy.pricesTitle}</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-[#57505f]">{copy.pricesText}</p>
            </div>
            {currencyPills(false)}
          </div>
          {catalogue === undefined ? <p role="status" className="mt-10 animate-pulse font-semibold text-[#6d6478]">{copy.loading}</p> : catalogue.length === 0 ? <p className="mt-10 rounded-2xl bg-white p-6">{copy.empty}</p> : <>
            {trial && <div className="mt-10 flex flex-col gap-5 rounded-3xl bg-[#ffca00] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div><h3 className="text-2xl font-black">{copy.trialTitle} · <bdi>{trialPrice}</bdi></h3><p className="mt-2 max-w-xl leading-7">{copy.trialText}</p></div>
              <Link href={trialHref} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#26143f] px-7 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">{copy.trialChoose}<ArrowRight size={17} className="rtl:rotate-180" aria-hidden="true" /></Link>
            </div>}
            {packGroups.map((group) => {
              const shared = sharedBenefits(group.packs);
              return <div key={group.familyId} className="mt-10">
                {packGroups.length > 1 && <h3 className="mb-4 text-2xl font-black">{group.label}</h3>}
                {shared.length > 0 && <div className="mb-6 rounded-3xl border border-[#26143f]/10 bg-white p-6"><p className="text-sm font-black uppercase tracking-wider text-[#6b329a]">{copy.included}</p><ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">{shared.map((benefit) => <li key={benefit} className="flex gap-2 text-[#3d3449]"><Check size={18} className="mt-0.5 shrink-0 text-[#1f9d55]" aria-hidden="true" /><span dir="auto">{benefit}</span></li>)}</ul></div>}
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{group.packs.map((offer) => <PackCard key={offer.packId} offer={offer} copy={copy} locale={locale} href={packHref(offer.packId)} whatsappUrl={whatsappUrl} shared={shared} />)}</div>
              </div>;
            })}
            <p className="mt-6 text-sm text-[#6d6478]">{copy.paymentNote}</p>
          </>}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-28 bg-white px-4 py-14 sm:px-8 sm:py-24" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <p className={eyebrow}>{copy.faqEyebrow}</p>
          <h2 id="faq-heading" className={sectionTitle}>{copy.faqTitle}</h2>
          <div className="mt-8 divide-y divide-[#26143f]/10 border-y border-[#26143f]/10">
            {copy.faq.map(([question, answer]) => <details key={question} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-bold focus-visible:outline-2 focus-visible:outline-purple-600 [&::-webkit-details-marker]:hidden">{question}<ChevronDown size={20} className="shrink-0 text-[#6b329a] transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
              <p className="pb-5 pe-8 leading-7 text-[#57505f]">{answer}</p>
            </details>)}
          </div>
        </div>
      </section>

      {/* Final call */}
      <section className="px-4 py-14 sm:px-8 sm:py-24" aria-labelledby="final-heading">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] bg-[#ffca00] p-7 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><h2 id="final-heading" className="max-w-2xl text-4xl font-black tracking-[-.04em] sm:text-5xl">{copy.finalTitle}</h2><p className="mt-5 max-w-xl text-lg leading-8">{copy.finalText}</p></div>
          <div className="flex flex-col gap-3">
            <Link href={trialHref} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#26143f] px-7 text-center font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">{copy.start}<ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" /></Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border-2 border-[#26143f] px-7 text-center font-bold text-[#26143f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"><WhatsAppIcon />{copy.ctaWhatsapp}</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#26143f]/15 bg-white px-4 pb-24 pt-10 sm:px-8 sm:pb-10"><div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3 font-black"><TenantPublicLogo logoUrl={launchInfo?.logoUrl} name={name} size={34} className="rounded-lg" /></div><nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold" aria-label={copy.legal}><Link href={buildPublicHref("/privacy", locale, searchParams)} className="hover:underline">{copy.privacy}</Link><Link href={buildPublicHref("/terms", locale, searchParams)} className="hover:underline">{copy.terms}</Link>{supportEmail && <a href={`mailto:${supportEmail}`} className="break-all hover:underline">{copy.email}: {supportEmail}</a>}<a href={whatsappUrl} className="hover:underline" target="_blank" rel="noopener noreferrer">WhatsApp</a>{launchInfo?.supportTelegramUrl && <a href={launchInfo.supportTelegramUrl} className="hover:underline" target="_blank" rel="noopener noreferrer">Telegram</a>}<a href="#top" className="hover:underline">{copy.back}</a></nav></div></footer>

      {/* Floating WhatsApp: always one tap away, like a chat button. */}
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={copy.whatsapp} title={copy.whatsapp} className="fixed bottom-5 end-5 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-[#25d366] px-4 font-bold text-white shadow-[0_10px_30px_-8px_#0a5c2d99] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-purple-600">
        <WhatsAppIcon size={26} /><span className="hidden lg:inline">{copy.ctaWhatsapp}</span>
      </a>
    </main>
  );
}
