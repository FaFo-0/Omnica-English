"use client";

import { Fragment, useState } from "react";
import { BookOpen, Check, ClipboardCheck, FileText, Layers, RotateCcw, X } from "lucide-react";
import type { DemoWord, LandingCopy } from "@/lib/publicLandingCopy";

/** English sample text; bracketed words are tappable and must be DemoWord keys. */
const DEMO_SENTENCE = "Last [summer] I [decided] to [change] my [job] and [move] to a new [city].";
const QUIZ = { before: "I", after: "here since 2020.", options: ["live", "have lived", "am living"], correct: "have lived" } as const;
const NOTES_VOCAB = ["to settle in", "commute", "How long have you…?"];

function DemoShell({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return <article className="flex min-w-0 flex-col rounded-[2rem] border-2 border-[#26143f]/8 bg-white p-5 shadow-[0_18px_40px_-30px_#26143f80] sm:p-7">
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#ffca00] text-[#26143f]">{icon}</span>
      <div><h3 className="text-xl font-black tracking-tight">{title}</h3><p className="mt-1 leading-6 text-[#5d5568]">{text}</p></div>
    </div>
    <div className="mt-6 flex flex-1 flex-col">{children}</div>
  </article>;
}

export function ReadingDemo({ copy }: { copy: LandingCopy }) {
  const [active, setActive] = useState<DemoWord | null>("decided");
  const [saved, setSaved] = useState<DemoWord[]>([]);
  const parts = DEMO_SENTENCE.split(/(\[[a-z]+\])/);
  return <DemoShell icon={<BookOpen size={22} />} title={copy.readingTitle} text={copy.readingText}>
    <div className="rounded-3xl bg-[#faf6ec] p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8a7f94]">{copy.readingHint}</p>
      <p lang="en" dir="ltr" className="font-serif text-2xl leading-[1.7] text-[#26143f] sm:text-[1.7rem]">
        {parts.map((part, i) => {
          const match = part.match(/^\[([a-z]+)\]$/);
          if (!match) return <Fragment key={i}>{part}</Fragment>;
          const word = match[1] as DemoWord;
          const isSaved = saved.includes(word);
          return <button key={i} type="button" onClick={() => setActive(word)} aria-pressed={active === word} className={`rounded-md px-0.5 underline decoration-dotted decoration-2 underline-offset-[6px] transition-colors focus-visible:outline-2 focus-visible:outline-purple-600 ${isSaved ? "bg-[#c9f2d6] decoration-transparent" : active === word ? "bg-[#ffdf70] decoration-[#26143f]" : "decoration-[#b9a8cc] hover:bg-[#ffefb0]"}`}>{word}</button>;
        })}
      </p>
    </div>
    <div aria-live="polite" className="mt-4 min-h-[5.5rem] rounded-3xl border-2 border-dashed border-[#26143f]/12 p-4">
      {active && <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p lang="en" dir="ltr" className="text-lg font-black">{active}</p><p className="text-[#5d5568]">{copy.words[active]}</p></div>
        {saved.includes(active)
          ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f7ea] px-3 py-2 text-sm font-bold text-[#17703d]"><Check size={16} />{copy.readingSaved}</span>
          : <button type="button" onClick={() => setSaved((list) => [...list, active])} className="rounded-full bg-[#26143f] px-4 py-2 text-sm font-bold text-white hover:bg-[#4b2774] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">+ {copy.readingSave}</button>}
      </div>}
    </div>
    <p className="mt-3 text-sm font-semibold text-[#17703d]">{copy.readingCount(saved.length)}</p>
  </DemoShell>;
}

export function FlashcardDemo({ copy }: { copy: LandingCopy }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const done = index >= copy.cards.length;
  const card = copy.cards[Math.min(index, copy.cards.length - 1)]!;
  const rate = () => { setFlipped(false); setIndex((i) => i + 1); };
  return <DemoShell icon={<Layers size={22} />} title={copy.cardsTitle} text={copy.cardsText}>
    <div className="flex items-center justify-between text-xs font-bold text-[#8a7f94]" dir="ltr"><span>{Math.min(index + 1, copy.cards.length)} / {copy.cards.length}</span><span className="flex gap-1">{copy.cards.map((_, i) => <span key={i} className={`h-1.5 w-6 rounded-full ${i < index ? "bg-[#1f9d55]" : i === index ? "bg-[#26143f]" : "bg-[#e6e0ec]"}`} />)}</span></div>
    {done ? <div className="mt-3 grid min-h-48 flex-1 place-items-center rounded-3xl bg-[#e3f7ea] p-6 text-center">
      <div><Check className="mx-auto text-[#17703d]" size={34} /><p className="mt-3 font-bold text-[#17703d]">{copy.cardsDone}</p><button type="button" onClick={() => setIndex(0)} className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[#17703d] px-4 py-2 text-sm font-bold text-[#17703d]"><RotateCcw size={15} />{copy.cardsAgain}</button></div>
    </div> : <>
      <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={copy.cardsFlip} className={`mt-3 grid min-h-48 flex-1 place-items-center rounded-3xl p-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 ${flipped ? "bg-[#26143f] text-white" : "bg-[#ffca00] text-[#26143f]"}`}>
        <span>
          <span lang="en" dir="ltr" className="block text-2xl font-black sm:text-3xl">{card[0]}</span>
          {flipped ? <span className="mt-3 block text-lg text-[#ffdb6c]">{card[1]}</span> : <span className="mt-3 block text-sm font-semibold opacity-70">{copy.cardsFlip}</span>}
        </span>
      </button>
      <div className={`mt-3 grid grid-cols-4 gap-2 transition-opacity ${flipped ? "opacity-100" : "pointer-events-none opacity-30"}`} aria-hidden={!flipped}>
        {copy.cardsRatings.map((label, i) => <button key={label} type="button" tabIndex={flipped ? 0 : -1} onClick={rate} className={`min-h-11 rounded-2xl px-1 text-xs font-bold sm:text-sm ${["bg-[#fde2e2] text-[#a3261f]", "bg-[#fff0c7] text-[#8a5a00]", "bg-[#e3f7ea] text-[#17703d]", "bg-[#e6ecff] text-[#2747a8]"][i]}`}>{label}</button>)}
      </div>
    </>}
  </DemoShell>;
}

export function QuizDemo({ copy }: { copy: LandingCopy }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const right = answer === QUIZ.correct;
  return <DemoShell icon={<ClipboardCheck size={22} />} title={copy.quizTitle} text={copy.quizText}>
    <div className="rounded-3xl bg-[#faf6ec] p-5">
      <p lang="en" dir="ltr" className="text-xl font-semibold leading-relaxed sm:text-2xl">{QUIZ.before} <span className={`inline-block min-w-24 border-b-2 px-1 text-center font-black ${answer ? (right ? "border-[#1f9d55] text-[#17703d]" : "border-[#d33] text-[#a3261f]") : "border-[#26143f]/40 text-transparent"}`}>{answer ?? "___"}</span> {QUIZ.after}</p>
      <div dir="ltr" className="mt-5 flex flex-wrap gap-2">
        {QUIZ.options.map((option) => <button key={option} type="button" disabled={right} onClick={() => setAnswer(option)} className={`min-h-11 rounded-full border-2 px-4 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 ${answer === option ? (right ? "border-[#1f9d55] bg-[#e3f7ea] text-[#17703d]" : "border-[#d33] bg-[#fde2e2] text-[#a3261f]") : "border-[#26143f]/15 bg-white hover:border-[#26143f]/40"}`}>{option}</button>)}
      </div>
    </div>
    <div aria-live="polite" className="mt-4 flex-1">
      {answer && <div className={`rounded-3xl p-4 ${right ? "bg-[#e3f7ea]" : "bg-[#fde2e2]"}`}>
        <p className={`flex items-center gap-2 font-black ${right ? "text-[#17703d]" : "text-[#a3261f]"}`}>{right ? <Check size={18} /> : <X size={18} />}{right ? copy.quizRight : copy.quizWrong}</p>
        <p className="mt-1 text-sm leading-6 text-[#3d3449]">{copy.quizExplain}</p>
        {right && <button type="button" onClick={() => setAnswer(null)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#17703d] hover:underline"><RotateCcw size={14} />{copy.quizRetry}</button>}
      </div>}
    </div>
  </DemoShell>;
}

export function NotesDemo({ copy }: { copy: LandingCopy }) {
  return <DemoShell icon={<FileText size={22} />} title={copy.notesTitle} text={copy.notesText}>
    <div className="flex-1 rounded-3xl bg-[#26143f] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{copy.notesLesson}</p><span className="inline-flex items-center gap-1 rounded-full bg-[#1f9d55] px-2.5 py-1 text-xs font-bold"><Check size={13} />{copy.notesChecked}</span></div>
      <p className="mt-3 text-sm leading-6 text-[#e2d9e9]">{copy.notesSummary}</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#ffdb6c]">{copy.notesVocab}</p>
      <div dir="ltr" className="mt-2 flex flex-wrap gap-2">{NOTES_VOCAB.map((word) => <span key={word} lang="en" className="rounded-full bg-white/12 px-3 py-1 text-sm font-semibold">{word}</span>)}</div>
      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-[#ffca00] px-4 py-3 text-sm font-bold text-[#26143f]"><ClipboardCheck size={17} />{copy.notesHomework}</p>
    </div>
  </DemoShell>;
}
