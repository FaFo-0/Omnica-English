// ─────────────────────────────────────────────────────────────────────
// Notification contract registry — the single source of truth.
//
// Every notification kind the platform can emit is listed here with:
//   - who may receive it (audiences)
//   - in-app title/body/icon/tone (the bell)
//   - a role-aware destination so a click always lands somewhere useful
//   - Telegram title/body/fallback message composition
//
// The Convex schema union and `_notify` validator are derived from
// NOTIFICATION_KINDS so producers, rendering and destinations cannot drift.
//
// This file is PURE TypeScript — no Convex server imports — so it can be
// imported by tests, by the Next.js frontend, and by Convex actions alike.
// ─────────────────────────────────────────────────────────────────────

import { orderAdminLink as billingOrderAdminLink } from "./pricingCatalogue";

export type NotifRole = "student" | "teacher" | "admin";
export type NotifTone = "info" | "success" | "warning" | "danger";
export type NotificationLocale = "en" | "ru" | "ar" | "kk";

export const NOTIFICATION_KINDS = [
  "session_published",
  "meeting_room_changed",
  "reschedule_request",
  "reschedule_resolved",
  "permission_request",
  "permission_resolved",
  "achievement_unlocked",
  "teacher_late_start",
  "teacher_no_show",
  "student_no_show",
  "makeup_credit_issued",
  "student_assigned",
  "student_unassigned",
  "teacher_assigned",
  "student_paused",
  "points_granted",
  "balance_low",
  "student_out_of_lessons",
  "booking_reminder",
  "homework_assigned",
  "homework_due",
  "homework_submitted",
  "homework_reviewed",
  "session_reminder",
  "daily_agenda",
  "study_reminder",
  "lesson_cancelled",
  "lesson_rescheduled",
  "lesson_assigned",
  "teacher_time_off",
  "time_off_approved",
  "billing_order_requested",
  "billing_order_rejected",
  "finance_entry_due",
  "salary_paid",
  "payment_received",
  "one_time_lesson_started",
  "student_signup",
  "balance_expiring",
] as const;
/**
 * Kinds nothing produces any more. Old rows may still exist, so storage keeps
 * accepting them and the bell renders them through the generic fallback; new
 * writes are rejected because they have no contract.
 */
export const RETIRED_NOTIFICATION_KINDS = [
  "lessons_requested",
  "payment_refunded",
  "payment_failed",
  "invoice",
  "impersonation",
  "points_refunded",
  "unscheduled_session",
] as const;
/** Everything the notifications table may hold (schema union). */
export const STORED_NOTIFICATION_KINDS = [
  ...NOTIFICATION_KINDS,
  ...RETIRED_NOTIFICATION_KINDS,
] as const;
/**
 * Daily nudges that only make sense as a push: they are created only for
 * members with Telegram linked and never shown in the in-app bell.
 */
export const TELEGRAM_ONLY_KINDS: readonly string[] = ["daily_agenda", "study_reminder"];
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

type Payload = Record<string, unknown>;

// ── tiny readers ────────────────────────────────────────────────────
const s = (payload: Payload, key: string): string | undefined =>
  typeof payload[key] === "string" && String(payload[key]).trim()
    ? String(payload[key])
    : undefined;

const firstWord = (name?: string): string => name?.split(" ")[0] ?? "?";

/** "today"/"tomorrow"/"Wed, Sep 9" from a "YYYY-MM-DD" date. */
function fmtDate(date?: string): string {
  if (!date) return "";
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "today";
  if (same(d, tomorrow)) return "tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** A booked plan sends one notification carrying how many lessons it holds. */
function lessonCount(payload: Payload): number {
  return typeof payload.count === "number" ? payload.count : 1;
}

function at(payload: Payload, dateKey = "date", timeKey = "startTime"): string {
  const date = fmtDate(s(payload, dateKey));
  const time = s(payload, timeKey);
  if (date && time) return `${date} at ${time}`;
  return date || time || "";
}

/** Who performed the action, second person where it reads better. */
function actor(by?: string): string {
  switch (by) {
    case "student": return "Your student";
    case "teacher": return "Your teacher";
    case "admin": return "The academy";
    case "weekly-schedule": return "Your weekly schedule";
    default: return "Someone";
  }
}

/** A grouped notice carries `lessons: [{ date, startTime, charged? }]`. */
export type LessonRef = {
  date: string;
  startTime: string;
  charged?: boolean;
};
export function lessonRefs(payload: Payload): LessonRef[] {
  if (Array.isArray(payload.lessons)) {
    return payload.lessons.filter(
      (row): row is LessonRef =>
        !!row && typeof row === "object" &&
        typeof (row as LessonRef).date === "string" &&
        typeof (row as LessonRef).startTime === "string",
    );
  }
  const date = s(payload, "date");
  const startTime = s(payload, "startTime");
  return date && startTime
    ? [{ date, startTime, charged: typeof payload.charged === "boolean" ? payload.charged : undefined }]
    : [];
}
/** "Mon, Nov 16 at 16:00, Wed, Nov 18 at 16:00 (charged)" — at most five, then "+N more". */
function lessonList(lessons: LessonRef[], markCharged = false): string {
  const shown = lessons.slice(0, 5).map((row) =>
    `${at({ date: row.date, startTime: row.startTime })}${markCharged && row.charged ? " (charged)" : ""}`,
  );
  const more = lessons.length - shown.length;
  return `${shown.join(", ")}${more > 0 ? ` and ${more} more` : ""}`;
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Why a student cancellation was charged — shown to the student. */
function chargeExplanation(reason: unknown): string {
  return reason === "quota"
    ? "You'd already used this month's free cancellations, so it was charged."
    : "It was less than 6 hours before the lesson, so it was charged.";
}

function cancelledTitle(p: Payload): string {
  const count = lessonRefs(p).length;
  if (p.audience === "student" && p.for === "teacher")
    return count > 1 ? "Your teacher cancelled lessons" : "Your teacher cancelled a lesson";
  if (p.audience === "student" && p.for === "student")
    return count > 1 ? "Lessons cancelled for you" : "Lesson cancelled for you";
  return count > 1 ? `${count} lessons cancelled` : "Lesson cancelled";
}

function cancelledBody(p: Payload): string {
  const lessons = lessonRefs(p);
  const count = lessons.length;
  const one = count === 1 ? lessons[0] : undefined;
  const charged = lessons.filter((row) => row.charged).length;
  const list = lessonList(lessons, p.for === "student");
  const student = s(p, "studentName");
  const teacher = s(p, "teacherName");
  const outcome = charged === 0
    ? count === 1 ? "credit returned" : "all credits returned"
    : charged === count
      ? count === 1 ? "charged" : "all charged"
      : `${count - charged} returned, ${charged} charged`;

  // Legacy rows (before cancellation reasons) carry only by/date/charged.
  if (!p.for) {
    return `${actor(s(p, "by"))} cancelled the lesson ${at(p)}${
      p.charged ? " — the lesson was charged." : " — the credit was returned."
    }`;
  }

  if (p.audience === "student") {
    if (p.for === "teacher") {
      return one
        ? `Your teacher can't make it and cancelled your lesson ${at(one)}. The lesson was returned to your balance.`
        : `Your teacher can't make it and cancelled ${count} lessons: ${list}. All ${count} were returned to your balance.`;
    }
    if (p.for === "student") {
      if (one) {
        return `Your teacher cancelled your lesson ${at(one)} for you, as you asked. ${
          one.charged ? chargeExplanation(p.chargeReason) : "It was a free cancellation — the lesson is back on your balance."
        }`;
      }
      return `Your teacher cancelled ${count} lessons for you, as you asked: ${list}. ${
        charged === 0 ? "All were free — the lessons are back on your balance." : charged === count ? "All were charged." : `${count - charged} returned to your balance, ${charged} charged.`
      }`;
    }
    return one
      ? `The academy cancelled your lesson ${at(one)}. The lesson was returned to your balance.`
      : `The academy cancelled ${count} lessons: ${list}. All were returned to your balance.`;
  }

  if (p.audience === "teacher") {
    const who = student ?? "Your student";
    if (p.by === "student") {
      return `${who} cancelled ${one ? `the lesson ${at(one)}` : `${count} lessons: ${list}`} — ${
        charged ? "late, so it was charged" : "free cancellation"
      }.`;
    }
    const why = p.for === "student" ? ` — ${student ?? "the student"} asked` : p.for === "teacher" ? " on your behalf" : "";
    return `The academy cancelled ${one ? `your lesson with ${who} ${at(one)}` : `${count} lessons with ${who}: ${list}`}${why}.`;
  }

  // admin
  const by = p.by === "student" ? (student ?? "The student") : p.by === "teacher" ? (teacher ?? "The teacher") : "An admin";
  const why = p.by === "student"
    ? ""
    : p.for === "student" ? ` (${student ?? "student"} asked)` : p.for === "teacher" ? " (teacher can't make it)" : "";
  return `${by} cancelled ${student && p.by !== "student" ? `${student}'s ` : ""}${
    one ? `lesson ${at(one)}` : `${count} lessons: ${list}`
  }${why} — ${outcome}.`;
}

// ── contract shape ──────────────────────────────────────────────────
export interface NotifContract {
  kind: NotificationKind;
  /** Which portals may legitimately receive this kind. */
  audiences: NotifRole[];
  /** Reject malformed new writes before they become an empty or misleading bell row. */
  validatePayload?: (payload: Payload) => string[];
  icon: string;
  tone: NotifTone;
  title: (payload: Payload) => string;
  body: (payload: Payload) => string;
  /** Role-aware fallback destination. Stored links on the row win. */
  destination: (payload: Payload, role: NotifRole) => string | undefined;
}

// ─────────────────────────────────────────────────────────────────────
// Contract table
// ─────────────────────────────────────────────────────────────────────
export const NOTIFICATION_CONTRACTS: Record<NotificationKind, NotifContract> = {
  meeting_room_changed: {
    kind: "meeting_room_changed", audiences: ["student"], icon: "video", tone: "info",
    title: () => "Meeting room updated",
    body: () => "Your teacher changed the meeting room. Use Join lesson to open the current room.",
    destination: (p) => s(p, "eventId") ? `/join/${p.eventId}` : "/student/lessons",
  },
  lesson_assigned: {
    kind: "lesson_assigned",
    audiences: ["student", "teacher", "admin"],
    icon: "calendar",
    tone: "success",
    title: (p) => {
      const n = Math.max(lessonRefs(p).length, lessonCount(p));
      return n > 1 ? `${n} lessons booked` : "Lesson booked";
    },
    body: (p) => {
      if (p.by === "weekly-schedule") return `Your weekly slot booked ${at(p)}.`;
      const lessons = lessonRefs(p);
      const who = p.by === "student" && s(p, "studentName") ? s(p, "studentName")! : actor(s(p, "by"));
      // Student batch bookings list every lesson; staff lesson plans send a count.
      if (lessons.length > 1) return `${who} booked ${lessons.length} lessons: ${lessonList(lessons)}.`;
      if (lessonCount(p) > 1) return `${who} booked ${lessonCount(p)} lessons, starting ${at(p)}.`;
      return `${who} booked a lesson ${at(lessons[0] ?? p)}.`;
    },
    destination: (_p, role) =>
      role === "admin" ? "/admin/calendar" : role === "teacher" ? "/teacher/calendar" : "/student/calendar",
  },

  one_time_lesson_started: {
    kind: "one_time_lesson_started",
    audiences: ["admin", "student"],
    validatePayload: (p) => [
      ...[
        "teacherId",
        "teacherName",
        "studentId",
        "studentName",
        "date",
        "startTime",
        "lessonId",
        "eventId",
      ]
        .filter((key) => !s(p, key))
        .map((key) => `payload.${key} must be a non-empty string`),
      ...(typeof p.unpaid === "boolean" ? [] : ["payload.unpaid must be a boolean"]),
    ],
    icon: "video",
    tone: "success",
    title: () => "One-time lesson started",
    body: (p) => {
      const teacher = s(p, "teacherName") ?? "A teacher";
      const student = s(p, "studentName") ?? "a student";
      const base = `${teacher} started a one-time lesson with ${student} ${at(p)}.`;
      return p.unpaid
        ? `${base} No lesson credit was available — review billing.`
        : base;
    },
    destination: (p, role) =>
      role === "admin"
        ? s(p, "lessonId")
          ? `/admin/sessions?lesson=${p.lessonId}`
          : s(p, "eventId")
            ? `/admin/calendar?event=${p.eventId}`
            : "/admin/sessions"
        : "/student/calendar",
  },

  teacher_time_off: {
    kind: "teacher_time_off",
    audiences: ["admin"],
    icon: "calendar",
    tone: "warning",
    title: (p) => (p.needsApproval ? "Time off — please review" : "Teacher time off"),
    body: (p) =>
      `${s(p, "teacherName") ?? "A teacher"} blocked ${p.days ?? "?"} day${
        p.days === 1 ? "" : "s"
      } (${s(p, "fromDate") ?? ""} → ${s(p, "toDate") ?? ""})${
        p.needsApproval ? " — longer than 3 days, so it needs your sign-off." : "."
      }`,
    destination: () => "/admin/calendar",
  },

  lesson_cancelled: {
    kind: "lesson_cancelled",
    audiences: ["student", "teacher", "admin"],
    // New writes say who the cancellation is for and list every lesson, so
    // one notice covers a whole batch (e.g. a teacher clearing a week off).
    validatePayload: (p) => [
      ...(["student", "teacher", "admin"].includes(String(p.audience)) ? [] : ["payload.audience must be student, teacher or admin"]),
      ...(["student", "teacher", "admin"].includes(String(p.by)) ? [] : ["payload.by must be student, teacher or admin"]),
      ...(["student", "teacher", "academy"].includes(String(p.for)) ? [] : ["payload.for must be student, teacher or academy"]),
      ...(lessonRefs(p).length > 0 ? [] : ["payload.lessons must list at least one lesson"]),
    ],
    icon: "calendar",
    tone: "warning",
    title: cancelledTitle,
    body: cancelledBody,
    destination: (_p, role) =>
      role === "admin" ? "/admin/calendar" : role === "teacher" ? "/teacher/calendar" : "/student/calendar",
  },

  lesson_rescheduled: {
    kind: "lesson_rescheduled",
    audiences: ["student", "teacher"],
    icon: "calendar",
    tone: "info",
    title: () => "Lesson moved",
    body: (p) =>
      `${actor(s(p, "by"))} moved the lesson from ${at(p, "fromDate", "fromTime")} to ${at(
        p,
        "toDate",
        "toTime"
      )}.`,
    destination: (_p, role) => (role === "teacher" ? "/teacher/calendar" : "/student/calendar"),
  },

  session_reminder: {
    kind: "session_reminder",
    audiences: ["student", "teacher"],
    icon: "clock",
    tone: "info",
    title: (p) => (p.when === "24h" ? "Lesson tomorrow" : "Lesson starting soon"),
    body: (p) => `${s(p, "title") ?? "Your lesson"} — ${at(p)}.`,
    destination: (_p, role) => (role === "teacher" ? "/teacher/calendar" : "/student/calendar"),
  },

  teacher_no_show: {
    kind: "teacher_no_show",
    audiences: ["student", "admin"],
    validatePayload: (p) =>
      s(p, "teacherName")
        ? []
        : ["payload.teacherName must be a non-empty string"],
    icon: "alert",
    tone: "danger",
    title: () => "Teacher didn't show",
    body: (p) =>
      `${s(p, "teacherName") ?? "The teacher"} didn't show for ${
        s(p, "title") ?? "the lesson"
      }${p.refunded ? " — your lesson credit was returned." : "."}`,
    destination: (_p, role) => (role === "admin" ? "/admin/calendar" : "/student/calendar"),
  },

  teacher_late_start: {
    kind: "teacher_late_start",
    audiences: ["admin"],
    validatePayload: (p) =>
      s(p, "teacherName")
        ? []
        : ["payload.teacherName must be a non-empty string"],
    icon: "clock",
    tone: "warning",
    title: () => "Teacher has not started",
    body: (p) =>
      `${s(p, "teacherName") ?? "The teacher"} has not started ${
        s(p, "title") ?? "the lesson"
      } yet — it is late.`,
    destination: () => "/admin/calendar",
  },


  homework_assigned: {
    kind: "homework_assigned",
    audiences: ["student"],
    icon: "book",
    tone: "info",
    title: () => "New homework",
    body: (p) => `${s(p, "title") ?? "Homework"} was assigned to you.`,
    destination: (p) => (s(p, "homeworkId") ? `/student/homework/${p.homeworkId}` : "/student/homework"),
  },

  homework_submitted: {
    kind: "homework_submitted",
    audiences: ["teacher", "admin"],
    icon: "book",
    tone: "success",
    title: () => "Homework submitted",
    body: (p) => `A student submitted ${s(p, "title") ?? "their homework"} — ready to review.`,
    destination: (p, role) =>
      role === "admin"
        ? "/admin/attention"
        : s(p, "lessonId")
          ? `/teacher/sessions/${p.lessonId}`
          : "/teacher/students",
  },

  homework_reviewed: {
    kind: "homework_reviewed",
    audiences: ["student"],
    icon: "book",
    tone: "success",
    title: () => "Homework reviewed",
    body: (p) => `Your teacher reviewed ${s(p, "title") ?? "your homework"}.`,
    destination: (p) => (s(p, "homeworkId") ? `/student/homework/${p.homeworkId}` : "/student/homework"),
  },

  booking_reminder: {
    kind: "booking_reminder",
    audiences: ["student"],
    icon: "calendar",
    tone: "info",
    title: () => "Your pause ended",
    body: () => "Your lessons are active again — book your next one.",
    destination: () => "/student/calendar",
  },

  makeup_credit_issued: {
    kind: "makeup_credit_issued",
    audiences: ["student"],
    icon: "check",
    tone: "success",
    title: () => "Make-up credit issued",
    body: () => "A make-up lesson was added to your balance.",
    destination: () => "/student/calendar",
  },

  student_assigned: {
    kind: "student_assigned",
    audiences: ["teacher"],
    icon: "users",
    tone: "success",
    title: () => "New student",
    body: (p) => `${s(p, "studentName") ?? "A student"} was assigned to you.`,
    destination: () => "/teacher/students",
  },

  student_unassigned: {
    kind: "student_unassigned",
    audiences: ["teacher"],
    icon: "users",
    tone: "info",
    title: () => "Student removed",
    body: (p) => `${s(p, "studentName") ?? "A student"} is no longer assigned to you.`,
    destination: () => "/teacher/students",
  },

  reschedule_request: {
    kind: "reschedule_request",
    audiences: ["admin", "teacher"],
    icon: "calendar",
    tone: "warning",
    title: () => "Reschedule requested",
    body: (p) =>
      p.reason === "teacher_reassigned"
        ? `${s(p, "studentName") ?? "A student"} has a new teacher — ${
            typeof p.lessonCount === "number" ? plural(p.lessonCount, "booked lesson") : "booked lessons"
          } still sit with the previous teacher. Move or cancel them.`
        : `${actor(s(p, "by"))} asked to move a lesson${s(p, "date") ? ` on ${fmtDate(s(p, "date"))}` : ""}.`,
    destination: () => "/admin/scheduling/requests",
  },

  reschedule_resolved: {
    kind: "reschedule_resolved",
    audiences: ["student", "teacher"],
    icon: "calendar",
    tone: "success",
    title: () => "Reschedule resolved",
    body: (p) => (p.approved ? "The reschedule was approved." : "The reschedule was declined."),
    destination: (_p, role) => (role === "teacher" ? "/teacher/calendar" : "/student/calendar"),
  },

  permission_request: {
    kind: "permission_request",
    audiences: ["admin"],
    icon: "alert",
    tone: "warning",
    title: () => "Permission request",
    body: (p) =>
      s(p, "reason") ??
      `${s(p, "teacherName") ?? "A teacher"} asked for permission${s(p, "action") ? `: ${s(p, "action")}` : ""}.`,
    destination: () => "/admin/attention",
  },

  permission_resolved: {
    kind: "permission_resolved",
    audiences: ["teacher"],
    validatePayload: (p) => (typeof p.approved === "boolean" ? [] : ["payload.approved must be a boolean"]),
    icon: "check",
    tone: "info",
    title: (p) => (p.approved ? "Request approved" : "Request declined"),
    body: (p) =>
      `The academy ${p.approved ? "approved" : "declined"} your request${s(p, "action") ? ` (${s(p, "action")})` : ""}.`,
    destination: () => "/teacher",
  },

  student_signup: {
    kind: "student_signup",
    audiences: ["admin"],
    icon: "users",
    tone: "info",
    title: () => "New student signed up",
    body: (p) =>
      `${s(p, "studentName") ?? "A new student"} completed onboarding${
        s(p, "goal") ? ` — goal: ${s(p, "goal")}` : ""
      }.`,
    destination: () => "/admin/students",
  },

  balance_expiring: {
    kind: "balance_expiring",
    audiences: ["student"],
    icon: "clock",
    tone: "warning",
    title: () => "Your lessons expire soon",
    body: (p) =>
      `${s(p, "lessons") ?? "Your lessons"} ${
        p.days === 3 ? "expire in 3 days" : "expire in 14 days"
      } — ${s(p, "expiresAt") ?? ""}. Schedule before they're gone.`,
    destination: () => "/student/billing",
  },

  session_published: {
    kind: "session_published",
    audiences: ["student"],
    icon: "book",
    tone: "success",
    title: () => "Lesson materials ready",
    body: (p) => {
      const homework = typeof p.homeworkCount === "number" ? p.homeworkCount : 0;
      return `${s(p, "title") ?? "Your lesson"} — summary, vocabulary and flashcards are up${
        homework > 0 ? `, plus ${homework === 1 ? "1 homework" : `${homework} homework tasks`}` : ""
      }.`;
    },
    destination: (p) => (s(p, "lessonId") ? `/student/lessons/${p.lessonId}` : "/student/lessons"),
  },


  billing_order_requested: {
    kind: "billing_order_requested",
    audiences: ["admin"],
    icon: "dollar",
    tone: "warning",
    validatePayload: (p) => ["studentName", "familyLabel", "planLabel", "currency"]
      .filter((key) => !s(p, key))
      .map((key) => `payload.${key} must be a non-empty string`),
    title: () => "New billing request",
    body: (p) => `${s(p, "studentName") ?? "A student"} requested ${s(p, "familyLabel")} · ${s(p, "planLabel")} — ${p.amount ?? "?"} ${s(p, "currency")}.`,
    destination: (p) => typeof p.orderId === "string" && p.orderId.length > 0 ? billingOrderAdminLink(p.orderId) : "/admin/billing?tab=commercial",
  },

  billing_order_rejected: {
    kind: "billing_order_rejected",
    audiences: ["student"],
    icon: "alert",
    tone: "danger",
    validatePayload: (p) => ["planLabel", "reason"]
      .filter((key) => !s(p, key))
      .map((key) => `payload.${key} must be a non-empty string`),
    title: () => "Order request not approved",
    body: (p) => `${s(p, "planLabel") ?? "Your request"} was not approved. ${s(p, "reason") ?? "Please contact the academy."}`,
    destination: () => "/student/billing",
  },

  payment_received: {
    kind: "payment_received",
    audiences: ["student", "admin"],
    icon: "dollar",
    tone: "success",
    title: (p) => (s(p, "studentName") ? "Payment received" : "Payment complete"),
    body: (p) =>
      s(p, "studentName")
        ? `${s(p, "studentName")} bought ${s(p, "packName") ?? "a pack"}${
            p.lessons ? ` — ${p.lessons} lesson${p.lessons === 1 ? "" : "s"}` : ""
          }.`
        : `${s(p, "packName") ?? "Your pack"} is paid for${
            p.lessons ? ` — ${p.lessons} lesson${p.lessons === 1 ? "" : "s"} added` : ""
          }${p.balanceAfter != null ? `. You now have ${p.balanceAfter}.` : "."}`,
    destination: (_p, role) => (role === "admin" ? "/admin/billing?tab=commercial" : "/student/billing"),
  },



  finance_entry_due: {
    kind: "finance_entry_due",
    audiences: ["admin"],
    icon: "dollar",
    tone: "warning",
    title: () => "Money to record",
    body: (p) =>
      `${s(p, "label") ?? "A recurring cost"} for ${s(p, "period") ?? "this period"} hasn't been entered${
        p.expectedAmount ? ` (usually ${p.expectedAmount} ${s(p, "currency") ?? ""})` : ""
      }.`,
    destination: () => "/admin/billing?tab=commercial",
  },

  salary_paid: {
    kind: "salary_paid",
    audiences: ["teacher"],
    icon: "dollar",
    tone: "success",
    title: () => "Payment sent",
    body: (p) =>
      `${p.amount ?? ""} ${s(p, "currency") ?? ""} for ${p.lessons ?? 0} lesson${
        p.lessons === 1 ? "" : "s"
      } in ${s(p, "month") ?? "this month"}.`,
    destination: () => "/teacher/profile",
  },

  achievement_unlocked: {
    kind: "achievement_unlocked",
    audiences: ["student"],
    icon: "award",
    tone: "success",
    title: () => "Achievement unlocked",
    body: (p) => s(p, "name") ?? "You earned a new achievement.",
    destination: () => "/student/achievements",
  },



  points_granted: {
    kind: "points_granted",
    audiences: ["student"],
    icon: "check",
    tone: "success",
    title: () => "Lessons added",
    body: (p) => `You received ${p.points ?? "?"} lesson${p.points === 1 ? "" : "s"}${s(p, "reason") ? ` — ${p.reason}` : ""}.`,
    destination: () => "/student/billing",
  },

  balance_low: {
    kind: "balance_low",
    audiences: ["student"],
    validatePayload: (p) => (p.balance === 0 || p.balance === 1 ? [] : ["payload.balance must be 0 or 1"]),
    icon: "dollar",
    tone: "warning",
    title: (p) => (p.balance === 0 ? "No lessons left" : "1 lesson left"),
    body: (p) =>
      p.balance === 0
        ? "You've booked your last lesson credit. Request more lessons to keep booking."
        : "You have 1 lesson credit left. Request more lessons so you can keep your rhythm.",
    destination: () => "/student/billing",
  },

  student_out_of_lessons: {
    kind: "student_out_of_lessons",
    audiences: ["admin"],
    validatePayload: (p) => (s(p, "studentName") ? [] : ["payload.studentName must be a non-empty string"]),
    icon: "alert",
    tone: "warning",
    title: () => "Student out of lessons",
    body: (p) => `${s(p, "studentName")} has no lessons left and nothing booked — time to reach out.`,
    destination: (p) => (s(p, "studentUserId") ? `/admin/students/${p.studentUserId}` : "/admin/students"),
  },

  student_no_show: {
    kind: "student_no_show",
    audiences: ["student"],
    icon: "alert",
    tone: "warning",
    title: () => "You missed a lesson",
    body: (p) =>
      `You missed your lesson ${at(p)}${p.charged === false ? "." : " — it was charged."} Book your next one so you don't lose momentum.`,
    destination: () => "/student/calendar",
  },

  teacher_assigned: {
    kind: "teacher_assigned",
    audiences: ["student"],
    validatePayload: (p) => (s(p, "teacherName") ? [] : ["payload.teacherName must be a non-empty string"]),
    icon: "users",
    tone: "success",
    title: () => "Your teacher",
    body: (p) => `${s(p, "teacherName")} is now your teacher.`,
    destination: () => "/student/calendar",
  },

  student_paused: {
    kind: "student_paused",
    audiences: ["teacher", "admin"],
    validatePayload: (p) => (s(p, "studentName") ? [] : ["payload.studentName must be a non-empty string"]),
    icon: "clock",
    tone: "info",
    title: () => "Student paused",
    body: (p) =>
      `${s(p, "studentName")} paused lessons${s(p, "untilDate") ? ` until ${fmtDate(s(p, "untilDate"))}` : ""}. Their booked lessons stay as they are.`,
    destination: (_p, role) => (role === "admin" ? "/admin/students" : "/teacher/students"),
  },

  time_off_approved: {
    kind: "time_off_approved",
    audiences: ["teacher"],
    icon: "check",
    tone: "success",
    title: () => "Time off approved",
    body: (p) => `The academy approved your time off (${s(p, "fromDate") ?? ""} → ${s(p, "toDate") ?? ""}).`,
    destination: () => "/teacher/calendar",
  },

  homework_due: {
    kind: "homework_due",
    audiences: ["student"],
    icon: "book",
    tone: "info",
    title: () => "Homework due soon",
    body: (p) => `“${s(p, "title") ?? "Your homework"}” is due within 24 hours.`,
    destination: (p) => (s(p, "homeworkId") ? `/student/homework/${p.homeworkId}` : "/student/homework"),
  },

  daily_agenda: {
    kind: "daily_agenda",
    audiences: ["teacher"],
    icon: "calendar",
    tone: "info",
    title: (p) => {
      const n = Array.isArray(p.lessons) ? p.lessons.length : 0;
      return n > 0 ? `Today: ${plural(n, "lesson")}` : "Today: no lessons";
    },
    body: (p) => {
      const rows = Array.isArray(p.lessons)
        ? (p.lessons as { startTime?: string; studentName?: string }[]).map((row) => `${row.startTime ?? "?"} ${row.studentName ?? ""}`.trim())
        : [];
      const todo = [
        typeof p.toPublish === "number" && p.toPublish > 0 ? `${plural(p.toPublish, "lesson")} to publish` : "",
        typeof p.toReview === "number" && p.toReview > 0 ? `${p.toReview} homework to review` : "",
      ].filter(Boolean);
      return [rows.length ? rows.join(" · ") : "", todo.length ? `Still to do: ${todo.join(", ")}.` : ""]
        .filter(Boolean)
        .join("\n");
    },
    destination: () => "/teacher/calendar",
  },

  study_reminder: {
    kind: "study_reminder",
    audiences: ["student"],
    validatePayload: (p) => (typeof p.dueCards === "number" && p.dueCards > 0 ? [] : ["payload.dueCards must be a positive number"]),
    icon: "book",
    tone: "info",
    title: () => "Words to review",
    body: (p) => {
      const streak = typeof p.streak === "number" ? p.streak : 0;
      return `${plural(Number(p.dueCards), "word")} to review today — a few minutes is enough.${
        streak > 1 ? ` Keep your ${streak}-day streak going.` : ""
      }`;
    },
    destination: () => "/student/study",
  },

};

// ── in-app view (the bell) ──────────────────────────────────────────
export interface NotifView {
  title: string;
  body: string;
  icon: string;
  tone: NotifTone;
}

export function notificationView(kind: string, payload: Payload | null | undefined): NotifView {
  const contract = NOTIFICATION_CONTRACTS[kind as NotificationKind];
  const p = payload ?? {};
  if (!contract) {
    return {
      title: kind.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      body: typeof p.reason === "string" ? p.reason : "",
      icon: "bell",
      tone: "info",
    };
  }
  return { title: contract.title(p), body: contract.body(p), icon: contract.icon, tone: contract.tone };
}

/**
 * Validates a new notification write against the same registry used by every
 * presentation surface. Historical rows remain readable via `notificationView`
 * even when they pre-date these write-time requirements.
 */
export function notificationContractIssues(
  kind: string,
  payload: Payload | null | undefined,
  role: NotifRole
): string[] {
  const contract = NOTIFICATION_CONTRACTS[kind as NotificationKind];
  if (!contract) return [`unknown notification kind ${kind}`];
  const issues: string[] = [];
  if (!contract.audiences.includes(role)) {
    issues.push(`recipient role ${role} is not allowed`);
  }
  issues.push(...(contract.validatePayload?.(payload ?? {}) ?? []));
  return issues;
}

// ── role-aware destination ──────────────────────────────────────────
export function notificationDestination(
  kind: string,
  payload: Payload | null | undefined,
  storedLink?: string,
  role: NotifRole = "student"
): string | undefined {
  const orderId = payload && typeof payload === "object"
    ? ("orderId" in payload ? payload.orderId : "billingOrderId" in payload ? payload.billingOrderId : undefined)
    : undefined;
  const adminBillingKinds = new Set(["billing_order_requested", "billing_order_rejected", "payment_received", "finance_entry_due"]);
  if (role === "admin" && adminBillingKinds.has(kind)) {
    return typeof orderId === "string" && orderId.length > 0
      ? billingOrderAdminLink(orderId)
      : "/admin/billing?tab=commercial";
  }
  if (storedLink) return storedLink;
  const contract = NOTIFICATION_CONTRACTS[kind as NotificationKind];
  if (!contract || !contract.audiences.includes(role)) return undefined;
  return contract.destination(payload ?? {}, role);
}

// Keyed by every stored kind so retired rows keep their translated title.
const LOCALIZED_TITLES: Record<"ru" | "ar" | "kk", Partial<Record<string, string>>> = {
  ru: {
    meeting_room_changed: "Комната урока обновлена",
    lesson_assigned: "Урок забронирован", one_time_lesson_started: "Разовый урок начался",
    teacher_time_off: "Отсутствие преподавателя", lesson_cancelled: "Урок отменён",
    lesson_rescheduled: "Урок перенесён", session_reminder: "Скоро урок",
    teacher_late_start: "Преподаватель не начал урок", teacher_no_show: "Преподаватель не пришёл", unscheduled_session: "Урок вне расписания",
    homework_assigned: "Новое домашнее задание", homework_submitted: "Домашнее задание отправлено",
    homework_reviewed: "Домашнее задание проверено",
    makeup_credit_issued: "Добавлен компенсационный урок", student_assigned: "Новый ученик",
    student_unassigned: "Ученик больше не закреплён", reschedule_request: "Запрошен перенос",
    reschedule_resolved: "Запрос на перенос решён", permission_request: "Запрос доступа",
    session_published: "Материалы урока готовы", lessons_requested: "Запрошены уроки",
    billing_order_requested: "Новый запрос на оплату", billing_order_rejected: "Запрос не одобрен",
    payment_received: "Платёж получен", payment_refunded: "Платёж возвращён",
    payment_failed: "Не удалось применить платёж", finance_entry_due: "Нужно внести расход",
    salary_paid: "Оплата отправлена", achievement_unlocked: "Новое достижение",
    invoice: "Счёт", impersonation: "Сессия администратора", points_granted: "Уроки добавлены",
    points_refunded: "Урок возвращён", student_signup: "Новый ученик зарегистрировался",
    balance_expiring: "Уроки скоро истекают",
    permission_resolved: "Решение по запросу", student_no_show: "Вы пропустили урок",
    teacher_assigned: "Ваш преподаватель", student_paused: "Ученик на паузе",
    balance_low: "Заканчиваются уроки", student_out_of_lessons: "У ученика закончились уроки",
    homework_due: "Скоро срок сдачи ДЗ", daily_agenda: "План на сегодня",
    study_reminder: "Слова на повторение", time_off_approved: "Отпуск одобрен",
    booking_reminder: "Пауза закончилась",
  },
  ar: {
    meeting_room_changed: "تم تحديث غرفة الدرس",
    lesson_assigned: "تم حجز الدرس", one_time_lesson_started: "بدأ الدرس الفردي",
    teacher_time_off: "إجازة المدرس", lesson_cancelled: "تم إلغاء الدرس",
    lesson_rescheduled: "تم تغيير موعد الدرس", session_reminder: "الدرس قريباً",
    teacher_late_start: "لم يبدأ المدرس الدرس", teacher_no_show: "لم يحضر المدرس", unscheduled_session: "درس خارج الجدول",
    homework_assigned: "واجب منزلي جديد", homework_submitted: "تم إرسال الواجب المنزلي",
    homework_reviewed: "تمت مراجعة الواجب المنزلي",
    makeup_credit_issued: "تمت إضافة درس تعويضي", student_assigned: "طالب جديد",
    student_unassigned: "لم يعد الطالب مخصصاً لك", reschedule_request: "طلب تغيير الموعد",
    reschedule_resolved: "تم حل طلب تغيير الموعد", permission_request: "طلب صلاحية",
    session_published: "مواد الدرس جاهزة", lessons_requested: "تم طلب دروس",
    billing_order_requested: "طلب دفع جديد", billing_order_rejected: "لم تتم الموافقة على طلب الخطة",
    payment_received: "تم استلام الدفع", payment_refunded: "تم رد الدفع",
    payment_failed: "تعذر تسجيل الدفع", finance_entry_due: "يوجد مصروف يحتاج إلى تسجيل",
    salary_paid: "تم إرسال الدفعة", achievement_unlocked: "إنجاز جديد",
    invoice: "فاتورة", impersonation: "جلسة مسؤول", points_granted: "تمت إضافة دروس",
    points_refunded: "تم إرجاع درس", student_signup: "سجّل طالب جديد",
    balance_expiring: "دروسك على وشك الانتهاء",
    permission_resolved: "تم البت في الطلب", student_no_show: "فاتك درس",
    teacher_assigned: "مدرسك", student_paused: "الطالب في استراحة",
    balance_low: "دروسك على وشك النفاد", student_out_of_lessons: "نفدت دروس الطالب",
    homework_due: "موعد تسليم الواجب قريب", daily_agenda: "جدول اليوم",
    study_reminder: "كلمات للمراجعة", time_off_approved: "تمت الموافقة على الإجازة",
    booking_reminder: "انتهت فترة الإيقاف",
  },
  kk: {
    meeting_room_changed: "Сабақ бөлмесі жаңартылды",
    lesson_assigned: "Сабақ брондалды", one_time_lesson_started: "Жеке сабақ басталды",
    teacher_time_off: "Мұғалімнің демалысы", lesson_cancelled: "Сабақ тоқтатылды",
    lesson_rescheduled: "Сабақ уақыты өзгертілді", session_reminder: "Сабақ жақындады",
    teacher_late_start: "Мұғалім сабақты бастамады", teacher_no_show: "Мұғалім сабаққа келмеді", unscheduled_session: "Кестеден тыс сабақ",
    homework_assigned: "Жаңа үй тапсырмасы", homework_submitted: "Үй тапсырмасы жіберілді",
    homework_reviewed: "Үй тапсырмасы тексерілді",
    makeup_credit_issued: "Өтем сабағы қосылды", student_assigned: "Жаңа оқушы",
    student_unassigned: "Оқушы сізге енді бекітілмеді", reschedule_request: "Ауыстыру сұралды",
    reschedule_resolved: "Ауыстыру сұрауы шешілді", permission_request: "Қолжетімділік сұрауы",
    session_published: "Сабақ материалдары дайын", lessons_requested: "Сабақтар сұралды",
    billing_order_requested: "Жаңа төлем сұранысы", billing_order_rejected: "Жоспарға өтінім мақұлданбады",
    payment_received: "Төлем алынды", payment_refunded: "Төлем қайтарылды",
    payment_failed: "Төлемді қолдану мүмкін болмады", finance_entry_due: "Шығынды енгізу керек",
    salary_paid: "Төлем жіберілді", achievement_unlocked: "Жаңа жетістік",
    invoice: "Шот", impersonation: "Әкімші сессиясы", points_granted: "Сабақтар қосылды",
    points_refunded: "Сабақ қайтарылды", student_signup: "Жаңа оқушы тіркелді",
    balance_expiring: "Сабақтарыңыздың мерзімі жақында бітеді",
    permission_resolved: "Сұрау бойынша шешім", student_no_show: "Сабақты өткізіп алдыңыз",
    teacher_assigned: "Сіздің мұғаліміңіз", student_paused: "Оқушы үзіліс алды",
    balance_low: "Сабақтар таусылып жатыр", student_out_of_lessons: "Оқушының сабақтары таусылды",
    homework_due: "Үй тапсырмасының мерзімі жақын", daily_agenda: "Бүгінгі жоспар",
    study_reminder: "Қайталайтын сөздер", time_off_approved: "Демалыс мақұлданды",
    booking_reminder: "Үзіліс аяқталды",
  },
};

// Student-facing copy for the kinds students most need to understand in their
// own language. Dates stay in the shared compact format.
const STUDENT_PHRASES = {
  ru: {
    charged: "списан",
    teacherOne: (when: string) => `Преподаватель не сможет провести урок ${when} и отменил его. Урок возвращён на ваш баланс.`,
    teacherMany: (list: string) => `Преподаватель отменил уроки, которые не сможет провести: ${list}. Все они возвращены на ваш баланс.`,
    forYouOne: (when: string) => `Преподаватель отменил урок ${when} по вашей просьбе.`,
    free: "Отмена бесплатная — урок возвращён на баланс.",
    late: "До урока оставалось меньше 6 часов, поэтому урок списан.",
    quota: "Бесплатные отмены в этом месяце уже использованы, поэтому урок списан.",
    forYouMany: (list: string, back: number, charged: number) => `Преподаватель отменил уроки по вашей просьбе: ${list}. Возвращено: ${back}, списано: ${charged}.`,
    academyOne: (when: string) => `Академия отменила урок ${when}. Урок возвращён на ваш баланс.`,
    academyMany: (list: string) => `Академия отменила уроки: ${list}. Все они возвращены на ваш баланс.`,
    empty: "Вы забронировали последний оплаченный урок. Запросите новые уроки, чтобы продолжать бронировать.",
    oneLeft: "У вас остался 1 урок. Запросите новые уроки, чтобы не терять ритм.",
    noShow: (when: string, charged: boolean) => `Вы пропустили урок ${when}${charged ? " — урок списан." : "."} Забронируйте следующий, чтобы не терять темп.`,
    newTeacher: (name: string) => `${name} — теперь ваш преподаватель.`,
    homeworkDue: (title: string) => `Срок сдачи «${title}» — в ближайшие 24 часа.`,
    study: (n: number, streak: number) => `Слов на повторение сегодня: ${n}. Хватит нескольких минут.${streak > 1 ? ` Не прерывайте серию: ${streak} дн.` : ""}`,
    published: (name: string, hw: number) => `${name}: материалы готовы — конспект, слова и карточки${hw > 0 ? `, а также домашнее задание (${hw})` : ""}.`,
    pauseEnded: "Ваши уроки снова активны — забронируйте следующий.",
  },
  ar: {
    charged: "محتسب",
    teacherOne: (when: string) => `لن يتمكن مدرسك من حضور درس ${when} وقام بإلغائه. تمت إعادة الدرس إلى رصيدك.`,
    teacherMany: (list: string) => `ألغى مدرسك دروسًا لن يتمكن من حضورها: ${list}. تمت إعادتها جميعًا إلى رصيدك.`,
    forYouOne: (when: string) => `ألغى مدرسك درس ${when} بناءً على طلبك.`,
    free: "الإلغاء مجاني — عاد الدرس إلى رصيدك.",
    late: "كان الإلغاء قبل أقل من 6 ساعات من الدرس، لذلك تم احتسابه.",
    quota: "لقد استخدمت الإلغاءات المجانية لهذا الشهر، لذلك تم احتساب الدرس.",
    forYouMany: (list: string, back: number, charged: number) => `ألغى مدرسك الدروس التالية بناءً على طلبك: ${list}. أُعيد: ${back}، احتُسب: ${charged}.`,
    academyOne: (when: string) => `ألغت الأكاديمية درس ${when}. تمت إعادة الدرس إلى رصيدك.`,
    academyMany: (list: string) => `ألغت الأكاديمية الدروس: ${list}. تمت إعادتها جميعًا إلى رصيدك.`,
    empty: "لقد حجزت آخر درس في رصيدك. اطلب دروسًا جديدة لتواصل الحجز.",
    oneLeft: "تبقى لديك درس واحد. اطلب دروسًا جديدة لتحافظ على وتيرتك.",
    noShow: (when: string, charged: boolean) => `فاتك درس ${when}${charged ? " — وتم احتسابه." : "."} احجز درسك التالي حتى لا تفقد الحماس.`,
    newTeacher: (name: string) => `${name} هو مدرسك الآن.`,
    homeworkDue: (title: string) => `موعد تسليم «${title}» خلال 24 ساعة.`,
    study: (n: number, streak: number) => `كلمات للمراجعة اليوم: ${n}. بضع دقائق تكفي.${streak > 1 ? ` حافظ على سلسلتك: ${streak} يومًا.` : ""}`,
    published: (name: string, hw: number) => `${name}: المواد جاهزة — الملخص والمفردات والبطاقات${hw > 0 ? ` بالإضافة إلى واجب منزلي (${hw})` : ""}.`,
    pauseEnded: "دروسك نشطة مرة أخرى — احجز درسك التالي.",
  },
  kk: {
    charged: "есептен шығарылды",
    teacherOne: (when: string) => `Мұғалім ${when} сабағын өткізе алмайды, сондықтан оны тоқтатты. Сабақ балансыңызға қайтарылды.`,
    teacherMany: (list: string) => `Мұғалім өткізе алмайтын сабақтарын тоқтатты: ${list}. Барлығы балансыңызға қайтарылды.`,
    forYouOne: (when: string) => `Мұғалім сіздің өтінішіңіз бойынша ${when} сабағын тоқтатты.`,
    free: "Тоқтату тегін — сабақ балансыңызға қайтарылды.",
    late: "Сабаққа 6 сағаттан аз қалғандықтан, сабақ есептен шығарылды.",
    quota: "Осы айдағы тегін тоқтатулар таусылғандықтан, сабақ есептен шығарылды.",
    forYouMany: (list: string, back: number, charged: number) => `Мұғалім сіздің өтінішіңіз бойынша сабақтарды тоқтатты: ${list}. Қайтарылды: ${back}, есептен шығарылды: ${charged}.`,
    academyOne: (when: string) => `Академия ${when} сабағын тоқтатты. Сабақ балансыңызға қайтарылды.`,
    academyMany: (list: string) => `Академия сабақтарды тоқтатты: ${list}. Барлығы балансыңызға қайтарылды.`,
    empty: "Сіз соңғы сабағыңызды брондадыңыз. Брондауды жалғастыру үшін жаңа сабақтар сұраңыз.",
    oneLeft: "Сізде 1 сабақ қалды. Ырғақты жоғалтпау үшін жаңа сабақтар сұраңыз.",
    noShow: (when: string, charged: boolean) => `Сіз ${when} сабағын өткізіп алдыңыз${charged ? " — сабақ есептен шығарылды." : "."} Келесі сабақты брондаңыз.`,
    newTeacher: (name: string) => `${name} енді сіздің мұғаліміңіз.`,
    homeworkDue: (title: string) => `«${title}» тапсырмасының мерзімі 24 сағат ішінде бітеді.`,
    study: (n: number, streak: number) => `Бүгін қайталайтын сөздер: ${n}. Бірнеше минут жеткілікті.${streak > 1 ? ` Сериясын үзбеңіз: ${streak} күн.` : ""}`,
    published: (name: string, hw: number) => `${name}: материалдар дайын — конспект, сөздер және карточкалар${hw > 0 ? `, сондай-ақ үй тапсырмасы (${hw})` : ""}.`,
    pauseEnded: "Сабақтарыңыз қайта белсенді — келесі сабақты брондаңыз.",
  },
};

function localizedStudentBody(kind: string, p: Payload, locale: "ru" | "ar" | "kk"): string | undefined {
  const t = STUDENT_PHRASES[locale];
  switch (kind) {
    case "lesson_cancelled": {
      if (p.audience !== "student" || !p.for) return undefined;
      const lessons = lessonRefs(p);
      const charged = lessons.filter((row) => row.charged).length;
      const list = lessons
        .slice(0, 5)
        .map((row) => `${at({ date: row.date, startTime: row.startTime })}${p.for === "student" && row.charged ? ` (${t.charged})` : ""}`)
        .join(", ") + (lessons.length > 5 ? ` +${lessons.length - 5}` : "");
      const one = lessons.length === 1 ? lessons[0] : undefined;
      if (p.for === "teacher") return one ? t.teacherOne(at(one)) : t.teacherMany(list);
      if (p.for === "student") {
        if (!one) return t.forYouMany(list, lessons.length - charged, charged);
        return `${t.forYouOne(at(one))} ${one.charged ? (p.chargeReason === "quota" ? t.quota : t.late) : t.free}`;
      }
      return one ? t.academyOne(at(one)) : t.academyMany(list);
    }
    case "balance_low":
      return p.balance === 0 ? t.empty : t.oneLeft;
    case "student_no_show":
      return t.noShow(at(p), p.charged !== false);
    case "teacher_assigned":
      return s(p, "teacherName") ? t.newTeacher(s(p, "teacherName")!) : undefined;
    case "homework_due":
      return t.homeworkDue(s(p, "title") ?? "—");
    case "study_reminder":
      return t.study(Number(p.dueCards) || 0, typeof p.streak === "number" ? p.streak : 0);
    case "session_published":
      return t.published(s(p, "title") ?? "—", typeof p.homeworkCount === "number" ? p.homeworkCount : 0);
    case "booking_reminder":
      return t.pauseEnded;
    default:
      return undefined;
  }
}

/** Render deterministic native-language copy for Telegram; English remains canonical. */
export function notificationViewForLocale(
  kind: string,
  payload: Payload | null | undefined,
  locale: NotificationLocale
): NotifView {
  const english = notificationView(kind, payload);
  if (locale === "en") return english;
  const title = LOCALIZED_TITLES[locale][kind] ?? english.title;
  const p = payload ?? {};
  const name = s(p, "title") ?? s(p, "studentName") ?? s(p, "teacherName") ?? "";
  const localizedBody = localizedStudentBody(kind, p, locale) ?? (locale === "ru"
    ? ({
        meeting_room_changed: "Преподаватель изменил комнату. Нажмите «Присоединиться к уроку», чтобы открыть актуальную ссылку.",
        session_reminder: `${name || "Ваш урок"} — ${at(p)}.`,
        homework_assigned: `${name || "Домашнее задание"} назначено вам.`,
        homework_reviewed: `Ваш преподаватель проверил: ${name || "домашнее задание"}.`,
        lesson_assigned: lessonCount(p) > 1 ? `Запланировано уроков: ${lessonCount(p)}, первый — ${at(p)}.` : `Ваш урок запланирован: ${at(p)}.`,
        lesson_cancelled: `Урок отменён: ${at(p)}.`,
        lesson_rescheduled: `Новый срок урока: ${at(p, "toDate", "toTime")}.`,
        teacher_late_start: `${s(p, "teacherName") || "Преподаватель"} ещё не начал урок «${s(p, "title") || "урок"}» — начало задерживается.`,
        teacher_no_show: `${s(p, "teacherName") || "Преподаватель"} не пришёл на урок «${s(p, "title") || "урок"}».${p.refunded ? " Кредит за урок возвращён." : ""}`,
        session_published: `${name || "Ваш урок"}: материалы готовы.`,
        billing_order_requested: `${s(p, "familyLabel") || "План"} · ${s(p, "planLabel") || "план"} запрошен.`,
        billing_order_rejected: `${s(p, "planLabel") || "Заявка"} не одобрена. ${s(p, "reason") || "Свяжитесь с академией."}`,
        payment_received: `${name || "Платёж"} успешно обработан.`,
        payment_refunded: `Платёж возвращён: ${name || "заказ"}.`,
        points_granted: `Вам добавлено уроков: ${p.points ?? "?"}.`,
        points_refunded: "Урок возвращён на ваш баланс.",
      } as Partial<Record<string, string>>)[kind]
    : locale === "ar"
      ? ({
          session_reminder: `${name || "درسك"} — ${at(p)}.`,
          homework_assigned: `تم تعيين ${name || "الواجب المنزلي"} لك.`,
          homework_reviewed: `راجع المدرس ${name || "واجبك المنزلي"}.`,
          lesson_assigned: lessonCount(p) > 1 ? `تم تحديد ${lessonCount(p)} دروس، أولها ${at(p)}.` : `تم تحديد موعد درسك: ${at(p)}.`,
          lesson_cancelled: `تم إلغاء الدرس: ${at(p)}.`,
          lesson_rescheduled: `موعد الدرس الجديد: ${at(p, "toDate", "toTime")}.`,
          meeting_room_changed: "غيّر مدرسك غرفة الاجتماع. اضغط على الانضمام للدرس لفتح الغرفة الحالية.",
          teacher_late_start: `${s(p, "teacherName") || "المدرس"} لم يبدأ درس «${s(p, "title") || "الدرس"}» بعد — الدرس متأخر.`,
          teacher_no_show: `${s(p, "teacherName") || "المدرس"} لم يحضر درس «${s(p, "title") || "الدرس"}».${p.refunded ? " تمت إعادة رصيد الدرس." : ""}`,
          session_published: `${name || "درسك"}: المواد جاهزة.`,
          billing_order_requested: `تم طلب ${s(p, "familyLabel") || "الخطة"} · ${s(p, "planLabel") || "الخطة"}.`,
          billing_order_rejected: `لم تتم الموافقة على ${s(p, "planLabel") || "طلبك"}. ${s(p, "reason") || "يرجى التواصل مع الأكاديمية."}`,
          payment_received: `تم تسجيل ${name || "الدفع"} بنجاح.`,
          payment_refunded: `تم رد الدفع: ${name || "الطلب"}.`,
          points_granted: `تمت إضافة دروس إلى رصيدك: ${p.points ?? "؟"}.`,
          points_refunded: "تم إرجاع درس إلى رصيدك.",
        } as Partial<Record<string, string>>)[kind]
      : ({
          session_reminder: `${name || "Сабағыңыз"} — ${at(p)}.`,
          homework_assigned: `${name || "Үй тапсырмасы"} сізге тағайындалды.`,
          homework_reviewed: `Мұғалім ${name || "үй тапсырмаңызды"} тексерді.`,
          lesson_assigned: lessonCount(p) > 1 ? `${lessonCount(p)} сабақ жоспарланды, біріншісі — ${at(p)}.` : `Сабағыңыз жоспарланды: ${at(p)}.`,
          lesson_cancelled: `Сабақ тоқтатылды: ${at(p)}.`,
          lesson_rescheduled: `Сабақтың жаңа уақыты: ${at(p, "toDate", "toTime")}.`,
          meeting_room_changed: "Мұғалім кездесу бөлмесін өзгертті. Ағымдағы бөлмені ашу үшін сабаққа қосылуды басыңыз.",
          teacher_late_start: `${s(p, "teacherName") || "Мұғалім"} «${s(p, "title") || "сабақ"}» әлі басталмады — сабақ кешігіп жатыр.`,
          teacher_no_show: `${s(p, "teacherName") || "Мұғалім"} «${s(p, "title") || "сабаққа"}» келмеді.${p.refunded ? " Сабақ балансыңыз қайтарылды." : ""}`,
          session_published: `${name || "Сабағыңыз"}: материалдар дайын.`,
          billing_order_requested: `${s(p, "familyLabel") || "Жоспар"} · ${s(p, "planLabel") || "жоспар"} сұралды.`,
          billing_order_rejected: `${s(p, "planLabel") || "Өтінім"} мақұлданбады. ${s(p, "reason") || "Академиямен байланысыңыз."}`,
          payment_received: `${name || "Төлем"} сәтті өңделді.`,
          payment_refunded: `Төлем қайтарылды: ${name || "тапсырыс"}.`,
          points_granted: `Балансыңызға сабақ қосылды: ${p.points ?? "?"}.`,
          points_refunded: "Сабақ балансыңызға қайтарылды.",
        } as Partial<Record<string, string>>)[kind]);
  return { ...english, title, body: localizedBody ?? english.body };
}

// ── Telegram composition ────────────────────────────────────────────
export interface TelegramMessage {
  text: string;
  buttonUrl?: string;
  buttonLabel?: string;
}

export function telegramMessage(
  kind: string,
  payload: Payload | null | undefined,
  link?: string,
  role: NotifRole = "student",
  locale: NotificationLocale = "en"
): TelegramMessage {
  const view = notificationViewForLocale(kind, payload, locale);
  const p = payload ?? {};
  const meetLink = s(p, "googleMeetLink");
  const eventId = s(p, "eventId");
  const joinPath = eventId ? `/join/${eventId}` : undefined;
  const lines = [`🔔 ${view.title}`, view.body];
  if (locale !== "en") {
    const english = notificationView(kind, payload);
    lines.push("", "English", `🔔 ${english.title}`, english.body);
  }
  if (meetLink && !joinPath) lines.push(`\nJoin meeting: ${meetLink}`);
  const buttonUrl = (role !== "admin" && meetLink && joinPath) || link || notificationDestination(kind, payload, undefined, role);
  return {
    text: lines.filter(Boolean).join("\n"),
    buttonUrl,
    buttonLabel: meetLink ? "Open lesson" : "Open Omnica English",
  };
}

/** Compact name used by reminder copy when only an ID is known. */
export const notificationName = firstWord;