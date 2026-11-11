// Academy policy engine — enforcement of POLICY.md §4-§5. Backend mutations
// enforce these verdicts; the UI previews them before the user confirms.
// POLICY.md is authoritative: if the two disagree, this file is the bug.
//
//  - Student: N free cancellations per 30 days with enough notice; else lesson burned.
//  - Student move inside the cancel notice is charged like a late cancel (late-move rule).
//  - Teacher: cancel allowed any time but late notice is tracked; first lesson with
//    a new student cannot be cancelled by the teacher.
//  - Students may edit any future lesson; teachers keep an N-day action horizon.
//  The numbers are admin-editable (`tenantSettings.policy`) — see POLICY_DEFAULTS.
//  - Admin: always free cancel, always full credit back.

import { wallTimeToMs, instantToZoned } from "./time";
import { addCalendarMonths, firstDayOfMonth } from "./calendarBookingPlan";

/**
 * The numbers an admin may change in Settings → Policy (POLICY.md says which
 * rule each one belongs to). Stored as `tenantSettings.policy`; a missing key
 * means "use the default here". A change applies to the next action only —
 * nothing already cancelled, charged or booked is recalculated.
 */
export const POLICY_DEFAULTS = {
  // Students
  bookingMinNoticeHours: 12,
  bookingMonthsAhead: 1, // 1 = through the end of next month
  maxStudentBookingsPerDay: 1,
  maxStudentBookingsPerWeek: 5,
  studentCancelNoticeHours: 6,
  studentFreeCancelsPer30Days: 2,
  pauseMaxDays: 14,
  pausesPer6Months: 2,
  expiryWarnFirstDays: 14,
  expiryWarnSecondDays: 3,
  // Teachers
  teacherCancelNoticeHours: 12,
  actionHorizonDays: 7,
  timeOffApprovalDays: 3,
  lessonPublishHours: 24,
  teacherMinWeeklyHours: 10,
  // No-show ladder
  noShowPingMinutes: 10,
  noShowWaitMinutes: 20,
};

export type PolicyKey = keyof typeof POLICY_DEFAULTS;
export type PolicyValues = Record<PolicyKey, number>;

/** Inclusive [min, max] for each value — guards against a typo like 600 h. */
export const POLICY_LIMITS: Record<PolicyKey, [number, number]> = {
  bookingMinNoticeHours: [0, 168],
  bookingMonthsAhead: [0, 6],
  maxStudentBookingsPerDay: [1, 10],
  maxStudentBookingsPerWeek: [1, 30],
  studentCancelNoticeHours: [0, 72],
  studentFreeCancelsPer30Days: [0, 30],
  pauseMaxDays: [0, 90],
  pausesPer6Months: [0, 12],
  expiryWarnFirstDays: [1, 60],
  expiryWarnSecondDays: [1, 60],
  teacherCancelNoticeHours: [0, 168],
  actionHorizonDays: [1, 90],
  timeOffApprovalDays: [0, 60],
  lessonPublishHours: [1, 168],
  teacherMinWeeklyHours: [0, 80],
  noShowPingMinutes: [1, 55],
  noShowWaitMinutes: [5, 55],
};

/** Merge stored overrides onto the defaults, ignoring anything out of range. */
export function resolvePolicy(
  stored?: Partial<Record<string, number | undefined>> | null
): PolicyValues {
  const out = { ...POLICY_DEFAULTS } as PolicyValues;
  if (!stored) return out;
  for (const key of Object.keys(POLICY_DEFAULTS) as PolicyKey[]) {
    const value = stored[key];
    const [min, max] = POLICY_LIMITS[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Fixed rules that are not admin-editable: changing them would break lessons
 * already on the calendar (length, grid) or a client mirror (early start).
 * `POLICY` also carries the defaults so legacy readers keep compiling.
 */
export const POLICY = {
  ...POLICY_DEFAULTS,
  bookingHorizonDays: null,
  bookingBoundaryMode: "academy_calendar_month_end",
  bookingPolicyVersion: "2026-10-06-half-hour-v2",
  bookingGranularityMinutes: 30,
  reservationMinutes: 60,
  teachingMinutes: 55,
  // §8 — teacher may start a scheduled session this early (minutes before
  // the scheduled academy-wall-clock start). Mirrored in src/lib/sessionStart.ts.
  lessonStartEarlyMinutes: 10,
} as const;

export function ordinaryBookingBoundary(
  now: Date,
  orgTz: string,
  policy: Pick<PolicyValues, "bookingMonthsAhead"> = POLICY_DEFAULTS
): {
  academyDate: string;
  upperExclusiveDate: string;
  upperExclusiveMs: number;
  mode: typeof POLICY.bookingBoundaryMode;
  policyVersion: typeof POLICY.bookingPolicyVersion;
} {
  const academyDate = instantToZoned(now, orgTz).date;
  const upperExclusiveDate = addCalendarMonths(
    firstDayOfMonth(academyDate),
    policy.bookingMonthsAhead + 1
  );
  return {
    academyDate,
    upperExclusiveDate,
    upperExclusiveMs: wallTimeToMs(upperExclusiveDate, "00:00", orgTz),
    mode: POLICY.bookingBoundaryMode,
    policyVersion: POLICY.bookingPolicyVersion,
  };
}

export type Actor = "teacher" | "student" | "admin";

/**
 * Whose cancellation it is. A teacher cancels either for themselves ("I can't
 * teach it": teacher rules, always refunded, counts against reliability) or
 * for the student who asked on WhatsApp ("student asked": student rules —
 * notice, monthly free quota, charged when late). Admins can pick either, or
 * cancel as the academy (always refunded, nobody's metric).
 */
export type CancelFor = "teacher" | "student" | "academy";

export interface CancelRoles {
  cancelFor: CancelFor;
  /** Actor whose policy rules decide refund vs charge. */
  verdictActor: Actor;
  /** Stored `cancelledBy` — quota, payroll and reliability read this. */
  cancelledBy: Actor;
  /** Who pressed the button when it differs from `cancelledBy`. */
  onBehalfBy?: "teacher" | "admin";
}

export function cancelRoles(actor: Actor, requested?: CancelFor): CancelRoles {
  if (actor === "student") return { cancelFor: "student", verdictActor: "student", cancelledBy: "student" };
  if (actor === "teacher") {
    return requested === "student"
      ? { cancelFor: "student", verdictActor: "student", cancelledBy: "student", onBehalfBy: "teacher" }
      : { cancelFor: "teacher", verdictActor: "teacher", cancelledBy: "teacher" };
  }
  if (requested === "student")
    return { cancelFor: "student", verdictActor: "student", cancelledBy: "student", onBehalfBy: "admin" };
  if (requested === "teacher")
    // Admin bypasses the teacher horizon/first-lesson block but the
    // cancellation still counts as the teacher's for reliability.
    return { cancelFor: "teacher", verdictActor: "admin", cancelledBy: "teacher", onBehalfBy: "admin" };
  return { cancelFor: "academy", verdictActor: "admin", cancelledBy: "admin" };
}

export interface EventLike {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  status: string;
  studentId?: string;
  pointCostSnapshot?: number;
}

/**
 * Hours from `now` until the event starts (negative = already started).
 *
 * Event rows store WALL-CLOCK time in the academy's timezone. Building a
 * Date straight from them treats that wall time as the server's zone (UTC
 * in Convex), which skewed every notice window by the academy's offset —
 * 5h for Almaty, enough to let a student cancel an hour before start and
 * be scored as 6h notice. Always pass `orgTz`.
 */
export function hoursUntil(event: EventLike, now: Date, orgTz: string): number {
  const startMs = wallTimeToMs(event.date, event.startTime, orgTz);
  if (Number.isNaN(startMs)) return 0; // malformed row — treat as "started"
  return (startMs - now.getTime()) / 3_600_000;
}

/** Event starts within the next `policy.actionHorizonDays` days (and hasn't started). */
export function withinActionHorizon(
  event: EventLike,
  now: Date,
  orgTz: string,
  policy: Pick<PolicyValues, "actionHorizonDays">
): boolean {
  const h = hoursUntil(event, now, orgTz);
  return h > 0 && h <= policy.actionHorizonDays * 24;
}

export interface CancelVerdict {
  allowed: boolean;
  /** true → student keeps/gets back the lesson credit; false → lesson burned */
  refund: boolean;
  /** teacher acted under the soft notice window — record for metrics */
  trackedLate: boolean;
  /**
   * English sentence — still what a thrown ConvexError carries and what the
   * staff portals render. `reasonKey` is the same sentence as a message key
   * so a student can read it in their own language (i18n, 2026-08-02).
   */
  reason: string;
  reasonKey: string;
  reasonValues?: Record<string, string | number>;
}

export function cancelVerdict(args: {
  actor: Actor;
  event: EventLike;
  now: Date;
  /** student's free cancellations already used in the last 30 days */
  studentRecentFreeCancels: number;
  /** is this the student's first-ever lesson with this teacher? */
  isFirstLessonWithStudent: boolean;
  /** academy timezone — event times are wall-clock in it */
  orgTz: string;
  policy: PolicyValues;
}): CancelVerdict {
  const { actor, event, now, studentRecentFreeCancels, isFirstLessonWithStudent, orgTz, policy } = args;
  const notice = hoursUntil(event, now, orgTz);

  if (event.status !== "scheduled" && event.status !== "makeup") {
    return { allowed: false, refund: false, trackedLate: false, reason: `Cannot cancel a ${event.status} lesson`, reasonKey: "cancel.badStatus", reasonValues: { status: event.status } };
  }
  if (notice <= 0) {
    return { allowed: false, refund: false, trackedLate: false, reason: "Lesson already started", reasonKey: "alreadyStarted" };
  }

  // Admin bypasses the action horizon (§13.4 horizon applies to teacher/student)
  if (actor === "admin") {
    return { allowed: true, refund: true, trackedLate: false, reason: "Admin cancellation — lesson credited back", reasonKey: "cancel.admin" };
  }
  if (actor === "teacher" && !withinActionHorizon(event, now, orgTz, policy)) {
    return { allowed: false, refund: false, trackedLate: false, reason: `Only lessons within the next ${policy.actionHorizonDays} days can be cancelled`, reasonKey: "cancel.horizon", reasonValues: { days: policy.actionHorizonDays } };
  }

  if (actor === "teacher") {
    if (isFirstLessonWithStudent) {
      return { allowed: false, refund: true, trackedLate: false, reason: "First lesson with a new student cannot be cancelled", reasonKey: "cancel.firstLesson" };
    }
    const late = notice < policy.teacherCancelNoticeHours;
    return {
      allowed: true,
      refund: true,
      trackedLate: late,
      reason: late
        ? `Less than ${policy.teacherCancelNoticeHours}h notice — allowed, but counts against your reliability`
        : "Lesson credited back to the student",
      reasonKey: late ? "cancel.teacherLate" : "cancel.teacherOk",
      reasonValues: { hours: policy.teacherCancelNoticeHours },
    };
  }

  // student
  const inTime = notice >= policy.studentCancelNoticeHours;
  const hasFreeLeft = studentRecentFreeCancels < policy.studentFreeCancelsPer30Days;
  if (inTime && hasFreeLeft) {
    const left = policy.studentFreeCancelsPer30Days - studentRecentFreeCancels - 1;
    return { allowed: true, refund: true, trackedLate: false, reason: `Free cancellation (${left} left this month)`, reasonKey: "cancel.free", reasonValues: { left } };
  }
  return {
    allowed: true,
    refund: false,
    trackedLate: false,
    reason: inTime
      ? "Free cancellations for this month used up — the lesson will be charged"
      : `Less than ${policy.studentCancelNoticeHours}h before the lesson — the lesson will be charged`,
    reasonKey: inTime ? "cancel.usedUp" : "cancel.studentLate",
    reasonValues: { hours: policy.studentCancelNoticeHours },
  };
}

export interface RescheduleVerdict {
  allowed: boolean;
  trackedLate: boolean;
  reasonKey: string;
  reasonValues?: Record<string, string | number>;
  /**
   * POLICY §4 late-move rule — the move is allowed but costs a lesson: the
   * original credit is burned (teacher gets paid for the hour they held)
   * and the new slot consumes a fresh credit.
   */
  chargesLesson: boolean;
  reason: string;
}

export function rescheduleVerdict(args: {
  actor: Actor;
  event: EventLike;
  now: Date;
  /** academy timezone — event times are wall-clock in it */
  orgTz: string;
  policy: PolicyValues;
}): RescheduleVerdict {
  const { actor, event, now, orgTz, policy } = args;
  const notice = hoursUntil(event, now, orgTz);

  if (event.status !== "scheduled" && event.status !== "makeup") {
    return { allowed: false, trackedLate: false, chargesLesson: false, reason: `Cannot move a ${event.status} lesson`, reasonKey: "move.badStatus", reasonValues: { status: event.status } };
  }
  if (notice <= 0) {
    return { allowed: false, trackedLate: false, chargesLesson: false, reason: "Lesson already started", reasonKey: "alreadyStarted" };
  }
  if (actor === "admin") {
    return { allowed: true, trackedLate: false, chargesLesson: false, reason: "", reasonKey: "" };
  }
  if (actor === "teacher" && !withinActionHorizon(event, now, orgTz, policy)) {
    return { allowed: false, trackedLate: false, chargesLesson: false, reason: `Only lessons within the next ${policy.actionHorizonDays} days can be moved`, reasonKey: "move.horizon", reasonValues: { days: policy.actionHorizonDays } };
  }
  if (actor === "teacher") {
    const late = notice < policy.teacherCancelNoticeHours;
    return {
      allowed: true,
      trackedLate: late,
      chargesLesson: false,
      reason: late
        ? `Less than ${policy.teacherCancelNoticeHours}h notice — agree with the student first`
        : "Agree on the new time with the student first",
      reasonKey: late ? "move.teacherLate" : "move.teacherAgree",
      reasonValues: { hours: policy.teacherCancelNoticeHours },
    };
  }

  // Student. POLICY §4: without this, "Move" an hour before start strictly
  // beats not showing up — the teacher eats a dead hour unpaid while the
  // student keeps the credit. Inside the cancel-notice window a move is
  // therefore charged exactly like a late cancel.
  if (notice < policy.studentCancelNoticeHours) {
    return {
      allowed: true,
      trackedLate: true,
      chargesLesson: true,
      reason: `Less than ${policy.studentCancelNoticeHours}h before the lesson — moving now uses this lesson, and the new time will use another`,
      reasonKey: "move.studentLate",
      reasonValues: { hours: policy.studentCancelNoticeHours },
    };
  }
  return { allowed: true, trackedLate: false, chargesLesson: false, reason: "", reasonKey: "" };
}
