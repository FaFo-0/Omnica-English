import assert from "node:assert/strict";
import test from "node:test";
import { homeworkWhatsAppUrl } from "../src/lib/homeworkShare.ts";
test("WhatsApp link targets only full international numbers", () => {
  assert.match(homeworkWhatsAppUrl("https://x/h/1", "ar", "+966 56 757 0787"), /^https:\/\/wa\.me\/966567570787\?text=/);
  assert.match(homeworkWhatsAppUrl("https://x/h/1", "ar", "0567570787"), /^https:\/\/wa\.me\/\?text=/);
  assert.ok(decodeURIComponent(homeworkWhatsAppUrl("https://x/h/1", "ru", null)).includes("https://x/h/1"));
});
