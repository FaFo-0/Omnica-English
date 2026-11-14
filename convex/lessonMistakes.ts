/**
 * Speaking-mistake highlighter. The AI suggests mistakes in the student's
 * lines; the server keeps only quotes that appear verbatim in the stored
 * utterance; the teacher confirms, edits or dismisses each; the student sees
 * confirmed ones on their published lesson.
 */
import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requireTenant } from "./lib/tenant";
import { requireLessonOwnerOrAdmin } from "./lib/lessonAccess";
import { callOpenRouter } from "./lib/aiProvider";
import { utteranceContainsSurface } from "./lib/transcriptVocabularyCandidates";
import { resolveLearnerLocale } from "./users";

const LANGUAGE: Record<string, string> = { ru: "Russian", ar: "Arabic", kk: "Kazakh" };
const MAX_INPUT_CHARS = 60_000;
const CHUNK_CHARS = 4_000;

/** Lines the learner said. Without speaker labels every line goes, and the
 * teacher review step is what keeps a teacher line from being "corrected". */
function learnerLines(rows: Doc<"lessonTranscriptUtterances">[]) {
  const labelled = rows.some((r) => r.speaker);
  return rows.filter((r) => (labelled ? !!r.speaker && r.speaker !== "Teacher" : true) && /[A-Za-z]{2}/.test(r.text));
}

export const _prepare = internalQuery({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const { orgId, user } = await requireTenant(ctx);
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.organizationId !== orgId || lesson.isDeleted) throw new ConvexError("Lesson not found");
    if (user.role !== "admin" && !(user.role === "teacher" && lesson.teacherId === user.externalId))
      throw new ConvexError("Only the lesson's teacher or an admin can check mistakes");
    const rows = await ctx.db.query("lessonTranscriptUtterances").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).collect();
    rows.sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0) || a.utteranceId.localeCompare(b.utteranceId));
    const locale = (await resolveLearnerLocale(ctx, orgId, lesson.studentId)) ?? "en";
    const lines: string[] = [];
    let size = 0;
    for (const row of learnerLines(rows)) {
      const line = `[${row.utteranceId}${row.speaker ? ` · ${row.speaker}` : ""}]: ${row.text}`;
      if (size + line.length > MAX_INPUT_CHARS) break;
      lines.push(line);
      size += line.length + 2;
    }
    return { lines, locale };
  },
});

export const _save = internalMutation({
  args: {
    lessonId: v.id("lessons"),
    locale: v.string(),
    items: v.array(v.object({
      utteranceId: v.string(), quote: v.string(), correction: v.string(), category: v.string(),
      explanationEn: v.string(), explanation: v.string(),
    })),
  },
  handler: async (ctx, { lessonId, locale, items }) => {
    const { orgId, lesson } = await requireLessonOwnerOrAdmin(ctx, lessonId);
    const existing = await ctx.db.query("lessonMistakes").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).collect();
    // A new run replaces earlier suggestions; reviewed rows stay as they are.
    for (const row of existing) if (row.status === "suggested") await ctx.db.delete(row._id);
    const reviewed = new Set(existing.filter((r) => r.status !== "suggested").map((r) => `${r.utteranceId}|${r.quote.toLowerCase()}`));
    let kept = 0;
    for (const item of items) {
      const quote = item.quote.trim();
      const key = `${item.utteranceId}|${quote.toLowerCase()}`;
      if (!quote || !item.correction.trim() || reviewed.has(key)) continue;
      if (quote.toLowerCase() === item.correction.trim().toLowerCase()) continue;
      const utterance = await ctx.db.query("lessonTranscriptUtterances")
        .withIndex("by_lessonId_and_utteranceId", (q) => q.eq("lessonId", lessonId).eq("utteranceId", item.utteranceId)).unique();
      // Verified evidence only: the quote must be what was actually transcribed.
      if (!utterance || utterance.speaker === "Teacher" || !utteranceContainsSurface(utterance.text, quote)) continue;
      reviewed.add(key);
      await ctx.db.insert("lessonMistakes", {
        organizationId: orgId,
        lessonId,
        studentId: lesson.studentId,
        utteranceId: utterance.utteranceId,
        transcriptVersion: utterance.transcriptVersion,
        sentence: utterance.text,
        quote,
        correction: item.correction.trim(),
        category: item.category.trim() || "other",
        explanationEn: item.explanationEn.trim(),
        explanation: item.explanation.trim() || item.explanationEn.trim(),
        explanationLocale: locale,
        startMs: utterance.startMs,
        endMs: utterance.endMs,
        status: "suggested",
        createdAt: new Date().toISOString(),
      });
      kept += 1;
    }
    return { kept, suggested: items.length };
  },
});

/** Ask the AI for the student's mistakes in this lesson (teacher/admin). */
export const generate = action({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }): Promise<{ kept: number; suggested: number; checkedLines: number; skippedParts: number }> => {
    const prepared: { lines: string[]; locale: string } = await ctx.runQuery(internal.lessonMistakes._prepare, { lessonId });
    if (!prepared.lines.length) throw new ConvexError("No English lines from the student to check yet.");
    const config = await ctx.runQuery(internal.promptConfigs.resolveForGeneration, { taskId: "mistake_check" });
    const header = `Learner language for explanations: ${LANGUAGE[prepared.locale] ?? "English"}`;
    const text = (value: unknown) => (typeof value === "string" ? value : "");
    type Item = { utteranceId: string; quote: string; correction: string; category: string; explanationEn: string; explanation: string };
    /** One chunk of lines → items, or null when the answer was cut off / unreadable. */
    const check = async (lines: string[]): Promise<Item[] | null> => {
      try {
        const output = await callOpenRouter(config, `${header}\n\n${lines.join("\n\n")}`);
        const raw: unknown = JSON.parse(output.content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
        const list = raw !== null && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
          ? (raw as { items: unknown[] }).items
          : [];
        return list.flatMap((value) => {
          if (value === null || typeof value !== "object") return [];
          const o = value as Record<string, unknown>;
          const item = {
            utteranceId: text(o.utteranceId).trim(), quote: text(o.quote), correction: text(o.correction),
            category: text(o.category), explanationEn: text(o.explanationEn), explanation: text(o.explanation),
          };
          return item.utteranceId && item.quote ? [item] : [];
        });
      } catch {
        return null;
      }
    };
    // Long, talkative lessons produce more mistakes than one answer can hold
    // (Anna, 2026-11-14: "cut off"). Check in chunks; split a failed chunk once.
    const chunks: string[][] = [[]];
    let size = 0;
    for (const line of prepared.lines) {
      if (size + line.length > CHUNK_CHARS && chunks.at(-1)!.length) {
        chunks.push([]);
        size = 0;
      }
      chunks.at(-1)!.push(line);
      size += line.length + 2;
    }
    const items: Item[] = [];
    let failed = 0;
    for (let i = 0; i < chunks.length; i += 3) {
      const results = await Promise.all(chunks.slice(i, i + 3).map(async (chunk) => {
        const first = await check(chunk);
        if (first) return first;
        if (chunk.length < 2) return null;
        const half = Math.ceil(chunk.length / 2);
        const [a, b] = await Promise.all([check(chunk.slice(0, half)), check(chunk.slice(half))]);
        if (!a && !b) return null;
        return [...(a ?? []), ...(b ?? [])];
      }));
      for (const result of results) {
        if (result) items.push(...result);
        else failed += 1;
      }
    }
    if (failed === chunks.length) throw new ConvexError("The AI couldn't check this lesson right now — please try again.");
    const saved: { kept: number; suggested: number } = await ctx.runMutation(internal.lessonMistakes._save, {
      lessonId, locale: prepared.locale, items: items.slice(0, 300),
    });
    return { ...saved, checkedLines: prepared.lines.length, skippedParts: failed };
  },
});

/** Teacher/admin: everything; the student: confirmed mistakes on a published lesson. */
export const listForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const { orgId, user } = await requireTenant(ctx);
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.organizationId !== orgId || lesson.isDeleted) return [];
    const staff = user.role === "admin" || (user.role === "teacher" && lesson.teacherId === user.externalId);
    const student = lesson.studentId === user.externalId && lesson.status === "published";
    if (!staff && !student) return [];
    const rows = await ctx.db.query("lessonMistakes").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).collect();
    return rows
      .filter((row) => staff || row.status === "confirmed")
      .sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0));
  },
});

/** Confirm, dismiss or edit one mistake (teacher/admin). */
export const review = mutation({
  args: {
    id: v.id("lessonMistakes"),
    status: v.union(v.literal("suggested"), v.literal("confirmed"), v.literal("rejected")),
    correction: v.optional(v.string()),
    explanation: v.optional(v.string()),
    explanationEn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("Mistake not found");
    const { user } = await requireLessonOwnerOrAdmin(ctx, row.lessonId as Id<"lessons">);
    const patch: Partial<Doc<"lessonMistakes">> = { status: args.status, reviewedBy: user.externalId };
    if (args.correction !== undefined) {
      if (!args.correction.trim()) throw new ConvexError("Write the corrected words");
      patch.correction = args.correction.trim();
    }
    if (args.explanation !== undefined) patch.explanation = args.explanation.trim();
    if (args.explanationEn !== undefined) patch.explanationEn = args.explanationEn.trim();
    await ctx.db.patch(args.id, patch);
    return null;
  },
});
