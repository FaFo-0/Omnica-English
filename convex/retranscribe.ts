/**
 * Operator-only: transcribe a lesson again from its saved recording and
 * replace the transcript + utterances. For lessons recorded with wrong
 * language hints (before 2026-11-09 hints had no English). Not a UI feature.
 *
 *   npx convex run --prod retranscribe:retranscribeLesson '{"lessonId":"..."}'
 *
 * Refuses when the lesson already has vocabulary rows, since they are
 * anchored to the old utterances.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { resolveLearnerLocale } from "./users";
import { transcribeStoredAudio } from "./soniox";
import { transcriptionLanguageHints } from "./lib/transcriptionLanguages";

type Token = { text: string; startMs: number; endMs: number; speaker?: string };

/** Same shape as the live pipeline: first speaker is the teacher. */
function groupBySpeaker(tokens: Token[]) {
  const labels = new Map<string, string>();
  const label = (raw: string) => {
    if (!labels.has(raw)) labels.set(raw, labels.size === 0 ? "Teacher" : labels.size === 1 ? "Student" : `Student ${labels.size}`);
    return labels.get(raw)!;
  };
  const segments: { speaker?: string; text: string; startMs: number; endMs: number }[] = [];
  for (const t of tokens) {
    const speaker = t.speaker ? label(t.speaker) : undefined;
    const last = segments[segments.length - 1];
    if (last && last.speaker === speaker) {
      last.text += t.text;
      last.endMs = t.endMs;
    } else segments.push({ speaker, text: t.text, startMs: t.startMs, endMs: t.endMs });
  }
  return segments
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text.length > 0)
    .map((s, i) => ({ ...s, utteranceId: `rt${String(i + 1).padStart(4, "0")}` }));
}

export const _target = internalQuery({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson) throw new Error("Lesson not found");
    if (!lesson.audioFileId) throw new Error("Lesson has no saved recording");
    const vocab = await ctx.db.query("lessonVocabulary").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).take(1);
    if (vocab.length > 0) throw new Error("Lesson already has vocabulary anchored to the old transcript");
    const locale = await resolveLearnerLocale(ctx, lesson.organizationId, lesson.studentId);
    return { audioFileId: lesson.audioFileId, locale };
  },
});

export const _replace = internalMutation({
  args: {
    lessonId: v.id("lessons"),
    transcript: v.string(),
    utterances: v.array(v.object({
      utteranceId: v.string(), text: v.string(), speaker: v.optional(v.string()), startMs: v.number(), endMs: v.number(),
    })),
  },
  handler: async (ctx, { lessonId, transcript, utterances }) => {
    const lesson = await ctx.db.get(lessonId);
    if (!lesson) throw new Error("Lesson not found");
    const old = await ctx.db.query("lessonTranscriptUtterances").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).collect();
    for (const row of old) await ctx.db.delete(row._id);
    const transcriptVersion = (lesson.transcriptVersion ?? 0) + 1;
    const createdAt = new Date().toISOString();
    for (const u of utterances) {
      await ctx.db.insert("lessonTranscriptUtterances", { organizationId: lesson.organizationId, lessonId, transcriptVersion, createdAt, ...u });
    }
    await ctx.db.patch(lessonId, {
      transcript,
      transcriptVersion,
      contentStatus: { ...lesson.contentStatus, vocabulary: "pending" },
    });
    return { removed: old.length, inserted: utterances.length, transcriptVersion };
  },
});

export const retranscribeLesson = internalAction({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }): Promise<{ hints: string[]; removed: number; inserted: number; transcriptVersion: number; preview: string }> => {
    const target = await ctx.runQuery(internal.retranscribe._target, { lessonId });
    const hints = transcriptionLanguageHints(target.locale);
    const { tokens } = await transcribeStoredAudio(ctx, target.audioFileId, hints, 9 * 60_000);
    const utterances = groupBySpeaker(tokens as Token[]);
    if (utterances.length === 0) throw new Error("Transcription came back empty; nothing changed");
    const transcript = utterances.map((u) => `${u.speaker ? `[${u.speaker}]: ` : ""}${u.text}`).join("\n\n");
    const result: { removed: number; inserted: number; transcriptVersion: number } = await ctx.runMutation(internal.retranscribe._replace, { lessonId, transcript, utterances });
    return { hints, ...result, preview: transcript.slice(0, 1200) };
  },
});
