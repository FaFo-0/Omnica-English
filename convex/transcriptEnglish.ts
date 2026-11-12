/**
 * Lesson page → Transcript → "Fix English" / "Undo".
 *
 * Soniox writes English said inside Arabic (or Russian) speech in those
 * letters, whatever language hints it gets (tested on a real lesson,
 * 2026-11-12). An AI rewrites only those parts, line by line; each changed
 * line keeps its original text so Undo restores the transcript exactly.
 */
import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireTenant } from "./lib/tenant";
import { requireLessonOwnerOrAdmin } from "./lib/lessonAccess";
import { callOpenRouter } from "./lib/aiProvider";
import { acceptableRewrite, applyLineFixes, needsEnglishFix } from "./lib/englishFix";

const BATCH_CHARS = 6000;

export const _lines = internalQuery({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const { orgId, user } = await requireTenant(ctx);
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.organizationId !== orgId || lesson.isDeleted) throw new ConvexError("Lesson not found");
    if (user.role !== "admin" && !(user.role === "teacher" && lesson.teacherId === user.externalId))
      throw new ConvexError("Only the lesson's teacher or an admin can change the transcript");
    const rows = await ctx.db.query("lessonTranscriptUtterances").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).collect();
    return rows
      .filter((row) => needsEnglishFix(row.text))
      .map((row) => ({ id: row.utteranceId, text: row.text, startMs: row.startMs ?? 0 }))
      .sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
  },
});

export const _apply = internalMutation({
  args: { lessonId: v.id("lessons"), changes: v.array(v.object({ id: v.string(), text: v.string() })) },
  handler: async (ctx, { lessonId, changes }) => {
    const { lesson, lessons } = await requireLessonOwnerOrAdmin(ctx, lessonId);
    const rows = await ctx.db.query("lessonTranscriptUtterances").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).collect();
    rows.sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0) || a.utteranceId.localeCompare(b.utteranceId));
    const byId = new Map(changes.map((c) => [c.id, c.text]));
    const lineFixes: { before: string; after: string }[] = [];
    const fixed = new Map<string, string>();
    for (const row of rows) {
      const after = byId.get(row.utteranceId);
      if (after === undefined || !acceptableRewrite(row.text, after)) continue;
      lineFixes.push({ before: row.text, after: after.trim() });
      fixed.set(row.utteranceId, after.trim());
      await ctx.db.patch(row._id, { text: after.trim(), originalText: row.originalText ?? row.text });
    }
    if (lineFixes.length === 0) return { changed: 0 };
    // Rebuild from the lines only if the stored text doesn't contain them in order.
    const transcript =
      applyLineFixes(lesson.transcript, lineFixes) ??
      rows
        .map((row) => {
          const text = fixed.get(row.utteranceId) ?? row.text;
          return row.speaker ? `[${row.speaker}]: ${text}` : text;
        })
        .join("\n\n");
    await lessons.patch(lessonId, {
      transcript,
      transcriptBeforeEnglishFix: lesson.transcriptBeforeEnglishFix ?? lesson.transcript,
    });
    return { changed: lineFixes.length };
  },
});

/** Rewrite English written in Arabic/Cyrillic letters (teacher/admin). */
export const fix = action({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }): Promise<{ changed: number; checked: number }> => {
    const lines: { id: string; text: string }[] = await ctx.runQuery(internal.transcriptEnglish._lines, { lessonId });
    if (lines.length === 0) return { changed: 0, checked: 0 };
    const config = await ctx.runQuery(internal.promptConfigs.resolveForGeneration, { taskId: "english_fix" });
    const batches: { id: string; text: string }[][] = [[]];
    let size = 0;
    for (const line of lines) {
      if (size + line.text.length > BATCH_CHARS && batches.at(-1)!.length) {
        batches.push([]);
        size = 0;
      }
      batches.at(-1)!.push(line);
      size += line.text.length + 12;
    }
    const changes: { id: string; text: string }[] = [];
    // A few batches at a time keeps a 45-minute lesson well under a minute.
    for (let i = 0; i < batches.length; i += 3) {
      const results = await Promise.all(batches.slice(i, i + 3).map(async (batch) => {
        const ids = new Set(batch.map((line) => line.id));
        const output = await callOpenRouter(config, batch.map((line) => `[${line.id}]: ${line.text}`).join("\n\n"));
        try {
          const parsed: unknown = JSON.parse(output.content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
          const list = parsed !== null && typeof parsed === "object" ? (parsed as { lines?: unknown }).lines : undefined;
          return Array.isArray(list)
            ? list.flatMap((item) => {
                const o = item as { id?: unknown; text?: unknown };
                return typeof o.id === "string" && typeof o.text === "string" && ids.has(o.id) ? [{ id: o.id, text: o.text }] : [];
              })
            : [];
        } catch {
          return []; // an unreadable batch is skipped; its lines stay as transcribed
        }
      }));
      changes.push(...results.flat());
    }
    const result: { changed: number } = await ctx.runMutation(internal.transcriptEnglish._apply, { lessonId, changes });
    return { changed: result.changed, checked: lines.length };
  },
});

/** Put back the transcript exactly as it was transcribed. */
export const undo = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const { lesson, lessons } = await requireLessonOwnerOrAdmin(ctx, lessonId);
    const rows = await ctx.db.query("lessonTranscriptUtterances").withIndex("by_lessonId", (q) => q.eq("lessonId", lessonId)).collect();
    let restored = 0;
    for (const row of rows) {
      if (row.originalText === undefined) continue;
      await ctx.db.patch(row._id, { text: row.originalText, originalText: undefined });
      restored += 1;
    }
    if (lesson.transcriptBeforeEnglishFix !== undefined) {
      await lessons.patch(lessonId, { transcript: lesson.transcriptBeforeEnglishFix, transcriptBeforeEnglishFix: undefined });
    }
    return { restored };
  },
});
