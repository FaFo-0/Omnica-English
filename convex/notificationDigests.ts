// Hourly notification sweep. Each nudge fires once per person per day (or per
// homework deadline / per depletion) via sourceKey, so running hourly only
// decides *when* in the recipient's own day it lands.
//
//  - daily_agenda      teachers, 08:00 local, Telegram only
//  - study_reminder    students, 18:00 local, Telegram only, only if words are
//                      due and they haven't studied today
//  - homework_due      students, once when a deadline is under 24h away
//  - student_out_of_lessons  admins, 10:00 academy time, once per depletion

import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { insertNotification } from "./notifications";
import { instantToZoned, wallTimeToMs } from "./lib/time";

const AGENDA_HOUR = 8;
const STUDY_HOUR = 18;
const OUT_OF_LESSONS_HOUR = 10;

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function alreadySent(
  ctx: MutationCtx,
  orgId: string,
  recipientId: string,
  sourceKey: string,
): Promise<boolean> {
  const row = await ctx.db
    .query("notifications")
    .withIndex("by_organization_and_recipientId_and_sourceKey", (q) =>
      q.eq("organizationId", orgId).eq("recipientId", recipientId).eq("sourceKey", sourceKey),
    )
    .unique();
  return row !== null;
}

async function teacherAgenda(
  ctx: MutationCtx,
  orgId: string,
  orgTz: string,
  teacher: Doc<"users">,
  now: Date,
) {
  if (!teacher.telegramChatId) return 0;
  const tz = teacher.timezone ?? orgTz;
  const local = instantToZoned(now, tz);
  if (Number(local.time.slice(0, 2)) !== AGENDA_HOUR) return 0;
  const sourceKey = `agenda:${local.date}`;
  if (await alreadySent(ctx, orgId, teacher.externalId, sourceKey)) return 0;

  // Events are stored in academy wall-clock; the teacher's "today" can span
  // two academy dates, so convert each one.
  const events = await ctx.db
    .query("scheduleEvents")
    .withIndex("by_organization_and_date", (q) =>
      q
        .eq("organizationId", orgId)
        .gte("date", addDays(local.date, -1))
        .lte("date", addDays(local.date, 1)),
    )
    .collect();
  const lessons: { startTime: string; studentName: string; ms: number }[] = [];
  for (const event of events) {
    if (event.teacherId !== teacher.externalId) continue;
    if (event.isDeleted || event.type === "placeholder") continue;
    if (event.status !== "scheduled" && event.status !== "makeup") continue;
    const ms = wallTimeToMs(event.date, event.startTime, orgTz);
    const there = instantToZoned(new Date(ms), tz);
    if (there.date !== local.date) continue;
    const student = event.studentId
      ? await ctx.db
          .query("users")
          .withIndex("by_organization_and_externalId", (q) =>
            q.eq("organizationId", orgId).eq("externalId", event.studentId!),
          )
          .first()
      : null;
    lessons.push({ startTime: there.time, studentName: student?.name?.split(" ")[0] ?? event.title, ms });
  }
  lessons.sort((a, b) => a.ms - b.ms);

  const teacherLessons = await ctx.db
    .query("lessons")
    .withIndex("by_organization_and_teacherId", (q) =>
      q.eq("organizationId", orgId).eq("teacherId", teacher.externalId),
    )
    .collect();
  const toPublish = teacherLessons.filter(
    (l) => !l.isDeleted && (l.status === "review" || l.status === "transcribed"),
  ).length;
  const homework = await ctx.db
    .query("homework")
    .withIndex("by_organization_and_teacherId", (q) =>
      q.eq("organizationId", orgId).eq("teacherId", teacher.externalId),
    )
    .collect();
  const toReview = homework.filter((h) => h.status === "submitted").length;

  if (lessons.length === 0 && toPublish === 0 && toReview === 0) return 0;
  await insertNotification(ctx, {
    organizationId: orgId,
    recipientId: teacher.externalId,
    kind: "daily_agenda",
    payload: {
      date: local.date,
      lessons: lessons.map(({ startTime, studentName }) => ({ startTime, studentName })),
      toPublish,
      toReview,
    },
    link: "/teacher/calendar",
    sourceKey,
  });
  return 1;
}

async function studyReminder(
  ctx: MutationCtx,
  orgId: string,
  orgTz: string,
  student: Doc<"users">,
  now: Date,
) {
  if (!student.telegramChatId || student.studentStatus === "paused") return 0;
  const local = instantToZoned(now, student.timezone ?? orgTz);
  if (Number(local.time.slice(0, 2)) !== STUDY_HOUR) return 0;
  const sourceKey = `study:${local.date}`;
  if (await alreadySent(ctx, orgId, student.externalId, sourceKey)) return 0;
  const streak = await ctx.db
    .query("streaks")
    .withIndex("by_organization_and_studentId", (q) =>
      q.eq("organizationId", orgId).eq("studentId", student.externalId),
    )
    .first();
  if (streak?.lastActivityDate === local.date) return 0;
  const due = await ctx.db
    .query("srsCards")
    .withIndex("by_organization_and_ownerId_and_nextReviewDate", (q) =>
      q.eq("organizationId", orgId).eq("ownerId", student.externalId).lte("nextReviewDate", local.date),
    )
    .take(500);
  const dueCards = due.filter((card) => !card.isDeleted).length;
  if (dueCards === 0) return 0;
  await insertNotification(ctx, {
    organizationId: orgId,
    recipientId: student.externalId,
    kind: "study_reminder",
    payload: { dueCards, streak: streak?.currentStreak ?? 0 },
    link: "/student/study",
    sourceKey,
  });
  return 1;
}

async function homeworkDue(ctx: MutationCtx, orgId: string, nowMs: number) {
  let sent = 0;
  for (const status of ["assigned", "in_progress"] as const) {
    const rows = await ctx.db
      .query("homework")
      .withIndex("by_organization_and_status", (q) =>
        q.eq("organizationId", orgId).eq("status", status),
      )
      .collect();
    for (const row of rows) {
      if (!row.dueAt) continue;
      const dueMs = Date.parse(row.dueAt);
      if (Number.isNaN(dueMs)) continue;
      // Under 24h away but not in the last hour — a reminder that lands as
      // the deadline passes is just noise.
      if (dueMs - nowMs > 24 * 3600_000 || dueMs - nowMs < 3600_000) continue;
      const sourceKey = `homework-due:${row._id}:${row.dueAt}`;
      if (await alreadySent(ctx, orgId, row.studentId, sourceKey)) continue;
      await insertNotification(ctx, {
        organizationId: orgId,
        recipientId: row.studentId,
        kind: "homework_due",
        payload: { homeworkId: row._id, title: row.title, dueAt: row.dueAt },
        link: `/student/homework/${row._id}`,
        sourceKey,
      });
      sent++;
    }
  }
  return sent;
}

async function outOfLessons(
  ctx: MutationCtx,
  orgId: string,
  orgTz: string,
  students: Doc<"users">[],
  admins: Doc<"users">[],
  now: Date,
) {
  const local = instantToZoned(now, orgTz);
  if (Number(local.time.slice(0, 2)) !== OUT_OF_LESSONS_HOUR) return 0;
  let sent = 0;
  for (const student of students) {
    if (student.studentStatus === "paused" || student.studentStatus === "cancelled") continue;
    const grants = await ctx.db
      .query("pointGrants")
      .withIndex("by_organization_and_studentId", (q) =>
        q.eq("organizationId", orgId).eq("studentId", student.externalId),
      )
      .collect();
    if (grants.length === 0) continue; // never bought anything — a signup, not a lapse
    const balance = grants.reduce(
      (sum, g) => (!g.isExpired && g.expiresAt >= local.date ? sum + g.remainingPoints : sum),
      0,
    );
    if (balance > 0) continue;
    const events = await ctx.db
      .query("scheduleEvents")
      .withIndex("by_organization_and_studentId", (q) =>
        q.eq("organizationId", orgId).eq("studentId", student.externalId),
      )
      .collect();
    const upcoming = events.some(
      (e) =>
        !e.isDeleted &&
        (e.status === "scheduled" || e.status === "makeup") &&
        e.date >= local.date,
    );
    if (upcoming) continue;
    // Once per depletion: the last ledger row changes when they top up and
    // run out again.
    const lastTx = await ctx.db
      .query("pointTransactions")
      .withIndex("by_organization_and_studentId", (q) =>
        q.eq("organizationId", orgId).eq("studentId", student.externalId),
      )
      .order("desc")
      .first();
    const sourceKey = `out-of-lessons:${student.externalId}:${lastTx?._id ?? "none"}`;
    for (const admin of admins) {
      if (await alreadySent(ctx, orgId, admin.externalId, sourceKey)) continue;
      await insertNotification(ctx, {
        organizationId: orgId,
        recipientId: admin.externalId,
        kind: "student_out_of_lessons",
        payload: { studentId: student.externalId, studentUserId: student._id, studentName: student.name },
        link: `/admin/students/${student._id}`,
        sourceKey,
      });
      sent++;
    }
  }
  return sent;
}

export const hourly = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const totals = { agenda: 0, study: 0, homeworkDue: 0, outOfLessons: 0 };
    const orgs = await ctx.db.query("tenantSettings").take(20);
    for (const settings of orgs) {
      const orgId = settings.organizationId;
      const orgTz = settings.timezone ?? "UTC";
      const byRole = async (role: "teacher" | "student" | "admin") =>
        await ctx.db
          .query("users")
          .withIndex("by_organization_and_role", (q) => q.eq("organizationId", orgId).eq("role", role))
          .collect();
      const [teachers, students, admins] = await Promise.all([
        byRole("teacher"),
        byRole("student"),
        byRole("admin"),
      ]);
      for (const teacher of teachers) totals.agenda += await teacherAgenda(ctx, orgId, orgTz, teacher, now);
      for (const student of students) totals.study += await studyReminder(ctx, orgId, orgTz, student, now);
      totals.homeworkDue += await homeworkDue(ctx, orgId, now.getTime());
      totals.outOfLessons += await outOfLessons(ctx, orgId, orgTz, students, admins, now);
    }
    return totals;
  },
});
