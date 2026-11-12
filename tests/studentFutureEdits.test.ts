import assert from "node:assert/strict";
import test from "node:test";
import { cancelVerdict, rescheduleVerdict, resolvePolicy, POLICY_DEFAULTS } from "../convex/lib/policy";

const now = new Date("2026-10-08T05:00:00Z");
const event = { date: "2027-10-08", startTime: "10:00", status: "scheduled" };
test("students can cancel and move lessons a year away; teacher horizon remains", () => {
  const common = { event, now, orgTz: "Asia/Almaty", policy: POLICY_DEFAULTS };
  const cancel = cancelVerdict({ ...common, actor: "student", studentRecentFreeCancels: 0, isFirstLessonWithStudent: false });
  assert.equal(cancel.allowed, true);
  assert.equal(cancel.refund, true);
  assert.equal(rescheduleVerdict({ ...common, actor: "student" }).allowed, true);
  assert.equal(rescheduleVerdict({ ...common, actor: "teacher" }).allowed, false);
});
test("unlimited student horizon preserves cancellation quota and late move charges", () => {
  const common = { event, now, orgTz: "Asia/Almaty", actor: "student" as const, policy: POLICY_DEFAULTS };
  assert.equal(cancelVerdict({ ...common, studentRecentFreeCancels: 2, isFirstLessonWithStudent: false }).refund, false);
  assert.equal(rescheduleVerdict({ ...common, event: { ...event, date: "2026-10-08", startTime: "12:00" } }).chargesLesson, true);
  assert.equal(rescheduleVerdict({ ...common, event: { ...event, date: "2026-10-08", startTime: "09:00" } }).allowed, false);
});
test("admin policy settings change the verdict; invalid stored values fall back", () => {
  // Lesson at 15:00 Almaty, now 10:00 Almaty → 5h notice.
  const soon = { ...event, date: "2026-10-08", startTime: "15:00" };
  const common = { event: soon, now, orgTz: "Asia/Almaty", actor: "student" as const, studentRecentFreeCancels: 0, isFirstLessonWithStudent: false };
  assert.equal(cancelVerdict({ ...common, policy: POLICY_DEFAULTS }).refund, false);
  assert.equal(cancelVerdict({ ...common, policy: resolvePolicy({ studentCancelNoticeHours: 4 }) }).refund, true);
  const bad = resolvePolicy({ studentCancelNoticeHours: 600, pauseMaxDays: 2.5, unknown: 1 });
  assert.equal(bad.studentCancelNoticeHours, POLICY_DEFAULTS.studentCancelNoticeHours);
  assert.equal(bad.pauseMaxDays, POLICY_DEFAULTS.pauseMaxDays);
});
