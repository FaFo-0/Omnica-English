/**
 * "Fix English": speech recognition writes English said inside Arabic/Russian
 * speech in those letters. An AI rewrites such lines; these helpers decide
 * which rewrites to trust and apply them to the stored transcript text.
 */
const NON_LATIN = /[؀-ۿЀ-ӿ]/g;

/** Lines worth sending: they contain Arabic or Cyrillic letters. */
export function needsEnglishFix(text: string): boolean {
  return /[؀-ۿЀ-ӿ]/.test(text);
}

/**
 * A rewrite is trusted only when it moved letters into English without
 * inventing or dropping much: fewer non-Latin letters, more Latin ones, and a
 * similar length.
 */
export function acceptableRewrite(before: string, after: string): boolean {
  const next = after.trim();
  if (!next || next === before.trim()) return false;
  const nonLatinBefore = (before.match(NON_LATIN) ?? []).length;
  const nonLatinAfter = (next.match(NON_LATIN) ?? []).length;
  const latin = (s: string) => (s.match(/[A-Za-z]/g) ?? []).length;
  if (nonLatinAfter >= nonLatinBefore || latin(next) <= latin(before)) return false;
  const ratio = next.length / Math.max(1, before.length);
  return ratio > 0.4 && ratio < 2;
}

/**
 * Replace each changed line in the transcript, in order. Returns null when a
 * line can't be found, so the caller rebuilds instead of guessing.
 */
export function applyLineFixes(transcript: string, changes: { before: string; after: string }[]): string | null {
  let out = "";
  let cursor = 0;
  for (const change of changes) {
    const at = transcript.indexOf(change.before, cursor);
    if (at < 0) return null;
    out += transcript.slice(cursor, at) + change.after;
    cursor = at + change.before.length;
  }
  return out + transcript.slice(cursor);
}
