/**
 * Soniox language hints for an English lesson. English always comes first;
 * the student's own language is added because teachers explain in it.
 * The old fixed ["ar", "ru"] (no English) made Soniox write a whole lesson
 * in Arabic when the teacher opened in Arabic (2026-11-09).
 */
const SUPPORTED = new Set(["ru", "ar", "kk"]);

export function transcriptionLanguageHints(learnerLocale?: string | null): string[] {
  return learnerLocale && SUPPORTED.has(learnerLocale) ? ["en", learnerLocale] : ["en", "ru", "ar"];
}
