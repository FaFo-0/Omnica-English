"use client";

import { useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Play, Sparkles, X } from "lucide-react";
import { api } from "@convex";
import type { Doc, Id } from "@convex/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errText } from "@/lib/convexError";

type Mistake = Doc<"lessonMistakes">;

/** The sentence with the wrong words in red. */
export function HighlightedSentence({ sentence, quote }: { sentence: string; quote: string }) {
  const at = sentence.toLowerCase().indexOf(quote.toLowerCase());
  if (at < 0) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, at)}
      <mark className="rounded bg-red-100 px-0.5 text-red-800 line-through decoration-red-400 dark:bg-red-950 dark:text-red-200">
        {sentence.slice(at, at + quote.length)}
      </mark>
      {sentence.slice(at + quote.length)}
    </>
  );
}

/** Teacher review: AI suggests, the teacher confirms, edits or dismisses. */
export function MistakesReview({ lessonId }: { lessonId: Id<"lessons"> }) {
  const mistakes = useQuery(api.lessonMistakes.listForLesson, { lessonId });
  const recording = useQuery(api.lessonAudio.getRecording, { lessonId });
  const generate = useAction(api.lessonMistakes.generate);
  const review = useMutation(api.lessonMistakes.review);
  const [busy, setBusy] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopAt = useRef<number | null>(null);

  const rows = (mistakes ?? []) as Mistake[];
  const suggested = rows.filter((m) => m.status === "suggested");
  const confirmed = rows.filter((m) => m.status === "confirmed");
  const dismissed = rows.filter((m) => m.status === "rejected");

  async function find() {
    setBusy(true);
    try {
      const result = await generate({ lessonId });
      toast.success(
        result.kept
          ? `Found ${result.kept} possible mistake${result.kept === 1 ? "" : "s"} in ${result.checkedLines} student lines`
          : `No clear mistakes in ${result.checkedLines} student lines`,
      );
      if (result.skippedParts) toast.warning(`${result.skippedParts} part${result.skippedParts === 1 ? "" : "s"} of the lesson couldn't be checked — tap Check again.`);
    } catch (error) {
      toast.error(errText(error));
    } finally {
      setBusy(false);
    }
  }

  function play(m: Mistake) {
    const audio = audioRef.current;
    if (!audio || m.startMs === undefined) return;
    audio.currentTime = Math.max(0, m.startMs / 1000 - 1.5);
    stopAt.current = (m.endMs ?? m.startMs + 4000) / 1000 + 1;
    void audio.play();
  }

  async function setStatus(m: Mistake, status: Mistake["status"]) {
    try {
      await review({ id: m._id, status });
    } catch (error) {
      toast.error(errText(error));
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4" style={{ borderColor: "var(--omnic-gray-100)" }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="me-auto">
            <h3 className="font-semibold">Speaking mistakes</h3>
            <p className="text-sm" style={{ color: "var(--omnic-gray-500)" }}>
              AI checks only the student&apos;s lines. Confirm the real mistakes — the student sees confirmed ones, in red with
              the correction and an explanation in their language, when the lesson is published.
            </p>
          </div>
          <Button onClick={() => void find()} disabled={busy} className="gap-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {rows.length ? "Check again" : "Find mistakes"}
          </Button>
        </div>
        {rows.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span>{suggested.length} to review</span>
            <span className="text-green-700 dark:text-green-300">{confirmed.length} confirmed</span>
            {dismissed.length > 0 && (
              <button type="button" className="underline" onClick={() => setShowDismissed((v) => !v)}>
                {showDismissed ? "Hide" : "Show"} {dismissed.length} dismissed
              </button>
            )}
            {suggested.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="ms-auto"
                onClick={() => void Promise.all(suggested.map((m) => review({ id: m._id, status: "confirmed" }))).catch((e) => toast.error(errText(e)))}
              >
                Confirm all {suggested.length}
              </Button>
            )}
          </div>
        )}
        {recording && (
          <audio
            ref={audioRef}
            src={recording.url}
            preload="none"
            onTimeUpdate={(e) => {
              if (stopAt.current !== null && e.currentTarget.currentTime >= stopAt.current) {
                e.currentTarget.pause();
                stopAt.current = null;
              }
            }}
          />
        )}
      </div>

      {mistakes === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mistakes checked yet. Tap Find mistakes.</p>
      ) : (
        [...suggested, ...confirmed, ...(showDismissed ? dismissed : [])].map((m) => (
          <MistakeCard key={m._id} m={m} canPlay={!!recording && m.startMs !== undefined} onPlay={() => play(m)} onStatus={(s) => void setStatus(m, s)} />
        ))
      )}
    </div>
  );
}

function MistakeCard({ m, canPlay, onPlay, onStatus }: {
  m: Mistake; canPlay: boolean; onPlay: () => void; onStatus: (status: Mistake["status"]) => void;
}) {
  const review = useMutation(api.lessonMistakes.review);
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState(m.correction);
  const [explanationEn, setExplanationEn] = useState(m.explanationEn);
  const [explanation, setExplanation] = useState(m.explanation);
  const tone = m.status === "confirmed" ? "border-green-300 dark:border-green-800" : m.status === "rejected" ? "opacity-60" : "";

  async function save() {
    try {
      await review({ id: m._id, status: "confirmed", correction, explanationEn, explanation });
      setEditing(false);
    } catch (error) {
      toast.error(errText(error));
    }
  }

  return (
    <div className={`rounded-lg border bg-card p-4 ${tone}`} style={{ borderColor: m.status === "confirmed" ? undefined : "var(--omnic-gray-100)" }}>
      <div className="flex flex-wrap items-start gap-2">
        <p className="me-auto text-base leading-relaxed" lang="en">
          <HighlightedSentence sentence={m.sentence} quote={m.quote} />
        </p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{m.category}</span>
      </div>
      {editing ? (
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1 text-sm">Correct words<Input value={correction} onChange={(e) => setCorrection(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">Why (English)<Input value={explanationEn} onChange={(e) => setExplanationEn(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">Why (student&apos;s language)<Input dir="auto" value={explanation} onChange={(e) => setExplanation(e.target.value)} /></label>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save()}>Save and confirm</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm">
            <span className="font-medium text-green-700 dark:text-green-300">→ {m.correction}</span>
            <span className="text-muted-foreground"> · {m.explanationEn}</span>
          </p>
          {m.explanation && m.explanation !== m.explanationEn && (
            <p className="mt-1 text-sm text-muted-foreground" dir="auto">{m.explanation}</p>
          )}
        </>
      )}
      {!editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {m.status !== "confirmed" && (
            <Button size="sm" className="gap-1" onClick={() => onStatus("confirmed")}><Check size={13} /> Confirm</Button>
          )}
          {m.status !== "rejected" && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => onStatus("rejected")}><X size={13} /> Not a mistake</Button>
          )}
          {m.status !== "suggested" && (
            <Button size="sm" variant="ghost" onClick={() => onStatus("suggested")}>Undo</Button>
          )}
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditing(true)}><Pencil size={13} /> Edit</Button>
          {canPlay && (
            <Button size="sm" variant="ghost" className="ms-auto gap-1" onClick={onPlay} title="Play this moment of the recording (approximate)">
              <Play size={13} /> Play
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
