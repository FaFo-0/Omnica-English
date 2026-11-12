"use client";

// One rules view for every audience: the public /policy page, the student
// and teacher portals. Numbers come from the live policy, never from copy.

import {
  AlarmClock, Ban, Bell, CalendarClock, CalendarPlus, CalendarRange, CalendarX2,
  Clock, HandHeart, Package, PauseCircle, PenLine, Repeat2, ShieldCheck,
  UserCheck, UserX, Wallet, MessageCircle,
} from "lucide-react";
import type { ComponentType } from "react";
import { InfoCard } from "./InfoCard";
import {
  POLICY_CHROME,
  studentPolicyCards,
  teacherPolicyCards,
  type PackLine,
  type PolicyCard,
  type PolicyCardIcon,
  type PolicyLocale,
  type PolicyNumbers,
} from "./policyCopy";

const ICONS: Record<PolicyCardIcon, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  lesson: Clock, pack: Package, book: CalendarPlus, cancel: CalendarX2, move: Repeat2,
  missed: UserX, teacher: UserCheck, pause: PauseCircle, bell: Bell, pay: MessageCircle,
  respect: HandHeart, horizon: CalendarRange, timeoff: CalendarClock, homework: PenLine,
  hours: AlarmClock, money: Wallet, shield: ShieldCheck, start: Ban,
};

function Card({ card }: { card: PolicyCard }) {
  return <InfoCard icon={ICONS[card.icon]} title={card.title} lines={card.lines} tone={card.tone ?? "accent"} />;
}

/** "Book ≥ N h · free ≥ M h · used < M h · start" — one glance at the clock. */
function Timeline({ locale, p }: { locale: PolicyLocale; p: PolicyNumbers }) {
  const c = POLICY_CHROME[locale];
  const unit = locale === "ru" ? "ч" : locale === "kk" ? "сағ" : locale === "ar" ? "س" : "h";
  const bookAfterCancel = p.bookingMinNoticeHours > p.studentCancelNoticeHours;
  return (
    <section className="rounded-2xl border border-[#26143f]/10 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-lg font-extrabold text-[#26143f]">{c.timeline}</h3>
      <div className="mt-4 flex h-14 overflow-hidden rounded-xl text-center text-xs font-bold leading-tight sm:text-sm">
        {bookAfterCancel && (
          <div className="flex flex-[3] flex-col items-center justify-center bg-[color-mix(in_srgb,var(--policy-accent)_14%,white)] px-1 text-[var(--policy-accent)]">
            <span>{c.timelineBook}</span>
            <span className="font-black">≥ {p.bookingMinNoticeHours} {unit}</span>
          </div>
        )}
        <div className="flex flex-[3] flex-col items-center justify-center bg-emerald-100 px-1 text-emerald-800">
          <span>{c.timelineFree}</span>
          <span className="font-black">≥ {p.studentCancelNoticeHours} {unit}</span>
        </div>
        <div className="flex flex-[2] flex-col items-center justify-center bg-amber-100 px-1 text-amber-800">
          <span>{c.timelineLate}</span>
          <span className="font-black">&lt; {p.studentCancelNoticeHours} {unit}</span>
        </div>
        <div className="flex w-14 shrink-0 items-center justify-center bg-[#26143f] px-1 text-white">
          <Clock size={18} />
        </div>
      </div>
      <p className="mt-2 text-end text-xs font-semibold text-[#645b70]">{c.timelineStart} →</p>
    </section>
  );
}

export function PolicyView({
  locale,
  policy,
  packs,
  audience,
}: {
  locale: PolicyLocale;
  policy: PolicyNumbers;
  packs: PackLine[];
  audience: "student" | "teacher" | "all";
}) {
  const c = POLICY_CHROME[locale];
  const showStudent = audience !== "teacher";
  const showTeacher = audience !== "student";
  return (
    <div className="space-y-8">
      {showStudent && (
        <section>
          {audience === "all" && <h2 className="mb-4 text-2xl font-black text-[#26143f]">{c.studentHeading}</h2>}
          <div className="mb-4"><Timeline locale={locale} p={policy} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {studentPolicyCards(locale, policy, packs).map((card) => <Card key={card.icon} card={card} />)}
          </div>
        </section>
      )}
      {showTeacher && (
        <section>
          <h2 className="mb-4 text-2xl font-black text-[#26143f]">{c.teacherHeading}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {teacherPolicyCards(locale, policy).map((card) => <Card key={card.icon} card={card} />)}
          </div>
        </section>
      )}
    </div>
  );
}

/** Unique (lessons, expiry) pairs from the public catalogue, smallest first. */
export function packLinesFrom(
  catalogue: { packs: { lessons: number; expiryDays: number }[] }[] | undefined
): PackLine[] {
  const seen = new Map<string, PackLine>();
  for (const group of catalogue ?? []) {
    for (const pk of group.packs) {
      if (pk.lessons <= 1) continue; // the trial is its own thing
      seen.set(`${pk.lessons}:${pk.expiryDays}`, { lessons: pk.lessons, expiryDays: pk.expiryDays });
    }
  }
  return [...seen.values()].sort((a, b) => a.lessons - b.lessons);
}
