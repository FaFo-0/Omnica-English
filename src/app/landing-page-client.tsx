"use client";

import { useLocale } from "@/i18n/provider";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { ArrowRight, Banknote, BarChart3, BellRing, BookMarked, CalendarDays, Check, ChevronDown, Flame, Languages, MessagesSquare, PenLine, Video } from "lucide-react";
import { api } from "@convex";
import { PublicPlanCard } from "@/components/billing/PublicPlanCard";
import { LanguageSelectControl } from "@/components/layout/language-switcher";
import { TenantPublicLogo } from "@/components/public/tenant-logo";
import { FlashcardDemo, NotesDemo, QuizDemo, ReadingDemo } from "@/components/public/landing-demos";
import { parseAttribution, storeAttribution, withAttribution } from "@/lib/attribution";
import { LANDING_COPY, PUBLIC_LANGUAGE_OPTIONS, type LandingCopy } from "@/lib/publicLandingCopy";
import { buildLandingLanguageHref, buildPublicHref, resolveLandingLocale, type PublicLandingLocale } from "@/lib/publicLandingLocale";

const WHATSAPP = "https://wa.me/message/7M72VAH5Z4Z4C1";
const CURRENCY_KEY = "omnica-currency";
/** The currency a visitor most likely pays in, until they pick one. Ignored when that currency isn't enabled in billing. */
const LOCALE_CURRENCY: Record<PublicLandingLocale, string> = { ru: "KZT", kk: "KZT", ar: "SAR", en: "USD" };

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
function currencySymbol(code: string) {
  try { return new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value ?? code; } catch { return code; }
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.49 0 .14 5.35.13 11.92c0 2.1.55 4.16 1.59 5.98L.03 24l6.27-1.64a11.9 11.9 0 0 0 5.75 1.46h.01c6.57 0 11.92-5.35 11.93-11.92a11.85 11.85 0 0 0-3.47-8.42ZM12.06 21.8h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.88 9.88 0 0 1-1.52-5.27c0-5.46 4.44-9.9 9.91-9.9a9.84 9.84 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7.01c-.01 5.46-4.45 9.9-9.92 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.3 1.26.49 1.69.62.71.23 1.35.2 1.86.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" /></svg>;
}

/** Illustration of the student's home screen: real features, made-up student. */
function AccountMock({ copy }: { copy: LandingCopy }) {
  return <div role="img" aria-label={copy.illustration} className="relative mx-auto w-full max-w-[460px]">
    <div aria-hidden="true" className="absolute -end-4 -top-5 h-28 w-28 rounded-full bg-[#ffca00] sm:-end-8 sm:h-36 sm:w-36" />
    <div aria-hidden="true" className="absolute -bottom-5 -start-4 h-20 w-20 rounded-[1.5rem] bg-[#d9c8f0] rotate-12 sm:-start-8" />
    <div className="relative rounded-[2rem] border-2 border-[#26143f]/10 bg-white p-4 shadow-[0_30px_60px_-35px_#26143f99] sm:p-5">
      <div className="flex items-center justify-between"><p className="text-lg font-black">{copy.mockHello}</p><span className="inline-flex items-center gap-1 rounded-full bg-[#fff0c7] px-2.5 py-1 text-sm font-black text-[#8a5a00]"><Flame size={15} />12</span></div>
      <div className="mt-4 rounded-3xl bg-[#26143f] p-4 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ffdb6c]">{copy.mockNext}</p>
        <p className="mt-1 text-xl font-black">{copy.mockWhen}</p>
        <p lang="en" dir="ltr" className="mt-0.5 text-sm text-[#e2d9e9]">{copy.mockTopic}</p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#ffca00] px-4 py-2 text-sm font-black text-[#26143f]"><Video size={16} />{copy.mockJoin}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-[#ffca00] p-4"><p className="text-xs font-bold text-[#26143f]/70">{copy.mockDue}</p><p className="mt-1 text-3xl font-black">18</p><span className="mt-2 inline-block rounded-full bg-[#26143f] px-3 py-1 text-xs font-bold text-white">{copy.mockStudy}</span></div>
        <div className="rounded-3xl bg-[#f1ebf8] p-4"><p className="text-3xl font-black text-[#4c127e]">148</p><p className="text-xs font-bold text-[#5d5568]">{copy.mockWords}</p><p className="mt-2 text-xl font-black text-[#4c127e]">12</p><p className="text-xs font-bold text-[#5d5568]">{copy.mockStreak}</p></div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-3xl border-2 border-[#26143f]/8 p-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e3f7ea] text-[#17703d]"><Check size={20} /></span><div><p className="text-sm font-black">{copy.mockHomework}</p><p className="text-xs font-semibold text-[#17703d]">{copy.mockHomeworkDone}</p></div></div>
    </div>
  </div>;
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
  const catalogue = useQuery(api.pricing.getPublicCatalogue, currencySettings ? { locale, currency } : "skip");
  const launchInfo = useQuery(api.tenantSettings.getPublicLaunchInfo);
  const name = launchInfo?.name ?? "Omnica English";
  const primary = launchInfo?.primaryColor ?? "#6716A4";
  const supportEmail = launchInfo?.supportEmail;
  const whatsappUrl = launchInfo?.supportWhatsappUrl ?? WHATSAPP;
  const homeHref = buildLandingLanguageHref(locale, searchParams);

  useEffect(() => { storeAttribution(attribution); }, [attribution]);
  useEffect(() => {
    setLocale(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.title = `${copy.metaTitle} — ${name}`;
  }, [locale, copy.metaTitle, name, setLocale]);

  const eyebrow = "text-sm font-black uppercase tracking-[.14em] text-[#7a3cb0]";
  const h2 = "mt-3 text-[2.1rem] font-black leading-[1.08] tracking-[-.035em] sm:text-5xl lg:text-[3.4rem]";
  const programIcons = [BookMarked, MessagesSquare, PenLine];
  const programColors = ["bg-[#ffca00]", "bg-[#d9c8f0]", "bg-[#c9f2d6]"];
  const tileIcons = [CalendarDays, BellRing, BarChart3, Languages];

  return (
    <main id="top" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} data-public-landing className="min-h-screen overflow-x-clip bg-[#fffaf0] text-[#1d1330]" style={{ "--public-accent": primary } as React.CSSProperties}>
      <header className="sticky top-0 z-40 border-b border-[#26153b]/8 bg-[#fffaf0]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-3 py-2 sm:gap-2 sm:px-8">
          <Link href={homeHref} className="flex min-w-0 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-600" aria-label={copy.home}>
            <TenantPublicLogo logoUrl={launchInfo?.logoUrl} name={name} size={48} className="h-9! w-auto! rounded-lg sm:h-11!" />
          </Link>
          <nav className="ms-4 hidden items-center text-sm font-semibold xl:flex" aria-label={copy.home}>
            {([["#programs", copy.navPrograms], ["#lesson", copy.navLesson], ["#platform", copy.navPlatform], ["#prices", copy.navPrices], ["#faq", copy.navFaq]] as const).map(([href, label]) => <a key={href} href={href} className="rounded-full px-3 py-2 hover:bg-[#281640]/8">{label}</a>)}
          </nav>
          <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
            {enabledCurrencies.length > 1 && <LanguageSelectControl value={currency} onChange={setCurrency} options={enabledCurrencies.map((code) => ({ value: code, label: `${code} · ${currencySymbol(code)}` }))} ariaLabel={copy.currency} label={currency} icon={<Banknote aria-hidden="true" className="h-5 w-5" />} />}
            <LanguageSelectControl value={locale} onChange={(nextLocale) => router.push(buildLandingLanguageHref(nextLocale, searchParams))} options={PUBLIC_LANGUAGE_OPTIONS} ariaLabel={copy.language} label={locale.toUpperCase()} />
            <Link href={`/sign-in?lang=${locale}`} className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold hover:bg-[#281640]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">{copy.signIn}</Link>
            <Link href={signupHref} className="ms-1 hidden rounded-full bg-[#26143f] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4b2774] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 md:inline-flex">{copy.register}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pb-16 pt-10 sm:px-8 sm:pt-16 lg:pb-24" aria-labelledby="hero-heading">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#26143f] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[.12em] text-[#ffdb6c]"><span className="h-2 w-2 rounded-full bg-[#ffca00]" />{copy.eyebrow}</p>
            <h1 id="hero-heading" className="mt-5 text-[clamp(2.5rem,10vw,5.25rem)] font-black leading-[1] tracking-[-.05em]">{copy.heroA}<br /><span className="relative inline-block" style={{ color: primary }}>{copy.heroB}<span aria-hidden="true" className="absolute inset-x-0 -bottom-1 -z-10 h-4 rounded-full bg-[#ffca00] sm:h-5" /></span></h1>
            <p className="mt-6 max-w-xl text-lg leading-[1.65] text-[#4c4558] sm:text-xl">{copy.hero}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={signupHref} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#26143f] px-8 font-bold text-white shadow-[0_12px_30px_-10px_#26143f] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-purple-600">{copy.ctaTrial}<ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" /></Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-[#26143f]/15 bg-white px-7 font-bold text-[#17703d] transition-colors hover:border-[#1f9d55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"><WhatsAppIcon />{copy.ctaWhatsapp}</a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">{copy.heroFacts.map((fact) => <li key={fact} className="rounded-full border border-[#26143f]/12 bg-white px-3.5 py-1.5 text-sm font-bold text-[#3d3449]">{fact}</li>)}</ul>
          </div>
          <AccountMock copy={copy} />
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="scroll-mt-20 px-4 py-16 sm:px-8 sm:py-24" aria-labelledby="programs-heading">
        <div className="mx-auto max-w-7xl">
          <p className={eyebrow}>{copy.programsEyebrow}</p>
          <h2 id="programs-heading" className={h2}>{copy.programsTitle}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5d5568]">{copy.programsText}</p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {copy.programs.map((program, index) => {
              const Icon = programIcons[index] ?? BookMarked;
              return <article key={program.title} className="flex flex-col rounded-[2rem] bg-white p-6 shadow-[0_18px_40px_-30px_#26143f80] ring-2 ring-[#26143f]/6 sm:p-8">
                <span className={`grid h-14 w-14 place-items-center rounded-2xl ${programColors[index] ?? "bg-[#ffca00]"} text-[#26143f]`}><Icon size={26} /></span>
                <h3 className="mt-6 text-2xl font-black tracking-tight">{program.title}</h3>
                <p className="mt-1 font-bold text-[#7a3cb0]">{program.tag}</p>
                <p className="mt-4 leading-7 text-[#5d5568]">{program.forWhom}</p>
                <ul className="mt-5 space-y-2.5 border-t-2 border-dashed border-[#26143f]/10 pt-5">{program.items.map((point) => <li key={point} className="flex gap-2.5 font-semibold text-[#3d3449]"><Check size={19} className="mt-0.5 shrink-0 text-[#1f9d55]" aria-hidden="true" />{point}</li>)}</ul>
              </article>;
            })}
          </div>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#fff0c7] px-4 py-2 font-bold text-[#6b4a00]">{copy.programsNote}</p>
        </div>
      </section>

      {/* Lesson flow */}
      <section id="lesson" className="scroll-mt-20 bg-[#26143f] px-4 py-16 text-white sm:px-8 sm:py-24" aria-labelledby="lesson-heading">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[.14em] text-[#ffdb6c]">{copy.flowEyebrow}</p>
          <h2 id="lesson-heading" className={h2}>{copy.flowTitle}</h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {copy.flow.map(([label, title, body], index) => <li key={label} className="relative rounded-[2rem] bg-white/7 p-6 sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ffca00] px-3 py-1 text-sm font-black text-[#26143f]"><span dir="ltr">{index + 1}</span>· {label}</span>
              <h3 className="mt-5 text-2xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-[#e2d9e9]">{body}</p>
            </li>)}
          </ol>
        </div>
      </section>

      {/* Platform: live demos */}
      <section id="platform" className="scroll-mt-20 px-4 py-16 sm:px-8 sm:py-24" aria-labelledby="platform-heading">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className={eyebrow}>{copy.platformEyebrow}</p>
            <h2 id="platform-heading" className={h2}>{copy.platformTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-[#5d5568]">{copy.platformText}</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <ReadingDemo copy={copy} />
            <FlashcardDemo copy={copy} />
            <QuizDemo copy={copy} />
            <NotesDemo copy={copy} />
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {copy.tiles.map(([title, body], index) => {
              const Icon = tileIcons[index] ?? CalendarDays;
              return <li key={title} className="rounded-[2rem] bg-[#f1ebf8] p-4 sm:p-6"><Icon size={24} className="text-[#4c127e]" aria-hidden="true" /><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-1.5 leading-6 text-[#5d5568]">{body}</p></li>;
            })}
          </ul>
        </div>
      </section>

      {/* Prices: the billing catalogue's own cards, exactly as the admin pack editor previews them. */}
      <section id="prices" className="scroll-mt-20 bg-white px-4 py-16 sm:px-8 sm:py-24" aria-labelledby="prices-heading">
        <div className="mx-auto max-w-7xl">
          <p className={eyebrow}>{copy.pricesEyebrow}</p>
          <h2 id="prices-heading" className={h2}>{copy.pricesTitle}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5d5568]">{copy.pricesText}</p>
          {catalogue === undefined ? <p role="status" className="mt-10 animate-pulse font-semibold text-[#6d6478]">{copy.loading}</p> : catalogue.length === 0 ? <p className="mt-10 rounded-2xl bg-[#fffaf0] p-6">{copy.empty}</p> : catalogue.map((group) => <div key={group.familyId} className="mt-10 sm:mt-14">
            <h3 className="text-2xl font-black">{group.label}</h3>
            {group.description && <p className="mt-2 text-[#57505f]">{group.description}</p>}
            <div className={group.packs.length === 1 && group.packs[0]!.lessons === 1 ? "mt-5 grid gap-5" : group.packs.length === 1 ? "mt-5 grid max-w-lg gap-5" : "mt-5 grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-3"}>
              {group.packs.map((offer) => <PublicPlanCard key={offer.packId} offer={offer} locale={locale} primaryHref={signupHref} compact={group.packs.length === 1 && offer.lessons === 1} whatsappUrl={launchInfo?.supportWhatsappUrl} />)}
            </div>
          </div>)}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 px-4 py-16 sm:px-8 sm:py-24" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <p className={eyebrow}>{copy.faqEyebrow}</p>
          <h2 id="faq-heading" className={h2}>{copy.faqTitle}</h2>
          <div className="mt-8 space-y-3">
            {copy.faq.map(([question, answer]) => <details key={question} className="group rounded-3xl bg-white px-5 ring-2 ring-[#26143f]/6 open:ring-[#ffca00]">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold focus-visible:outline-2 focus-visible:outline-purple-600 [&::-webkit-details-marker]:hidden">{question}<ChevronDown size={22} className="shrink-0 text-[#7a3cb0] transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
              <p className="pb-5 leading-7 text-[#5d5568]">{answer}</p>
            </details>)}
          </div>
        </div>
      </section>

      {/* Final call */}
      <section className="px-4 pb-20 sm:px-8 sm:pb-28" aria-labelledby="final-heading">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#ffca00] p-8 sm:p-14">
          <div aria-hidden="true" className="absolute -end-10 -top-10 h-48 w-48 rounded-full bg-[#ffdb4d]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><h2 id="final-heading" className="max-w-2xl text-4xl font-black tracking-[-.04em] sm:text-6xl">{copy.finalTitle}</h2><p className="mt-5 max-w-xl text-lg leading-8 text-[#3d2f10]">{copy.finalText}</p></div>
            <div className="flex flex-col gap-3">
              <Link href={signupHref} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#26143f] px-8 text-center font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">{copy.start}<ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" /></Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={copy.whatsapp} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-[#26143f] px-8 text-center font-bold text-[#26143f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"><WhatsAppIcon />{copy.ctaWhatsapp}</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#26143f]/10 bg-white px-4 pb-24 pt-10 sm:px-8 sm:pb-10"><div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3 font-black"><TenantPublicLogo logoUrl={launchInfo?.logoUrl} name={name} size={34} className="rounded-lg" /></div><nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold" aria-label={copy.legal}><Link href={buildPublicHref("/privacy", locale, searchParams)} className="hover:underline">{copy.privacy}</Link><Link href={buildPublicHref("/terms", locale, searchParams)} className="hover:underline">{copy.terms}</Link>{supportEmail && <a href={`mailto:${supportEmail}`} className="break-all hover:underline">{copy.email}: {supportEmail}</a>}<a href={whatsappUrl} className="hover:underline" target="_blank" rel="noopener noreferrer">WhatsApp</a>{launchInfo?.supportTelegramUrl && <a href={launchInfo.supportTelegramUrl} className="hover:underline" target="_blank" rel="noopener noreferrer">Telegram</a>}<a href="#top" className="hover:underline">{copy.back}</a></nav></div></footer>

      {/* Floating WhatsApp: always one tap away. */}
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={copy.whatsapp} title={copy.whatsapp} className="fixed bottom-5 end-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-8px_#0a5c2d99] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-purple-600">
        <WhatsAppIcon size={28} />
      </a>
    </main>
  );
}
