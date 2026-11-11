import assert from "node:assert/strict";
import test from "node:test";
import { cancelRoles } from "../convex/lib/policy.ts";
import {
  notificationContractIssues,
  notificationView,
  notificationViewForLocale,
  RETIRED_NOTIFICATION_KINDS,
  STORED_NOTIFICATION_KINDS,
} from "../convex/lib/notificationRegistry.ts";

// FaFo 2026-11-11: a teacher cancels either because they can't teach, or
// because the student asked (on WhatsApp) — the second must apply the
// student's rules and count as the student's cancellation, not the teacher's.
test("teacher cancelling for the student uses student rules and records the student", () => {
  assert.deepEqual(cancelRoles("teacher", "student"), {
    cancelFor: "student",
    verdictActor: "student",
    cancelledBy: "student",
    onBehalfBy: "teacher",
  });
  assert.deepEqual(cancelRoles("teacher"), {
    cancelFor: "teacher",
    verdictActor: "teacher",
    cancelledBy: "teacher",
  });
  // A teacher can't cancel "as the academy" to dodge their own record.
  assert.equal(cancelRoles("teacher", "academy").cancelledBy, "teacher");
  // Students always cancel for themselves.
  assert.equal(cancelRoles("student", "teacher").cancelledBy, "student");
  // Admin "teacher can't make it" still lands on the teacher's record.
  assert.equal(cancelRoles("admin", "teacher").cancelledBy, "teacher");
  assert.equal(cancelRoles("admin").cancelledBy, "admin");
});

const lessons = [
  { date: "2026-09-10", startTime: "15:00", charged: false },
  { date: "2026-09-12", startTime: "15:00", charged: false },
];

test("the student hears whether the teacher couldn't make it or cancelled at their request", () => {
  const teacherCant = notificationView("lesson_cancelled", { audience: "student", by: "teacher", for: "teacher", lessons: [lessons[0]] });
  assert.match(teacherCant.body, /can't make it/);
  assert.match(teacherCant.body, /returned to your balance/);

  const asked = notificationView("lesson_cancelled", {
    audience: "student", by: "teacher", for: "student",
    lessons: [{ ...lessons[0], charged: true }], chargeReason: "late",
  });
  assert.match(asked.body, /for you, as you asked/);
  assert.match(asked.body, /less than 6 hours/);

  const quota = notificationView("lesson_cancelled", {
    audience: "student", by: "teacher", for: "student",
    lessons: [{ ...lessons[0], charged: true }], chargeReason: "quota",
  });
  assert.match(quota.body, /free cancellations/);
});

test("a batch of cancellations is one notice listing every lesson", () => {
  const view = notificationView("lesson_cancelled", { audience: "student", by: "teacher", for: "teacher", lessons });
  assert.match(view.title, /lessons/);
  assert.match(view.body, /2 lessons/);
  const ru = notificationViewForLocale("lesson_cancelled", { audience: "student", by: "teacher", for: "teacher", lessons }, "ru");
  assert.match(ru.body, /не сможет провести/);
});

test("new cancellation writes must say who it is for", () => {
  assert.deepEqual(
    notificationContractIssues("lesson_cancelled", { audience: "student", by: "teacher", for: "teacher", lessons }, "student"),
    [],
  );
  assert.ok(
    notificationContractIssues("lesson_cancelled", { by: "teacher", date: "2026-09-10", startTime: "15:00" }, "student").length > 0,
  );
  // Rows written before reasons existed still render.
  assert.match(
    notificationView("lesson_cancelled", { by: "teacher", date: "2026-09-10", startTime: "15:00", charged: false }).body,
    /cancelled the lesson/,
  );
});

test("retired kinds stay storable but can no longer be written", () => {
  for (const kind of RETIRED_NOTIFICATION_KINDS) {
    assert.ok(STORED_NOTIFICATION_KINDS.includes(kind));
    assert.ok(notificationContractIssues(kind, {}, "admin").length > 0);
  }
});
