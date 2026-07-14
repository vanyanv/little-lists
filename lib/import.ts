import type { SearchHit } from "./search/types";

export const IMPORT_MAX_LINES = 50;
export const IMPORT_LINE_MAX = 200;

/** leading list decorations Notes-style pastes carry: bullets, numbering, checkboxes */
const LINE_MARKER =
  /^(?:[-*•·–—]|\(\d+\)|\d+[.)]|\[[ xX]?\]|[☐☑☒])\s*/;

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
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

/** the line's best match: exact normalized title, then prefix either way, then provider order */
export function pickBestHit(line: string, hits: SearchHit[]): SearchHit | undefined {
  if (hits.length === 0) return undefined;
  const q = normalize(line);
  return (
    hits.find((h) => normalize(h.title) === q) ??
    hits.find((h) => normalize(h.title).startsWith(q) || q.startsWith(normalize(h.title))) ??
    hits[0]
  );
}
