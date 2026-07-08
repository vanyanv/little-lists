// Little Lists — pocket scrap helpers (pure; unit-tested)

import type { List, ScrapDetection } from "./types";
import type { SearchHit } from "./search/types";

export type DetectionResult = ScrapDetection | { none: true };

export const SCRAP_MAX_LENGTH = 200;
export const POCKET_COZY_THRESHOLD = 7;
export const DETECT_BATCH = 5;

const DETECT_KINDS = ["movie", "book", "music"] as const;
export type DetectKind = (typeof DETECT_KINDS)[number];

/** optimistic scraps not yet swapped for their server row */
export function isTempScrapId(id: string): boolean {
  return id.startsWith("scrap-");
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chips must be right or absent: confident only when the normalized titles are
 * equal, or the hit's title starts with the scrap text at a word boundary
 * ("past lives" → "Past Lives (2023)", but not "past" → "Pasta Grannies").
 */
export function titleMatches(scrapText: string, hitTitle: string): boolean {
  const a = normalizeTitle(scrapText);
  const b = normalizeTitle(hitTitle);
  if (!a || !b) return false;
  return a === b || b.startsWith(`${a} `);
}

/** first confident top-hit in provider order wins; otherwise a persisted "none" */
export function pickDetection(
  text: string,
  resultsByKind: Array<{ kind: DetectKind; hits: SearchHit[] }>
): DetectionResult {
  for (const { kind, hits } of resultsByKind) {
    const top = hits[0];
    if (top && titleMatches(text, top.title)) {
      return {
        kind,
        title: top.title,
        subtitle: top.subtitle,
        imageUrl: top.imageUrl,
        sourceId: top.sourceId,
        meta: top.meta,
      };
    }
  }
  return { none: true };
}

/**
 * Ask all three providers about a scrap. Throws when every request failed
 * (no signal ≠ no match — leave the scrap unchecked so a later open retries);
 * otherwise resolves to a cacheable DetectionResult.
 */
export async function detectScrap(text: string, fetcher: typeof fetch = fetch): Promise<DetectionResult> {
  const q = encodeURIComponent(text.trim());
  const results = await Promise.all(
    DETECT_KINDS.map(async (kind) => {
      try {
        const res = await fetcher(`/api/search/${kind}?q=${q}`);
        if (!res.ok) throw new Error(`search ${kind} failed`);
        return { kind, ok: true, hits: (await res.json()) as SearchHit[] };
      } catch {
        return { kind, ok: false, hits: [] as SearchHit[] };
      }
    })
  );
  if (results.every((r) => !r.ok)) throw new Error("detectScrap: all providers failed");
  return pickDetection(text, results.filter((r) => r.ok));
}

/**
 * The list a one-tap chip files into. The store keeps server order (pinned
 * first, then most recently updated), so the first match is the right one.
 */
export function bestListForKind(lists: List[], kind: DetectKind): List | undefined {
  return lists.find((l) => l.kind === kind);
}

/** soft age label for a scrap row */
export function scrapAge(createdAt: string, now: Date): string {
  const mins = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
