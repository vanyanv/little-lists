// Little Lists — global local search over the hydrated store (pure, unit-tested).
// No FTS, no API: everything the user owns is already in the client store, so we
// scan it directly. Substring, case-insensitive; ranked prefix > word-start >
// substring; capped per group so a broad query stays a glanceable handful.

import type { List, Item, Person, PersonDetailEntry, PersonSection, Scrap } from "../types";
import { TEMPLATE_META } from "../types";

/** one result, tagged by what it is and carrying the context needed to render + navigate */
export type LocalHit =
  | { kind: "list"; id: string; list: List }
  | { kind: "item"; id: string; item: Item; list: List }
  | { kind: "person"; id: string; person: Person }
  | { kind: "detail"; id: string; detail: PersonDetailEntry; person: Person; section: PersonSection }
  | { kind: "scrap"; id: string; scrap: Scrap };

export type LocalHitKind = LocalHit["kind"];

export interface LocalHitGroup {
  key: LocalHitKind;
  /** brand-voice section heading */
  label: string;
  hits: LocalHit[];
}

export interface SearchData {
  lists: List[];
  people: Person[];
  scraps: Scrap[];
}

/** at most this many hits per group — a broad query should still fit on a glance */
const GROUP_CAP = 8;

const GROUP_LABELS: Record<LocalHitKind, string> = {
  list: "little worlds",
  item: "little things",
  person: "your people",
  detail: "little details",
  scrap: "in your pocket",
};

// fixed order the groups are presented in
const GROUP_ORDER: LocalHitKind[] = ["list", "item", "person", "detail", "scrap"];

// lower is better: 0 prefix, 1 word-start, 2 substring, null no match
type Rank = 0 | 1 | 2;

function fieldRank(haystack: string, needle: string): Rank | null {
  const idx = haystack.toLowerCase().indexOf(needle);
  if (idx === -1) return null;
  if (idx === 0) return 0;
  const prev = haystack[idx - 1];
  // a word start is any non-alphanumeric boundary (space, punctuation, emoji edge)
  return /[a-z0-9]/i.test(prev) ? 2 : 1;
}

/** best (lowest) rank across a hit's searchable fields, or null if none match */
function bestRank(needle: string, fields: Array<string | undefined | null>): Rank | null {
  let best: Rank | null = null;
  for (const f of fields) {
    if (!f) continue;
    const r = fieldRank(f, needle);
    if (r !== null && (best === null || r < best)) best = r;
    if (best === 0) break; // can't do better than a prefix
  }
  return best;
}

/** rank, drop misses, stable-sort best-first, cap the group */
function rankGroup(candidates: Array<{ hit: LocalHit; rank: Rank | null }>): LocalHit[] {
  return candidates
    .filter((c): c is { hit: LocalHit; rank: Rank } => c.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, GROUP_CAP)
    .map((c) => c.hit);
}

/**
 * Search the user's whole little world for `query`. Synchronous and pure — safe
 * to memoize per query. Returns only non-empty groups, in canonical order.
 */
export function searchLittleWorld(query: string, data: SearchData): LocalHitGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const listHits = rankGroup(
    data.lists.map((list) => ({
      hit: { kind: "list", id: list.id, list } as LocalHit,
      rank: bestRank(needle, [list.title, TEMPLATE_META[list.template].label]),
    }))
  );

  const itemHits = rankGroup(
    data.lists.flatMap((list) =>
      list.items.map((item) => ({
        hit: { kind: "item", id: item.id, item, list } as LocalHit,
        rank: bestRank(needle, [item.title, item.subtitle, item.note, ...(item.tags ?? [])]),
      }))
    )
  );

  const personHits = rankGroup(
    data.people.map((person) => ({
      hit: { kind: "person", id: person.id, person } as LocalHit,
      rank: bestRank(needle, [person.name, person.note]),
    }))
  );

  const detailHits = rankGroup(
    data.people.flatMap((person) =>
      person.sections.flatMap((section) =>
        section.entries.map((detail) => ({
          hit: { kind: "detail", id: detail.id, detail, person, section } as LocalHit,
          rank: bestRank(needle, [detail.title, detail.note, ...detail.tags]),
        }))
      )
    )
  );

  const scrapHits = rankGroup(
    data.scraps.map((scrap) => ({
      hit: { kind: "scrap", id: scrap.id, scrap } as LocalHit,
      rank: bestRank(needle, [scrap.text]),
    }))
  );

  const byKey: Record<LocalHitKind, LocalHit[]> = {
    list: listHits,
    item: itemHits,
    person: personHits,
    detail: detailHits,
    scrap: scrapHits,
  };

  return GROUP_ORDER.filter((k) => byKey[k].length > 0).map((k) => ({
    key: k,
    label: GROUP_LABELS[k],
    hits: byKey[k],
  }));
}
