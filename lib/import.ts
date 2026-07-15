import type { SearchHit } from "./search/types";

export const IMPORT_MAX_LINES = 50;
export const IMPORT_LINE_MAX = 200;

/** leading list decorations Notes-style pastes carry: bullets, numbering, checkboxes.
 *  Wrapped in a repeating group so stacked markers ("- [ ] Dune") strip fully in one pass. */
const LINE_MARKER =
  /^(?:(?:[-*•·–—]|\d+[.)]|\[[ xX]?\]|[☐☑☒])\s*)+/;

export function parsePastedList(text: string): { lines: string[]; truncated: boolean } {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(LINE_MARKER, "").trim().slice(0, IMPORT_LINE_MAX);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }
  return { lines: lines.slice(0, IMPORT_MAX_LINES), truncated: lines.length > IMPORT_MAX_LINES };
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

/** editions ABOUT a work, not the work itself — providers sometimes rank these
 *  first (Open Library returns only a Gale study guide for "Kafka on the Shore")
 *  and a wrong cover is worse than none */
const DERIVATIVE_TITLE =
  /\bstudy guide\b|\bsparknotes\b|\bcliffs?notes\b|\bsummary (?:of|and analysis)\b|\bworkbook\b/i;

/**
 * The line's best match: exact normalized title, then prefix either way, then
 * the least-decorated title containing the line, then provider order. Titles
 * that are merely about the work are skipped entirely (unless the user
 * literally pasted one) — no match beats a wrong match.
 */
export function pickBestHit(line: string, hits: SearchHit[]): SearchHit | undefined {
  const pool = DERIVATIVE_TITLE.test(line) ? hits : hits.filter((h) => !DERIVATIVE_TITLE.test(h.title));
  if (pool.length === 0) return undefined;
  const q = normalize(line);
  const exact = pool.find((h) => normalize(h.title) === q);
  if (exact) return exact;
  const prefix = pool.find((h) => normalize(h.title).startsWith(q) || q.startsWith(normalize(h.title)));
  if (prefix) return prefix;
  const containing = pool
    .filter((h) => normalize(h.title).includes(q))
    .sort((a, b) => a.title.length - b.title.length);
  return containing[0] ?? pool[0];
}
