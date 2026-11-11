"use client";

// Teacher guide + academy rules in one place, in the same card style as the
// public /policy page. How we teach, how to run the live room, what happens
// after the lesson, and the rules.
//
// Keep it to what a teacher must do or will otherwise get wrong. Button and
// field names must match the screens exactly. Never hardcode a policy number:
// read it from api.policyConstants.get (Settings → Policy owns them).

import Link from "next/link";
import { useLocale } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex";
import {
  BookOpen, BookOpenCheck, CalendarClock, CalendarRange, CheckCircle2, ClipboardCheck,
  Coffee, FileText, GraduationCap, Headphones, HelpCircle, Languages, Library,
  ListChecks, Mic, MessagesSquare, MonitorUp, PenLine, Play, Send, Sparkles,
  SpellCheck, StickyNote, Timer, UserX, Users, Video, Wallet, WandSparkles, Scale,
} from "lucide-react";
import { InfoCard } from "@/components/policy/InfoCard";
import { PolicyView, packLinesFrom } from "@/components/policy/PolicyView";
import type { PolicyLocale } from "@/components/policy/policyCopy";

const SECTIONS = [
  { id: "approach", label: "How we teach" },
  { id: "setup", label: "Setup" },
  { id: "live", label: "Live lesson" },
  { id: "after", label: "After the lesson" },
  { id: "homework", label: "Homework" },
  { id: "reading", label: "Reading & words" },
  { id: "students", label: "Students & pay" },
  { id: "rules", label: "Rules" },
];

function Go({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="font-semibold text-[var(--policy-accent)] underline underline-offset-2">{children}</Link>;
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mt-10" style={{ scrollMarginTop: 90 }}>
      <h2 className="text-2xl font-black text-[#26143f]">{title}</h2>
      {intro && <p className="mt-1 mb-4 max-w-2xl text-[15px] leading-relaxed text-[#63566e]">{intro}</p>}
      <div className={intro ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

type Stage = { from: number; to: number; icon: typeof Coffee; title: string; what: string; tool: string; color: string };

/** A course-book lesson (e.g. English File) — the book lives in the Library / Google Drive. */
const BOOK_ARC: Stage[] = [
  { from: 0, to: 5, icon: Coffee, title: "Warm up", what: "A few minutes of chat, then into the book.", tool: "—", color: "#f4b400" },
  { from: 5, to: 10, icon: ListChecks, title: "Check homework", what: "Go over last time's mistakes before new material.", tool: "Lesson → Homework", color: "#10b981" },
  { from: 10, to: 40, icon: BookOpen, title: "Work through the unit", what: "Open the book page from the Library (Google Drive) and share it in Meet. Do the grammar, vocabulary and listening exercises together.", tool: "Library → book", color: "#7c3aed" },
  { from: 40, to: 50, icon: MessagesSquare, title: "Speak on the unit topic", what: "Use the unit's speaking task, or generate questions from what was said.", tool: "Questions tab", color: "#0ea5e9" },
  { from: 50, to: 55, icon: Send, title: "Wrap up", what: "Name the page you reached and one thing to practise. Homework = the matching workbook exercise (see Homework below).", tool: "Notes tab", color: "#f43f5e" },
];

/** A speaking lesson: less structure, more talk. */
const ARC: { from: number; to: number; icon: typeof Coffee; title: string; what: string; tool: string; color: string }[] = [
  { from: 0, to: 5, icon: Coffee, title: "Warm up", what: "Chat about their week. Bring back two or three words from last time and get them to use them.", tool: "Students → their words", color: "#f4b400" },
  { from: 5, to: 20, icon: BookOpen, title: "Read together", what: "Present a short text. They read aloud; you stop on words they don't know and add them to their list.", tool: "Present → Reading", color: "#7c3aed" },
  { from: 20, to: 40, icon: MessagesSquare, title: "Talk", what: "The longest part. They speak, you steer — about the text, their life, their goal.", tool: "Questions tab", color: "#0ea5e9" },
  { from: 40, to: 50, icon: ListChecks, title: "Check", what: "A few quick questions on today's lesson. Reveal each answer together and let them explain.", tool: "Present → Quiz", color: "#10b981" },
  { from: 50, to: 55, icon: Send, title: "Wrap up", what: "Repeat today's key words, name one thing to work on, tell them the notes and homework arrive after you publish.", tool: "Notes tab", color: "#f43f5e" },
];

function LessonArc({ title, stages }: { title: string; stages: Stage[] }) {
  const ARC = stages;
  return (
    <div className="rounded-2xl border border-[#26143f]/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-extrabold text-[#26143f]">{title}</h3>
        <span className="text-xs font-bold text-[#645b70]">55 min teaching</span>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full" aria-hidden>
        {ARC.map((s) => <div key={s.title} style={{ flex: s.to - s.from, background: s.color }} />)}
      </div>
      <ol className="mt-4 space-y-3">
        {ARC.map((s) => (
          <li key={s.title} className="flex gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: s.color }}>
              <s.icon size={19} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-extrabold text-[#26143f]">{s.title}</span>
                <span className="text-xs font-bold text-[#645b70]">{s.from}–{s.to} min</span>
                <span className="rounded-full bg-[#26143f]/5 px-2 py-0.5 text-[11px] font-bold text-[#4a4155]">{s.tool}</span>
              </div>
              <p className="text-[15px] leading-relaxed text-[#4a4155]">{s.what}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A small map of the live room so the tool names below have a place. */
function LiveRoomMap() {
  const chip = "rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-bold text-[#26143f]";
  return (
    <div className="rounded-2xl border border-[#26143f]/10 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-lg font-extrabold text-[#26143f]">The live room at a glance</h3>
      <div className="mt-3 overflow-hidden rounded-xl border border-[#26143f]/15 text-[12px]">
        <div className="flex flex-wrap items-center gap-1.5 bg-[#26143f] px-2 py-2 text-white">
          <span className={chip}>⏱ timer · 55 min</span>
          <span className="ms-auto text-[11px] opacity-70">Present</span>
          <span className={chip}>Reading</span>
          <span className={chip}>Quiz</span>
          <span className={chip}>Go to Google Meet</span>
          <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold">End Session</span>
          <span className="rounded-md border border-rose-300 px-1.5 py-0.5 text-[11px] font-bold text-rose-200">No-show</span>
        </div>
        <div className="grid grid-cols-[1.4fr_1fr]">
          <div className="space-y-1.5 border-e border-[#26143f]/10 bg-[#faf7ef] p-2">
            <div className="font-bold text-[#26143f]">Audio source · Mic check</div>
            <div className="rounded bg-white p-1.5 text-[#4a4155]"><b>Teacher:</b> What did you do at the weekend?</div>
            <div className="rounded bg-white p-1.5 text-[#4a4155]"><b>Student:</b> I went to the mountains…</div>
            <div className="text-[11px] text-[#645b70]">Live transcript · saved every 20 s</div>
          </div>
          <div className="space-y-1.5 p-2">
            <div className="flex flex-wrap gap-1">
              {["Reading", "Quiz", "Questions", "Notes"].map((t) => (
                <span key={t} className="rounded bg-[color-mix(in_srgb,var(--policy-accent)_14%,white)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--policy-accent)]">{t}</span>
              ))}
            </div>
            <div className="text-[#4a4155]">Pick a text, generate a quiz or questions from what was said, write notes for the AI.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherGuidePage() {
  const raw = useLocale();
  const locale: PolicyLocale = raw === "ru" || raw === "kk" || raw === "ar" ? raw : "en";
  const policy = useQuery(api.policyConstants.get, {});
  const catalogue = useQuery(api.pricing.getPublicCatalogue, { locale });
  const n = (value: number | undefined, unit: string) => (value === undefined ? "…" : `${value} ${unit}`);

  return (
    <div style={{ maxWidth: 900, "--policy-accent": "var(--omnic-tenant-primary)" } as CSSProperties}>
      <h1 className="h1" style={{ margin: 0 }}>Teacher guide</h1>
      <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[#63566e]">
        How we teach at the academy, how to use the live room, what to do after the lesson — and the rules, in one place.
      </p>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Guide sections">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-[#26143f]/15 bg-white px-3 py-1.5 text-sm font-bold text-[#26143f] hover:border-[var(--policy-accent)]">
            {s.label}
          </a>
        ))}
      </nav>

      <Section
        id="approach"
        title="How we teach"
        intro="There are two kinds of lesson. Book lessons follow the course book (e.g. English File) — it's in the Library, stored in Google Drive. Speaking lessons have less book and more conversation. Either way, every minute should be the student's."
      >
        <Grid>
          <LessonArc title="Book lesson (English File)" stages={BOOK_ARC} />
          <LessonArc title="Speaking lesson" stages={ARC} />
        </Grid>
        <p className="mt-3 text-sm text-[#645b70]">A shape, not a script — follow the student and their goal.</p>
        <div className="mt-4"><Grid>
          <InfoCard icon={MessagesSquare} title="The student talks most" lines={[
            "Aim for them speaking more than you. Ask open questions — “why?”, “tell me about…”.",
            "Wait. Silence is thinking time; don't fill it for them.",
          ]} />
          <InfoCard icon={SpellCheck} title="Correct without stopping them" lines={[
            "Let them finish the thought, then say the sentence back correctly.",
            <>Note repeated mistakes in <b>Notes</b> — the AI turns them into the summary and the homework.</>,
          ]} />
          <InfoCard icon={Mic} title="Say new words clearly" lines={[
            "The transcript is what the AI reads. Say a new word, then use it in a sentence.",
            "Words said clearly land in the vocabulary draft — and become the student's flashcards.",
          ]} />
          <InfoCard icon={Languages} title="English first" lines={[
            "Use the student's language (Russian, Arabic, Kazakh) only to unblock, and briefly.",
            "Their flashcards already translate into their language — you don't need to.",
          ]} />
          <InfoCard icon={Video} tone="plain" title="Look and sound professional" lines={[
            "Camera on, quiet room, headset. Use the academy's Meet room — the recording protects you too.",
            <>Be there before the start: the <b>Ready</b> badge appears {n(policy?.lessonStartEarlyMinutes, "minutes")} early.</>,
          ]} />
          <InfoCard icon={GraduationCap} tone="good" title="Every lesson leaves something behind" lines={[
            <>Publish the lesson within {n(policy?.lessonPublishHours, "hours")}: summary, words, flashcards and homework reach the student together.</>,
            "Check their homework before your next lesson with them, and start from it.",
          ]} />
        </Grid></div>
      </Section>

      <Section id="setup" title="Before your first lesson">
        <Grid>
          <InfoCard icon={Video} title="Add your meeting room" lines={[
            <>Avatar menu (top right) → <Go href="/teacher/profile">Profile</Go> → <b>Your meeting room</b>. Create a reusable Google Meet room and paste the link.</>,
            "It's attached to every upcoming and live lesson; saving updates lessons already booked.",
            <>Meet says <em>Ask to join</em>? You&apos;re signed into a different Google account than the one that made the room.</>,
          ]} />
          <InfoCard icon={CalendarRange} title="Open your availability" lines={[
            <>On <Go href="/teacher/calendar">Calendar</Go>, click or drag the half-hour cells you can teach. Green cells are bookable.</>,
            <>Standing schedule: <b>More</b> → <b>Use this week as weekly hours</b>. It copies the whole displayed week — check the start date.</>,
            <>Students book at least {n(policy?.bookingMinNoticeHours, "hours")} ahead, so a slot opened for today isn&apos;t bookable — use <b>Add lesson</b>.</>,
            <>Keep at least {n(policy?.teacherMinWeeklyHours, "hours")} open in your usual week.</>,
          ]} />
          <InfoCard icon={CalendarClock} title="Block time off" lines={[
            <><b>More</b> → <b>Time off</b>. Lessons booked in those dates are listed and cancelled as yours in the same step — each student gets the lesson back and one message.</>,
            "Lessons outside your cancel window show in red: move them first or ask the academy.",
            <>Longer than {n(policy?.timeOffApprovalDays, "days")} applies at once but needs the academy&apos;s sign-off.</>,
          ]} />
        </Grid>
      </Section>

      <Section
        id="live"
        title="The live lesson"
        intro="One page runs the whole lesson: it records both sides of the call, writes the transcript as you speak, and gives you material to put on screen."
      >
        <LiveRoomMap />
        <div className="mt-4"><Grid>
          <InfoCard icon={Play} title="1 · Start" lines={[
            <><Go href="/teacher/sessions">Sessions</Go> shows a green <b>Ready</b> badge from {n(policy?.lessonStartEarlyMinutes, "minutes")} before the start. Press <b>Start</b>.</>,
            <>No booking? <b>Start session</b> → pick the student. It books a real lesson now, so the hour is counted.</>,
            "You can start up to 30 minutes after the lesson should have ended; after that, record what happened instead.",
          ]} />
          <InfoCard icon={Headphones} title="2 · Choose the audio" lines={[
            <>Pick <b>Mic + Google Meet</b> — both sides of the call. Share your Meet tab and keep <em>Share tab audio</em> ticked.</>,
            <>Use <b>Mic check</b> before the student joins.</>,
            <>If the Meet tab closes, you&apos;ll see <b>Audio incomplete — reconnect</b>: the student&apos;s voice isn&apos;t recorded until you do.</>,
            <>Recorded elsewhere? <b>Upload</b> a file instead.</>,
          ]} />
          <InfoCard icon={FileText} title="3 · Watch the transcript" lines={[
            "Each line is labelled Teacher or Student as you speak.",
            "It's saved every 20 seconds — a reload or a crash doesn't lose it, and leaving the page keeps it.",
          ]} />
          <InfoCard icon={MonitorUp} title="4 · Present a reading" lines={[
            <><b>Reading</b> tab → pick a text → <b>Open reading in window</b>. Share that window in Meet.</>,
            <>Tap a word they don&apos;t know → it goes onto <b>their</b> list (green) and into their flashcards.</>,
            <><b>Present → Reading</b> in the top bar reopens it where you stopped.</>,
          ]} />
          <InfoCard icon={Sparkles} title="5 · Quick quiz" lines={[
            <><b>Quiz</b> tab → <b>Generate Quiz</b> builds questions from what has been said so far.</>,
            <><b>Present → Quiz</b> opens one big question at a time to share. <b>←</b> / <b>→</b> move, <b>Space</b> reveals the answer.</>,
            "Use it near the end — it checks today, not a textbook.",
          ]} />
          <InfoCard icon={HelpCircle} title="6 · Questions when talk runs dry" lines={[
            <><b>Questions</b> tab → <b>Generate conversation questions</b> gives prompts built from the conversation so far.</>,
            "Pick one that pushes them a little past what they said.",
          ]} />
          <InfoCard icon={StickyNote} title="7 · Notes for the AI" lines={[
            "Your private scratchpad — and the AI reads it after the lesson.",
            "Write what you want remembered: repeated mistakes, words to review, what to do next time.",
          ]} />
          <InfoCard icon={Timer} tone="warn" title="8 · Finish" lines={[
            "The timer shows the 55-minute target; finish when you're ready after it.",
            <><b>Stop Recording</b> pauses and keeps you on the page. <b>End Session</b> finishes and opens the review page.</>,
            <>Opened it by mistake? <b>Discard</b> throws the recording away.</>,
          ]} />
          <InfoCard icon={UserX} tone="warn" title="Student didn't come?" lines={[
            <>Wait. <b>No-show</b> works from 10 minutes after the start and applies the academy&apos;s rule — the student&apos;s lesson is used and you&apos;re paid.</>,
            "Don't log a lesson that didn't happen.",
          ]} />
        </Grid></div>
      </Section>

      <Section
        id="after"
        title="After the lesson: review and publish"
        intro={<>The platform drafts the material from the transcript and your notes. Your job is judgement — fix what the AI got wrong, cut what isn&apos;t useful, publish within {n(policy?.lessonPublishHours, "hours")}.</>}
      >
        <Grid>
          <InfoCard icon={ClipboardCheck} title="Open the review page" lines={[
            <><Go href="/teacher/sessions">Sessions</Go> → the lesson. Tabs: <b>Transcript &amp; Audio</b>, <b>Summary</b>, <b>Vocabulary</b>, <b>Homework</b>.</>,
            "Each tab shows whether its content is drafted and approved.",
          ]} />
          <InfoCard icon={WandSparkles} title="Fix and approve" lines={[
            <><b>Regenerate</b> for an AI draft, edit in place, then <b>Approve</b>.</>,
            <><b>Publish</b> stays disabled until Summary and Vocabulary are approved.</>,
          ]} />
          <InfoCard icon={BookOpenCheck} title="Vocabulary becomes flashcards" lines={[
            "Whatever stays in the table goes out: word, translation, short English meaning, part of speech.",
            "Words already in their deck keep their review progress.",
          ]} />
          <InfoCard icon={CheckCircle2} tone="good" title="Publish" lines={[
            "The student gets summary, vocabulary, flashcards and homework, and is notified.",
            <><b>Reopen</b> pulls it back if you need to change something.</>,
          ]} />
        </Grid>
      </Section>

      <Section id="homework" title="Homework">
        <Grid>
          <InfoCard icon={PenLine} title="Build a worksheet" lines={[
            <>Choose an exercise type and <b>Write myself</b>: gaps, choices, matching, word order, rewrites, corrections, dialogues, reading, short answers or guided writing.</>,
            "Select text in a gap sentence to turn it into a blank. Paste many questions with the bulk tool.",
          ]} />
          <InfoCard icon={ClipboardCheck} tone="good" title="Paste a workbook exercise" lines={[
            <>Lesson → <b>Homework</b> → <b>Convert workbook text</b>.</>,
            "Open the workbook page in the Library (Google Drive), copy the instructions, passage and questions — and the answer key if you have it — and paste them (up to 12,000 characters).",
            "PDF pages, pictures and audio aren't imported: copy the text. Missing pictures or audio show up as source notes in the preview.",
            <><b>Convert this exercise</b> keeps it as written; <b>Create similar practice</b> makes new questions on the same point. Press <b>Generate preview</b>, fix anything, insert it.</>,
          ]} />
          <InfoCard icon={ListChecks} title="Paste several questions at once" lines={[
            <>In a section, open <b>Paste several questions</b>.</>,
            <>One line per question: <code>question | correct answer | other choice | other choice</code>.</>,
            "For word-order exercises, paste one complete sentence per line. Open questions can have no answer.",
          ]} />
          <InfoCard icon={Sparkles} title="Use AI when it helps" lines={[
            <><b>Generate with AI</b> makes one exercise type; <b>Generate a worksheet</b> mixes types. Set level, objective, count and optional words.</>,
            <><b>Convert workbook text</b> keeps an original exercise; <b>Create similar practice</b> makes new questions.</>,
            <>Check <b>Preview as student</b> before approving; wait for <b>Saved</b>.</>,
          ]} />
          <InfoCard icon={Send} title="Approve — it ships with Publish" lines={[
            "No due date? It lands on their next lesson with you — when you'll check it anyway.",
            "Nothing reaches the student before the lesson is published, and answer keys are stripped.",
          ]} />
          <InfoCard icon={ListChecks} tone="good" title="Review the submission" lines={[
            <>You&apos;re notified; <Go href="/teacher/students">Students</Go> shows what&apos;s waiting.</>,
            <>Lesson → <b>Homework</b> → <b>Finish review</b>: mark answers, override automatic marks, add a comment.</>,
            "Do it before your next lesson with that student.",
          ]} />
        </Grid>
      </Section>

      <Section id="reading" title="Reading & words">
        <Grid>
          <InfoCard icon={Library} title="Read with a student" lines={[
            <>Open a text in <Go href="/teacher/library">Library</Go> and pick the student at the top — their saved words appear under the catalogue.</>,
            <>Sort by <b>Recommended</b> for the best topic match, or <b>Shortest first</b> for a quick piece.</>,
          ]} />
          <InfoCard icon={BookOpen} title="Collect words for them" lines={[
            <>Tap a word → <b>Add to their words</b>. It goes into their flashcards, translated into their language, on a spaced schedule.</>,
            "Unknown to the dictionary? It's translated instead — nothing dead-ends.",
          ]} />
        </Grid>
      </Section>

      <Section id="students" title="Your students and your pay">
        <Grid>
          <InfoCard icon={Users} title="Know where they stand" lines={[
            <><Go href="/teacher/students">Students</Go>: level, lessons left, next lesson, last seen, homework waiting.</>,
            "Zero lessons left stops bookings — say something before the pack runs out.",
          ]} />
          <InfoCard icon={Wallet} title="Your payout" lines={[
            <>Avatar menu → <Go href="/teacher/profile">Profile</Go> shows what&apos;s owed, unpaid lessons this month and your last payment.</>,
            "Paid monthly; payments arrive as a notification.",
          ]} />
        </Grid>
      </Section>

      <Section
        id="rules"
        title="Academy rules"
        intro="What students agreed to when they signed up, and the rules for teachers. The numbers are always current."
      >
        <div className="mb-4 flex items-center gap-2 text-sm text-[#63566e]">
          <Scale size={16} /> Students read the same rules at <Go href={`/policy?lang=${locale}`}>/policy</Go>.
        </div>
        {policy === undefined ? (
          <div className="body">Loading the rules…</div>
        ) : (
          <PolicyView locale={locale} policy={policy} packs={packLinesFrom(catalogue)} audience="all" />
        )}
      </Section>
    </div>
  );
}
