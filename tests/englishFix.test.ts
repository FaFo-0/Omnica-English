import assert from "node:assert/strict";
import test from "node:test";
import { acceptableRewrite, applyLineFixes, needsEnglishFix } from "../convex/lib/englishFix.ts";

// Real case (Talal, 2026-11-12): English said inside Arabic speech came out in
// Arabic letters, so vocabulary and the mistake checker had nothing to read.
test("trusts rewrites that move English out of Arabic letters, not invented ones", () => {
  assert.equal(needsEnglishFix("آي أم سيريان. أنا سوري."), true);
  assert.equal(needsEnglishFix("I am Syrian."), false);
  assert.equal(acceptableRewrite("آي أم سيريان. أنا سوري.", "I am Syrian. أنا سوري."), true);
  assert.equal(acceptableRewrite("أنا سوري.", "I am Syrian, I come from Damascus and I love it here."), false);
  assert.equal(acceptableRewrite("آي أم سيريان", "آي أم سيريان"), false);
  assert.equal(acceptableRewrite("آي أم سيريان", ""), false);
});

test("applies line fixes in order and refuses when a line is missing", () => {
  const transcript = "[Teacher]: وات إز يور ناشونالتي؟\n\n[Student]: آي أم سيريان.";
  const fixed = applyLineFixes(transcript, [
    { before: "وات إز يور ناشونالتي؟", after: "What is your nationality?" },
    { before: "آي أم سيريان.", after: "I am Syrian." },
  ]);
  assert.equal(fixed, "[Teacher]: What is your nationality?\n\n[Student]: I am Syrian.");
  assert.equal(applyLineFixes(transcript, [{ before: "غير موجود", after: "x" }]), null);
});
