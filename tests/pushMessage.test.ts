import test from "node:test";
import assert from "node:assert/strict";
import { pushMessage } from "../convex/lib/notificationRegistry.ts";

// A tap on a lesson reminder must land on the join page, never on a raw Meet
// URL or an off-site link — the service worker opens whatever path it gets.
test("push: lesson reminder opens the join page in the student's language", () => {
  const message = pushMessage(
    "session_reminder",
    { title: "Conversation", eventId: "ev_1", googleMeetLink: "https://meet.google.com/x", date: "2026-11-20", startTime: "18:00", when: "1h" },
    "/student/calendar?event=ev_1",
    "student",
    "ru"
  );
  assert.equal(message.url, "/join/ev_1");
  assert.match(message.title + message.body, /[а-яА-Я]/);
});

test("push: admins and off-site links never get a join page or external URL", () => {
  const admin = pushMessage(
    "session_reminder",
    { title: "Conversation", eventId: "ev_1", googleMeetLink: "https://meet.google.com/x" },
    "/admin/calendar",
    "admin",
    "en"
  );
  assert.equal(admin.url, "/admin/calendar");
  const external = pushMessage("homework_assigned", { title: "Read" }, "https://evil.example/x", "student", "en");
  assert.ok(external.url.startsWith("/"));
});
