import assert from "node:assert/strict";
import test from "node:test";
import { transcriptionLanguageHints } from "../convex/lib/transcriptionLanguages.ts";

// Regression: hints were ["ar", "ru"] with no English, so a lesson opened in
// Arabic was transcribed entirely in Arabic and vocabulary had nothing to anchor.
test("English lessons always hint English first, then the student's language", () => {
  assert.deepEqual(transcriptionLanguageHints("ar"), ["en", "ar"]);
  assert.deepEqual(transcriptionLanguageHints("kk"), ["en", "kk"]);
  assert.deepEqual(transcriptionLanguageHints(null), ["en", "ru", "ar"]);
  assert.deepEqual(transcriptionLanguageHints("en"), ["en", "ru", "ar"]);
});
