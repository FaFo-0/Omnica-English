/**
 * Staff lesson plans: a teacher (or admin) books a student's whole schedule
 * at once — several weekly times, repeated until a date — instead of adding
 * lessons one by one. Same rules as a single staff-added lesson
 * (`calendar.createOneTimeLesson`): any half-hour start, no overlaps for
 * teacher or student, not on time off, in the future. Lessons the balance
 * covers are paid in date order; the rest are booked `unpaid` for admin
 * follow-up, exactly like a single lesson with no credit.
 */
import { v, ConvexError } from "convex/values";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { requireTenant } from "./lib/tenant";
import { userHasPermission } from "./lib/permissions";
import { POLICY } from "./lib/policy";
import { instantToZoned, wallTimeToMs } from "./lib/time";
import { DEFAULT_ACTIVITY_TYPES } from "./tenantSettings";
import { spendPointsInternal } from "./points";
import { syncAutomaticHomeworkDeadlines } from "./homework";
import { syncLessonTitles } from "./lib/syncLessonTitles";
import {
  ACTIVE_STATUSES,
  loadSlotSources,
  loadTeacherEvents,
  overlapConflict,
  requireSlotStart,
  timeOffOnDate,
} from "./calendar";

const MAX_PLAN = 60;
const booking = v.object({ date: v.string(), startTime: v.string() });

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

type PlanItem = { date: string; startTime: string; endTime: string; ok: boolean; reason?: string; paid: boolean };

async function checkPlan(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  orgId: string,
  args: { studentId: string; teacherId?: string; bookings: { date: string; startTime: string }[] },
) {
  if ((user.role !== "teacher" && user.role !== "admin") || !userHasPermission(user, "calendar.edit.full"))
    throw new ConvexError("Lesson assignment is not permitted");
  const teacherId = user.role === "admin" ? (args.teacherId ?? user.externalId) : user.externalId;
  if (args.bookings.length === 0) throw new ConvexError("Choose at least one lesson time");
  if (args.bookings.length > MAX_PLAN) throw new ConvexError(`Book at most ${MAX_PLAN} lessons at once`);

  const settings = await ctx.db.query("tenantSettings").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).unique();
  const academyTz = settings?.timezone ?? "UTC";
  const teacher = await ctx.db.query("users")
    .withIndex("by_organization_and_externalId", (q) => q.eq("organizationId", orgId).eq("externalId", teacherId)).unique();
  if (!teacher || teacher.role !== "teacher") throw new ConvexError("Teacher not found");
  const student = await ctx.db.query("users")
    .withIndex("by_organization_and_externalId", (q) => q.eq("organizationId", orgId).eq("externalId", args.studentId)).unique();
  if (!student || student.role !== "student") throw new ConvexError("Student not found");
  if (user.role === "teacher" && student.teacherId !== teacherId) throw new ConvexError("Student is not assigned to you");

  const types = settings?.activityTypes ?? DEFAULT_ACTIVITY_TYPES;
  const activity = types.find((a) => a.isActive && !a.isGroup) ?? types.find((a) => !a.isGroup);
  if (!activity) throw new ConvexError("No 1-on-1 activity type configured");

  const today = instantToZoned(new Date(), academyTz).date;
  const grants = await ctx.db.query("pointGrants")
    .withIndex("by_organization_and_studentId", (q) => q.eq("organizationId", orgId).eq("studentId", args.studentId)).collect();
  let balance = 0;
  for (const g of grants) if (!g.isExpired && g.expiresAt >= today && g.remainingPoints > 0) balance += g.remainingPoints;

  const sorted = [...new Map(args.bookings.map((b) => [`${b.date}|${b.startTime}`, b])).values()]
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const from = sorted[0].date, to = sorted[sorted.length - 1].date;
  const teacherEvents = await loadTeacherEvents(ctx, orgId, teacherId, from, to);
  const studentEvents = (await ctx.db.query("scheduleEvents")
    .withIndex("by_organization_and_studentId", (q) => q.eq("organizationId", orgId).eq("studentId", args.studentId)).collect())
    .filter((e) => !e.isDeleted && ACTIVE_STATUSES.includes(e.status));
  const sources = await loadSlotSources(ctx, orgId, teacherId);
  const accepted: { date: string; startTime: string; endTime: string; status: string }[] = [];

  let budget = balance;
  const items: PlanItem[] = [];
  for (const b of sorted) {
    const fail = (reason: string) => items.push({ ...b, endTime: b.startTime, ok: false, reason, paid: false });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) { fail("Invalid date"); continue; }
    let startMin: number;
    try { startMin = requireSlotStart(b.startTime); } catch (error) { fail((error as ConvexError<string>).data ?? "Invalid time"); continue; }
    const endMin = startMin + POLICY.reservationMinutes;
    const endTime = toTime(endMin);
    if (wallTimeToMs(b.date, b.startTime, academyTz) <= Date.now()) { fail("This time has passed"); continue; }
    if (timeOffOnDate(sources, b.date)) { fail("Teacher has time off that day"); continue; }
    const teacherHit = overlapConflict([...teacherEvents, ...accepted], b.date, startMin, endMin);
    if (teacherHit) { fail(`Teacher already has ${teacherHit.startTime}–${teacherHit.endTime}`); continue; }
    const studentHit = overlapConflict(studentEvents, b.date, startMin, endMin);
    if (studentHit) { fail(`Student already has a lesson at ${studentHit.startTime}`); continue; }
    const paid = budget >= activity.pointCost;
    if (paid) budget -= activity.pointCost;
    items.push({ ...b, endTime, ok: true, paid });
    accepted.push({ date: b.date, startTime: b.startTime, endTime, status: "scheduled" });
  }
  return { teacherId, teacher, student, activity, balance, items };
}

export const previewLessonPlan = query({
  args: { studentId: v.string(), teacherId: v.optional(v.string()), bookings: v.array(booking) },
  handler: async (ctx, args) => {
    const { orgId, user } = await requireTenant(ctx);
    const plan = await checkPlan(ctx, user, orgId, args);
    return {
      balance: plan.balance,
      items: plan.items.map(({ date, startTime, ok, reason, paid }) => ({ date, startTime, ok, reason: reason ?? null, paid })),
    };
  },
});

/** Books every lesson in the plan, or none if any of them no longer fits. */
export const bookLessonPlan = mutation({
  args: { studentId: v.string(), teacherId: v.optional(v.string()), bookings: v.array(booking), requestId: v.string() },
  handler: async (ctx, args) => {
    const { orgId, user } = await requireTenant(ctx);
    if (args.requestId.length < 8 || args.requestId.length > 200) throw new ConvexError("Invalid booking request");
    const previous = await ctx.db.query("scheduleEvents")
      .withIndex("by_booking_request", (q) =>
        q.eq("organizationId", orgId).eq("bookingActorId", user.externalId).eq("bookingRequestId", args.requestId))
      .unique();
    if (previous) return { booked: args.bookings.length, unpaid: 0, alreadyBooked: true };

    const plan = await checkPlan(ctx, user, orgId, args);
    const blocked = plan.items.filter((item) => !item.ok);
    if (blocked.length) {
      throw new ConvexError(`${blocked[0].date} ${blocked[0].startTime}: ${blocked[0].reason}. Nothing was booked — review the plan again.`);
    }
    for (const [i, item] of plan.items.entries()) {
      const eventId = await ctx.db.insert("scheduleEvents", {
        organizationId: orgId,
        bookingRequestId: i === 0 ? args.requestId : `${args.requestId}:${i}`,
        bookingActorId: user.externalId,
        externalId: `evt-plan-${args.requestId}-${i}`,
        type: "1on1",
        teacherId: plan.teacherId,
        studentId: args.studentId,
        title: plan.activity.name,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        status: "scheduled",
        activityTypeId: plan.activity.id,
        pointCostSnapshot: plan.activity.pointCost,
        googleMeetLink: plan.teacher.meetLink,
        adHoc: true,
        adHocSource: "one_time_booking",
        unpaid: !item.paid,
        createdAt: new Date().toISOString(),
      });
      if (item.paid) {
        await spendPointsInternal(ctx, {
          orgId,
          studentId: args.studentId,
          amount: plan.activity.pointCost,
          scheduleEventId: eventId,
          reason: `${plan.activity.name} on ${item.date} ${item.startTime}`,
          performedBy: user.externalId,
        });
      }
    }

    const first = plan.items[0];
    const count = plan.items.length;
    const unpaid = plan.items.filter((item) => !item.paid).length;
    await ctx.runMutation(internal.notifications._notify, {
      organizationId: orgId,
      recipientId: args.studentId,
      kind: "lesson_assigned",
      payload: { date: first.date, startTime: first.startTime, by: user.role, count },
      link: "/student/calendar",
    });
    if (user.role === "admin" && user.externalId !== plan.teacherId) {
      await ctx.runMutation(internal.notifications._notify, {
        organizationId: orgId,
        recipientId: plan.teacherId,
        kind: "lesson_assigned",
        payload: { date: first.date, startTime: first.startTime, by: "admin", count, studentName: plan.student.name },
        link: "/teacher/calendar",
      });
    }
    if (unpaid > 0) {
      const admins = await ctx.db.query("users")
        .withIndex("by_organization_and_role", (q) => q.eq("organizationId", orgId).eq("role", "admin")).collect();
      for (const admin of admins) {
        await ctx.runMutation(internal.notifications._notify, {
          organizationId: orgId,
          recipientId: admin.externalId,
          kind: "lesson_assigned",
          payload: { date: first.date, startTime: first.startTime, by: user.role, unpaid: true, count: unpaid, studentName: plan.student.name },
          link: "/admin/billing?tab=commercial",
        });
      }
    }
    await syncAutomaticHomeworkDeadlines(ctx, orgId, args.studentId);
    await syncLessonTitles(ctx, orgId, args.studentId);
    return { booked: count, unpaid, alreadyBooked: false };
  },
});
