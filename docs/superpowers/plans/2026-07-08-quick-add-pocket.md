# Quick-Add Pocket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Global quick capture — jot a "scrap" with zero decisions from a Pocket slot in the bottom nav, then file it into a list later via enrichment-suggested chips or the full add flow.

**Architecture:** A new `Scrap` Prisma model (isolated from lists), four server actions, scraps in the optimistic client store, a Pocket bottom sheet opened from a new nav slot, lazy enrichment detection cached per scrap, and a scrap-filing mode wired into the *existing dormant* global-add flow in `add-item-modal.tsx`. Spec: `docs/superpowers/specs/2026-07-08-quick-add-pocket-design.md`.

**Tech Stack:** Next.js 16 App Router (⚠️ breaking changes vs training data — read `node_modules/next/dist/docs/` before using unfamiliar Next APIs), React 19, Prisma 7 + Postgres, Clerk, Tailwind 4, Motion, vitest.

## Global Constraints

- Scrap text: trimmed, non-empty, max **200** chars (`SCRAP_MAX_LENGTH`).
- Cozy-fullness nudge threshold: **7** scraps (`POCKET_COZY_THRESHOLD`).
- Detection: max **5** scraps checked per pocket open (`DETECT_BATCH`); provider order movie → book → music; a chip appears **only** on a confident match (normalized equality, or hit title starts with scrap text at a word boundary). Wrong chips are worse than no chips.
- All copy is warm/cozy lowercase-leaning, matching existing strings ("Saved to your little world ✨", "That didn't save. Let's try again 🌿").
- Code style: double quotes, existing file conventions; server actions scope every query by `clerkUserId` (see any action in `lib/actions.ts`).
- Tests: vitest, `environment: "node"` — unit-test only pure lib code (project convention: `lib/*.test.ts`). Run with `npm test`.
- Commit after every task.

## File structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | + `Scrap` model, `Profile.scraps` relation |
| `lib/types.ts` | + `Scrap`, `ScrapDetection` UI types |
| `lib/scraps.ts` (new) | Pure helpers: normalization, confidence match, detection picking/fetching, best-list, age label, constants |
| `lib/scraps.test.ts` (new) | Tests for the above |
| `lib/server/serialize.ts` | + `mapScrap` |
| `lib/server/data.ts` | + scraps in `InitialData` |
| `lib/actions.ts` | + `createScrapAction`, `deleteScrapAction`, `saveScrapDetectionAction`, `fileScrapAction`; extract shared `itemCreateData` helper |
| `lib/store.tsx` | + scraps state, `addScrap`, `deleteScrap`, `setScrapDetection`, `fileScrap` |
| `app/app/(main)/layout.tsx` | Seed scraps into the store |
| `lib/ui.tsx` | + sheet kinds `"pocket"` and scrap payload on `"item"`; `openPocketSheet`, `openScrapFiling` |
| `components/bottom-nav.tsx` | + Pocket slot (button + badge) |
| `components/pocket-sheet.tsx` (new) | Capture input, scrap pile, detection effect, chips, delete |
| `components/app-shell.tsx` | Mount `<PocketSheet />` |
| `components/add-item-modal.tsx` | Scrap-filing mode (prefill, `fileScrap` save path, undo toast) + "a new little list" option |

---

### Task 1: Scrap model + migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma model `Scrap { id, userId, text, detection Json?, createdAt, updatedAt }`, relation `Profile.scraps`.

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Add to the `Profile` model's relation block (after `personDetails PersonDetail[]`):

```prisma
  scraps        Scrap[]
```

Add at the end of the file (after `PersonDetail`):

```prisma
model Scrap {
  id     String @id @default(cuid())
  userId String
  text   String
  /** cached enrichment guess: {kind,title,subtitle,imageUrl?,sourceId,meta} or {none:true}; null = unchecked */
  detection Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user Profile @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)

  @@index([userId])
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name add_scraps`
Expected: "Your database is now in sync with your schema." and a new folder under `prisma/migrations/*_add_scraps/`. (`migrate dev` also regenerates the client.)

- [ ] **Step 3: Commit**

```bash
git add prisma
git commit -m "feat(pocket): add Scrap model"
```

---

### Task 2: Scrap types + pure helpers (TDD)

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/scraps.ts`
- Test: `lib/scraps.test.ts`

**Interfaces:**
- Consumes: `SearchHit` from `lib/search/types.ts`, `List` from `lib/types.ts`.
- Produces (used by Tasks 3–7):
  - types `ScrapDetection`, `Scrap` (in `lib/types.ts`), `DetectionResult = ScrapDetection | { none: true }` (in `lib/scraps.ts`)
  - `SCRAP_MAX_LENGTH = 200`, `POCKET_COZY_THRESHOLD = 7`, `DETECT_BATCH = 5`
  - `titleMatches(scrapText: string, hitTitle: string): boolean`
  - `pickDetection(text: string, resultsByKind: Array<{ kind: "movie" | "book" | "music"; hits: SearchHit[] }>): DetectionResult`
  - `detectScrap(text: string, fetcher?: typeof fetch): Promise<DetectionResult>` (throws when all three providers fail)
  - `bestListForKind(lists: List[], kind: "movie" | "book" | "music"): List | undefined`
  - `scrapAge(createdAt: string, now: Date): string`
  - `isTempScrapId(id: string): boolean`

- [ ] **Step 1: Add UI types to `lib/types.ts`**

After the `Item` interface:

```ts
/** cached enrichment guess for a pocket scrap */
export interface ScrapDetection {
  kind: "movie" | "book" | "music";
  title: string;
  /** year (movie/music) or author (book) */
  subtitle: string;
  imageUrl?: string;
  sourceId: string;
  /** provider fields carried into ListItem.metadata on filing */
  meta: Record<string, unknown>;
}

/** a quick capture waiting in the pocket to be filed into a list */
export interface Scrap {
  id: string;
  text: string;
  /** null = not yet checked; { none: true } = checked, no confident match */
  detection: ScrapDetection | { none: true } | null;
  /** ISO timestamp, for the soft age label */
  createdAt: string;
}
```

- [ ] **Step 2: Write the failing tests — `lib/scraps.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { List } from "./types";
import type { SearchHit } from "./search/types";
import { bestListForKind, pickDetection, scrapAge, titleMatches } from "./scraps";

function hit(title: string, kind: SearchHit["type"] = "movie"): SearchHit {
  return { sourceId: `id-${title}`, type: kind, title, subtitle: "2023", imageUrl: "https://x/y.jpg", meta: { sourceId: `id-${title}` } };
}

function list(kind: List["kind"], id = `l-${kind}`): List {
  return { id, title: `${kind} list`, emoji: "✨", theme: "blush", noun: "things", kind, template: kind === "custom" ? "custom" : kind, pinned: false, items: [] };
}

describe("titleMatches", () => {
  it("matches exact titles ignoring case and punctuation", () => {
    expect(titleMatches("past lives", "Past Lives")).toBe(true);
    expect(titleMatches("Amelie!", "Amélie")).toBe(false); // diacritics differ — that's fine, right-or-absent
    expect(titleMatches("the bear", "The Bear.")).toBe(true);
  });
  it("matches when the scrap is a word-boundary prefix of the hit", () => {
    expect(titleMatches("past lives", "Past Lives (2023)")).toBe(true);
    expect(titleMatches("past", "Pasta Grannies")).toBe(false);
  });
  it("rejects unrelated titles and empty input", () => {
    expect(titleMatches("that ramen place dana said", "Ramen Heads")).toBe(false);
    expect(titleMatches("", "Anything")).toBe(false);
  });
});

describe("pickDetection", () => {
  it("returns the first confident match in provider order", () => {
    const d = pickDetection("past lives", [
      { kind: "movie", hits: [hit("Past Lives")] },
      { kind: "book", hits: [hit("Past Lives: A Novel", "book")] },
    ]);
    expect(d).toMatchObject({ kind: "movie", title: "Past Lives", sourceId: "id-Past Lives" });
  });
  it("only considers the top hit per provider", () => {
    const d = pickDetection("past lives", [
      { kind: "movie", hits: [hit("Unrelated"), hit("Past Lives")] },
    ]);
    expect(d).toEqual({ none: true });
  });
  it("returns none when nothing matches", () => {
    expect(pickDetection("buy socks", [{ kind: "movie", hits: [hit("Sock Puppets")] }])).toEqual({ none: true });
  });
});

describe("bestListForKind", () => {
  it("picks the first list of that kind (store order = pinned, then freshest)", () => {
    const lists = [list("book", "b1"), list("movie", "m1"), list("movie", "m2")];
    expect(bestListForKind(lists, "movie")?.id).toBe("m1");
  });
  it("returns undefined when no list of that kind exists", () => {
    expect(bestListForKind([list("book")], "movie")).toBeUndefined();
  });
});

describe("scrapAge", () => {
  const now = new Date("2026-07-08T12:00:00Z");
  it("labels fresh, minutes, hours, and days", () => {
    expect(scrapAge("2026-07-08T11:59:40Z", now)).toBe("just now");
    expect(scrapAge("2026-07-08T11:45:00Z", now)).toBe("15m ago");
    expect(scrapAge("2026-07-08T09:00:00Z", now)).toBe("3h ago");
    expect(scrapAge("2026-07-07T09:00:00Z", now)).toBe("yesterday");
    expect(scrapAge("2026-07-04T09:00:00Z", now)).toBe("4 days ago");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/scraps.test.ts`
Expected: FAIL — "Cannot find module './scraps'" (or equivalent).

- [ ] **Step 4: Implement `lib/scraps.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/scraps.test.ts`
Expected: PASS (all tests). Also run `npm test` — the whole suite stays green.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/scraps.ts lib/scraps.test.ts
git commit -m "feat(pocket): scrap types and pure detection helpers"
```

---

### Task 3: Serialization, initial data, and server actions

**Files:**
- Modify: `lib/server/serialize.ts`, `lib/server/data.ts`, `lib/actions.ts`

**Interfaces:**
- Consumes: `Scrap`/`ScrapDetection` types, `DetectionResult`, `SCRAP_MAX_LENGTH` (Task 2); existing `requireUserProfile`, `mapItem`, `CreateItemInput`.
- Produces (used by Tasks 4–7):
  - `mapScrap(row): Scrap` in serialize.ts
  - `InitialData.scraps: Scrap[]` from `getInitialData()`
  - `createScrapAction(text: string): Promise<Scrap>`
  - `deleteScrapAction(scrapId: string): Promise<void>`
  - `saveScrapDetectionAction(scrapId: string, detection: DetectionResult): Promise<void>`
  - `fileScrapAction(scrapId: string, listId: string, input: CreateItemInput): Promise<Item>` (transactional)

- [ ] **Step 1: Add `mapScrap` to `lib/server/serialize.ts`**

Extend the `@prisma/client` type import with `Scrap as DbScrap`, extend the `@/lib/types` import with `Scrap`, and add at the end of the file:

```ts
/* ── scraps ──────────────────────────────────────────────────────────── */

export function mapScrap(row: DbScrap): Scrap {
  return {
    id: row.id,
    text: row.text,
    detection: (row.detection as unknown as Scrap["detection"]) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
```

- [ ] **Step 2: Return scraps from `lib/server/data.ts`**

Add `Scrap` to the `@/lib/types` import and `mapScrap` to the serialize import. Change `InitialData` and the query:

```ts
export interface InitialData {
  lists: List[];
  people: Person[];
  scraps: Scrap[];
  profile: Profile | null;
}
```

In `getInitialData`, the empty return becomes `{ lists: [], people: [], scraps: [], profile: null }`; the `Promise.all` gains a third query and the return maps it:

```ts
  const [lists, people, scraps] = await Promise.all([
    prisma.list.findMany({
      where: { userId },
      // pinned worlds float to the top; everything else stays freshest-first
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      include: { items: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.person.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { details: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.scrap.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    lists: lists.map(mapList),
    people: people.map(mapPerson),
    scraps: scraps.map(mapScrap),
    profile: mapProfile(profile),
  };
```

- [ ] **Step 3: Extract `itemCreateData` and add the four actions in `lib/actions.ts`**

Extend imports: add `mapScrap` to the serialize import, `Scrap` to the types import, and add `import { SCRAP_MAX_LENGTH, type DetectionResult } from "@/lib/scraps";` (non-exported helpers and value imports are fine in a `"use server"` file — only *exports* must be async).

Above `createItemAction`, extract the row-building (DRY — `fileScrapAction` reuses it):

```ts
function itemCreateData(clerkUserId: string, listId: string, input: CreateItemInput) {
  const metadata = {
    ...(input.meta ?? {}),
    type: input.type,
    ...(input.seed ? { seed: input.seed } : {}),
  } satisfies Prisma.InputJsonObject;
  return {
    listId,
    userId: clerkUserId,
    title: input.title,
    subtitle: input.subtitle ?? null,
    note: input.note ?? null,
    status: input.status ?? null,
    emoji: input.emoji ?? null,
    imageUrl: input.imageUrl ?? null,
    tags: input.tags ?? [],
    metadata,
  };
}
```

Rewrite the body of `createItemAction` to use it (the ownership check stays):

```ts
export async function createItemAction(listId: string, input: CreateItemInput): Promise<Item> {
  const { clerkUserId } = await requireUserProfile();

  // ownership: the list must belong to the caller
  const list = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    select: { id: true },
  });
  if (!list) throw new Error("createItemAction: list not found");

  const row = await prisma.listItem.create({ data: itemCreateData(clerkUserId, listId, input) });
  return mapItem(row, input.type);
}
```

Add a new section after the items section:

```ts
/* ── scraps ──────────────────────────────────────────────────────────── */

export async function createScrapAction(text: string): Promise<Scrap> {
  const { clerkUserId } = await requireUserProfile();
  const trimmed = text.trim().slice(0, SCRAP_MAX_LENGTH);
  if (!trimmed) throw new Error("createScrapAction: empty text");
  const row = await prisma.scrap.create({ data: { userId: clerkUserId, text: trimmed } });
  return mapScrap(row);
}

export async function deleteScrapAction(scrapId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.scrap.deleteMany({ where: { id: scrapId, userId: clerkUserId } });
}

/** persist the enrichment guess (or a definitive "none") so detection runs once per scrap */
export async function saveScrapDetectionAction(scrapId: string, detection: DetectionResult): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.scrap.updateMany({
    where: { id: scrapId, userId: clerkUserId },
    data: { detection: detection as unknown as Prisma.InputJsonObject },
  });
}

/** file a scrap: create the list item and retire the scrap in one transaction */
export async function fileScrapAction(scrapId: string, listId: string, input: CreateItemInput): Promise<Item> {
  const { clerkUserId } = await requireUserProfile();
  return prisma.$transaction(async (tx) => {
    const scrap = await tx.scrap.findFirst({
      where: { id: scrapId, userId: clerkUserId },
      select: { id: true },
    });
    if (!scrap) throw new Error("fileScrapAction: scrap not found");
    const list = await tx.list.findFirst({
      where: { id: listId, userId: clerkUserId },
      select: { id: true },
    });
    if (!list) throw new Error("fileScrapAction: list not found");

    const row = await tx.listItem.create({ data: itemCreateData(clerkUserId, listId, input) });
    await tx.scrap.delete({ where: { id: scrapId } });
    return mapItem(row, input.type);
  });
}
```

- [ ] **Step 4: Verify it compiles and the suite is green**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/server/serialize.ts lib/server/data.ts lib/actions.ts
git commit -m "feat(pocket): scrap serialization, initial data, and server actions"
```

---

### Task 4: Store methods + layout seeding

**Files:**
- Modify: `lib/store.tsx`, `app/app/(main)/layout.tsx`

**Interfaces:**
- Consumes: Task 3 actions; `Scrap`, `DetectionResult`, `SCRAP_MAX_LENGTH`.
- Produces (used by Tasks 5–7), added to `StoreValue`:
  - `scraps: Scrap[]`
  - `addScrap: (text: string) => Promise<void>` (optimistic; throws on server failure)
  - `deleteScrap: (scrapId: string) => DeleteHandle`
  - `setScrapDetection: (scrapId: string, detection: DetectionResult) => void`
  - `fileScrap: (scrapId: string, listId: string, input: CreateItemInput) => DeleteHandle` (optimistic: scrap leaves, item appears; `commit` persists, `undo` restores)
  - `StoreSeed.scraps: Scrap[]`

- [ ] **Step 1: Wire scraps through `lib/store.tsx`**

Imports: add `Scrap` to the `./types` type import; add `createScrapAction, deleteScrapAction, fileScrapAction, saveScrapDetectionAction` to the `./actions` import; add `import { SCRAP_MAX_LENGTH, type DetectionResult } from "./scraps";`.

`isTempId` (bottom of file) gains the scrap prefix:

```ts
function isTempId(id: string): boolean {
  return (
    id.startsWith("list-") ||
    id.startsWith("item-") ||
    id.startsWith("person-") ||
    id.startsWith("detail-") ||
    id.startsWith("scrap-")
  );
}
```

`StoreSeed` and `StoreValue` gain the fields from the Interfaces block above; `ListsProvider` gains state:

```ts
const [scraps, setScraps] = useState<Scrap[]>(seed.scraps);
```

Add a scraps section (after the items section, before people):

```ts
  /* ── scraps (the pocket) ───────────────────────────────────────── */

  const addScrap = useCallback<StoreValue["addScrap"]>(async (text) => {
    const trimmed = text.trim().slice(0, SCRAP_MAX_LENGTH);
    if (!trimmed) return;
    const tempId = makeId("scrap");
    const optimistic: Scrap = { id: tempId, text: trimmed, detection: null, createdAt: new Date().toISOString() };
    setScraps((prev) => [optimistic, ...prev]);
    try {
      const created = await createScrapAction(trimmed);
      setScraps((prev) => prev.map((s) => (s.id === tempId ? created : s)));
    } catch (err) {
      setScraps((prev) => prev.filter((s) => s.id !== tempId));
      throw err;
    }
  }, []);

  // Deferred delete, same contract as deleteList/deletePerson: gone from the UI
  // now, server delete only on commit() (Undo-toast expiry).
  const deleteScrap = useCallback<StoreValue["deleteScrap"]>((scrapId) => {
    let removed: { scrap: Scrap; index: number } | null = null;
    setScraps((prev) => {
      const index = prev.findIndex((s) => s.id === scrapId);
      if (index === -1) return prev;
      removed = { scrap: prev[index], index };
      return prev.filter((s) => s.id !== scrapId);
    });
    const restore = () => {
      const snap = removed;
      if (!snap) return;
      setScraps((prev) => {
        const next = [...prev];
        next.splice(Math.min(snap.index, next.length), 0, snap.scrap);
        return next;
      });
    };
    let settled = false;
    return {
      undo: () => {
        if (settled) return;
        settled = true;
        restore();
      },
      commit: () => {
        if (settled) return;
        settled = true;
        if (isTempId(scrapId)) return;
        void deleteScrapAction(scrapId).catch((err) => {
          console.error("deleteScrap failed", err);
          restore();
          signalSaveError();
        });
      },
    };
  }, [signalSaveError]);

  const setScrapDetection = useCallback<StoreValue["setScrapDetection"]>((scrapId, detection) => {
    setScraps((prev) => prev.map((s) => (s.id === scrapId ? { ...s, detection } : s)));
    if (isTempId(scrapId)) return;
    // cache-only write: on failure the scrap just gets re-detected next open
    void saveScrapDetectionAction(scrapId, detection).catch((err) => {
      console.error("setScrapDetection failed", err);
    });
  }, []);

  // Deferred file: the scrap leaves the pocket and the item appears in its list
  // immediately; commit() persists both sides in one transaction, undo() puts
  // everything back untouched.
  const fileScrap = useCallback<StoreValue["fileScrap"]>((scrapId, listId, input) => {
    let removed: { scrap: Scrap; index: number } | null = null;
    setScraps((prev) => {
      const index = prev.findIndex((s) => s.id === scrapId);
      if (index === -1) return prev;
      removed = { scrap: prev[index], index };
      return prev.filter((s) => s.id !== scrapId);
    });
    const tempItemId = makeId("item");
    const optimistic: Item = {
      id: tempItemId,
      fresh: true,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle,
      note: input.note,
      status: input.status,
      tags: input.tags,
      emoji: input.emoji,
      seed: input.seed,
      imageUrl: input.imageUrl,
    };
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: [optimistic, ...l.items] } : l))
    );
    const restore = () => {
      const snap = removed;
      if (snap) {
        setScraps((prev) => {
          const next = [...prev];
          next.splice(Math.min(snap.index, next.length), 0, snap.scrap);
          return next;
        });
      }
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== tempItemId) } : l))
      );
    };
    let settled = false;
    return {
      undo: () => {
        if (settled) return;
        settled = true;
        restore();
      },
      commit: () => {
        if (settled) return;
        settled = true;
        // an unswapped optimistic scrap has no server row to retire — plain create
        const persist = isTempId(scrapId)
          ? createItemAction(listId, input)
          : fileScrapAction(scrapId, listId, input);
        void persist
          .then((created) => {
            setLists((prev) =>
              prev.map((l) =>
                l.id === listId
                  ? { ...l, items: l.items.map((i) => (i.id === tempItemId ? { ...created, fresh: true } : i)) }
                  : l
              )
            );
          })
          .catch((err) => {
            console.error("fileScrap failed", err);
            restore();
            signalSaveError();
          });
      },
    };
  }, [signalSaveError]);
```

Add `scraps, addScrap, deleteScrap, setScrapDetection, fileScrap` to both the `useMemo` value object and its dependency array.

- [ ] **Step 2: Seed scraps in `app/app/(main)/layout.tsx`**

```ts
  const seed: StoreSeed = {
    lists: data.lists,
    people: data.people,
    scraps: data.scraps,
    profile: data.profile ?? FALLBACK_PROFILE,
  };
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/store.tsx "app/app/(main)/layout.tsx"
git commit -m "feat(pocket): scraps in the client store with deferred file/delete"
```

---

### Task 5: Pocket sheet, nav slot, and UI plumbing

**Files:**
- Modify: `lib/ui.tsx`, `components/bottom-nav.tsx`, `components/app-shell.tsx`
- Create: `components/pocket-sheet.tsx`

**Interfaces:**
- Consumes: store scraps API (Task 4); `POCKET_COZY_THRESHOLD`, `scrapAge` (Task 2); `BottomSheet`, `Button`, `OverflowMenu` components.
- Produces (used by Tasks 6–7):
  - `SheetState` gains `{ kind: "pocket" }` and `scrap?: ScrapRef` on `"item"`, where `export interface ScrapRef { id: string; text: string; kind?: ItemType }` (exported from `lib/ui.tsx`)
  - `openPocketSheet(): void`, `openScrapFiling(scrap: ScrapRef): void` on `useUi()`

- [ ] **Step 1: Extend `lib/ui.tsx`**

Add `ItemType` to the type import from `./types`. Add above `SheetState`:

```ts
/** a pocket scrap being filed through the add-item flow */
export interface ScrapRef {
  id: string;
  text: string;
  /** detected kind, when the pocket already knows what this is */
  kind?: ItemType;
}
```

Change the two sheet kinds:

```ts
export type SheetState =
  | { kind: "item"; listId?: string; scrap?: ScrapRef }
  | { kind: "pocket" }
  | { kind: "detail"; personId: string; sectionId?: string }
  // ...rest unchanged
```

Add to `UiValue`, the provider, the memo value, and the deps:

```ts
  openPocketSheet: () => void;
  openScrapFiling: (scrap: ScrapRef) => void;
```

```ts
  const openPocketSheet = useCallback(() => setSheet({ kind: "pocket" }), []);
  const openScrapFiling = useCallback((scrap: ScrapRef) => setSheet({ kind: "item", scrap }), []);
```

- [ ] **Step 2: Create `components/pocket-sheet.tsx`**

(The detection effect and suggestion chips arrive in Task 6 — this file is written to make that a small, local addition.)

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { POCKET_COZY_THRESHOLD, SCRAP_MAX_LENGTH, scrapAge } from "@/lib/scraps";
import type { Scrap } from "@/lib/types";
import { softSpring } from "@/lib/motion";
import { inputPrimary, sheetTitle } from "@/lib/field";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { OverflowMenu } from "./overflow-menu";

export function PocketSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "pocket";
  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Your pocket">
      {open && <PocketInside />}
    </BottomSheet>
  );
}

function PocketInside() {
  const { scraps, addScrap, deleteScrap } = useStore();
  const { showToast, openScrapFiling } = useUi();
  const [text, setText] = useState("");
  const [now] = useState(() => new Date());

  const jot = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText(""); // clear right away — the pocket is for rapid brain-dumps
    try {
      await addScrap(value);
    } catch {
      setText(value); // hand their words back rather than losing them
      showToast("That didn't save. Let's try again 🌿");
    }
  };

  const remove = (scrap: Scrap) => {
    const handle = deleteScrap(scrap.id);
    showToast("Scrap tossed", {
      action: { label: "Undo", onAction: handle.undo },
      onExpire: handle.commit,
    });
  };

  return (
    <div className="pt-1">
      <h2 className={sheetTitle}>Your pocket</h2>
      <p className="mt-1 text-[0.92rem] text-brown">
        Jot it now, tuck it into a list later.
      </p>

      <form onSubmit={jot} className="mt-4 flex gap-2">
        <input
          autoFocus
          aria-label="Jot it down"
          value={text}
          maxLength={SCRAP_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder="Jot it down before it flits off…"
          className={`flex-1 ${inputPrimary}`}
        />
        <Button type="submit" size="md" disabled={!text.trim()} className="shrink-0 self-stretch">
          Save
        </Button>
      </form>

      <div className="mt-5">
        {scraps.length === 0 ? (
          <p className="px-1 py-6 text-center text-[0.9rem] text-brown">
            Nothing tucked away. Jot the next little thing ✨
          </p>
        ) : (
          <>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
              {scraps.length >= POCKET_COZY_THRESHOLD
                ? "your pocket's getting cozy — tuck a few into lists? 🌿"
                : scraps.length === 1
                  ? "1 scrap waiting"
                  : `${scraps.length} scraps waiting`}
            </p>
            <AnimatePresence initial={false}>
              {scraps.map((s) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={softSpring}
                  className="mb-2 flex items-center gap-2 rounded-xl bg-cream-deep/40 p-2.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      openScrapFiling({
                        id: s.id,
                        text: s.text,
                        kind: s.detection && !("none" in s.detection) ? s.detection.kind : undefined,
                      })
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[0.95rem] font-semibold text-ink">{s.text}</p>
                    <p className="text-[0.78rem] font-medium text-brown-soft">{scrapAge(s.createdAt, now)}</p>
                  </button>
                  <OverflowMenu
                    ariaLabel={`Options for ${s.text}`}
                    items={[{ label: "Toss it", tone: "danger", onSelect: () => remove(s) }]}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the Pocket slot to `components/bottom-nav.tsx`**

Add imports: `import { useUi } from "@/lib/ui";` and `import { useStore } from "@/lib/store";`. Add an icon next to the others:

```tsx
function PocketIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.5 6.5c2.4-1.3 12.6-1.3 15 0v8.9a3.6 3.6 0 0 1-3.6 3.6H8.1a3.6 3.6 0 0 1-3.6-3.6V6.5Z"
        stroke="currentColor" strokeWidth="1.8"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.16 : 0}
      />
      <path d="M4.5 6.8C6.1 9.5 9 11 12 11s5.9-1.5 7.5-4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
```

In `BottomNav`, read the pocket state and render the button between Lists (index 0) and People. Restructure the render so the middle of the row is explicit:

```tsx
export function BottomNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { sheet, openPocketSheet } = useUi();
  const { scraps } = useStore();
  const pocketOpen = sheet?.kind === "pocket";

  const renderTab = ({ href, label, Icon, match }: (typeof TABS)[number]) => {
    const active = match(pathname);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 ${focusRingInset}`}
        style={{ color: active ? "var(--color-ink)" : "var(--color-brown-soft)" }}
      >
        {active && (
          <motion.span
            layoutId="nav-pill"
            transition={reduce ? { duration: 0 } : softSpring}
            className="absolute inset-0 rounded-xl bg-cream-deep"
          />
        )}
        <span className="relative">
          <Icon active={active} />
        </span>
        <span className="relative text-[0.75rem] font-bold tracking-wide">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
      <div className="pointer-events-auto mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex w-full max-w-[440px] items-stretch justify-around rounded-2xl border border-line/70 bg-paper/85 px-2 py-1.5 shadow-lift backdrop-blur-md">
        {renderTab(TABS[0])}
        <button
          type="button"
          onClick={openPocketSheet}
          aria-label={scraps.length > 0 ? `Pocket, ${scraps.length} waiting` : "Pocket"}
          className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 ${focusRingInset} ${pocketOpen ? "bg-cream-deep" : ""}`}
          style={{ color: pocketOpen ? "var(--color-ink)" : "var(--color-brown-soft)" }}
        >
          <span className="relative">
            <PocketIcon active={pocketOpen} />
            {scraps.length > 0 && (
              <span
                aria-hidden
                className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-pill bg-ink px-1 text-[0.62rem] font-bold leading-4 text-cream"
              >
                {scraps.length > 9 ? "9+" : scraps.length}
              </span>
            )}
          </span>
          <span className="relative text-[0.75rem] font-bold tracking-wide">Pocket</span>
        </button>
        {TABS.slice(1).map(renderTab)}
      </div>
    </nav>
  );
}
```

(The pocket button deliberately does **not** use the `nav-pill` `layoutId` — a route tab stays active while the sheet is open, and duplicate layoutIds would fight.)

- [ ] **Step 4: Mount the sheet in `components/app-shell.tsx`**

Add `import { PocketSheet } from "./pocket-sheet";` and render `<PocketSheet />` next to the other sheets (after `<AddItemModal />`).

- [ ] **Step 5: Verify by hand**

Run: `npx tsc --noEmit && npm run lint`, then start the app per the project's `verify` skill and check: Pocket appears in the nav → tap opens the sheet → jot two scraps (Enter keeps the sheet open, input clears) → badge shows 2 → reload, scraps persist → "Toss it" removes with a working Undo. Tapping a scrap row opens the add sheet (still unseeded — Tasks 6–7 finish that).

- [ ] **Step 6: Commit**

```bash
git add lib/ui.tsx components/pocket-sheet.tsx components/bottom-nav.tsx components/app-shell.tsx
git commit -m "feat(pocket): pocket sheet, nav slot with badge, capture and toss"
```

---

### Task 6: Lazy detection + one-tap suggestion chips

**Files:**
- Modify: `components/pocket-sheet.tsx`

**Interfaces:**
- Consumes: `detectScrap`, `DETECT_BATCH`, `bestListForKind`, `isTempScrapId` (Task 2); `setScrapDetection`, `fileScrap`, `addList` (store); `TEMPLATE_META` (`lib/types`).
- Produces: nothing new for later tasks — this completes the pocket surface.

- [ ] **Step 1: Add the detection effect and chip handler to `PocketInside`**

New imports in `pocket-sheet.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import {
  DETECT_BATCH, POCKET_COZY_THRESHOLD, SCRAP_MAX_LENGTH,
  bestListForKind, detectScrap, isTempScrapId, scrapAge,
} from "@/lib/scraps";
import { TEMPLATE_META, type ListTemplate } from "@/lib/types";
```

Extend the store destructure: `const { scraps, lists, addScrap, deleteScrap, setScrapDetection, fileScrap, addList } = useStore();`

Inside `PocketInside`, add:

```tsx
  // Lazy, once-ever detection: check up to DETECT_BATCH unchecked scraps per
  // open; results (including "none") persist, so this converges to no work.
  const inFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    const pending = scraps
      .filter((s) => s.detection === null && !isTempScrapId(s.id) && !inFlight.current.has(s.id))
      .slice(0, DETECT_BATCH);
    for (const s of pending) {
      inFlight.current.add(s.id);
      void detectScrap(s.text)
        .then((result) => setScrapDetection(s.id, result))
        .catch(() => {
          /* all providers down — stay unchecked, retry next open */
        })
        .finally(() => inFlight.current.delete(s.id));
    }
  }, [scraps, setScrapDetection]);

  const fileFromChip = async (scrap: Scrap) => {
    const d = scrap.detection;
    if (!d || "none" in d) return;
    const template = d.kind as ListTemplate;
    const tm = TEMPLATE_META[template];
    let target = bestListForKind(lists, d.kind);
    if (!target) {
      try {
        target = await addList({
          title: tm.label,
          emoji: tm.emoji,
          theme: tm.theme,
          template,
          defaultView: tm.defaultView,
        });
      } catch {
        showToast("That didn't save. Let's try again 🌿");
        return;
      }
    }
    const handle = fileScrap(scrap.id, target.id, {
      type: d.kind,
      title: d.title,
      subtitle: d.subtitle || undefined,
      status: tm.statuses[0],
      seed: d.title,
      imageUrl: d.imageUrl,
      meta: d.meta,
    });
    showToast(`Filed into ${target.title} ✨`, {
      action: { label: "Undo", onAction: handle.undo },
      onExpire: handle.commit,
    });
  };
```

- [ ] **Step 2: Render the chip on scrap rows**

Inside the scrap row (between the text button and the `OverflowMenu`):

```tsx
                  {s.detection && !("none" in s.detection) && (
                    <button
                      type="button"
                      onClick={() => void fileFromChip(s)}
                      className="shrink-0 rounded-pill bg-cream-deep px-2.5 py-1.5 text-[0.78rem] font-bold text-ink ring-1 ring-line/60 transition hover:bg-cream-deep/70"
                    >
                      →{" "}
                      {bestListForKind(lists, s.detection.kind)?.title ??
                        `new ${TEMPLATE_META[s.detection.kind as ListTemplate].label}`}
                      ?
                    </button>
                  )}
```

- [ ] **Step 3: Verify by hand**

With the app running: jot "past lives" → within a beat the row grows a "→ Watchlist?" chip (or "→ new Movie list?" with no movie list) → reload; chip is still there without a new search (network tab: no `/api/search` calls for it) → tap the chip → toast with Undo; the item lands in the movie list with its real poster → Undo puts the scrap back and removes the item. Jot "buy socks for dad" → no chip, ever.

- [ ] **Step 4: Commit**

```bash
git add components/pocket-sheet.tsx
git commit -m "feat(pocket): lazy enrichment detection and one-tap filing chips"
```

---

### Task 7: Scrap filing through the full add flow + "a new little list"

**Files:**
- Modify: `components/add-item-modal.tsx`

**Interfaces:**
- Consumes: `sheet.scrap` (`ScrapRef`, Task 5), `fileScrap` + `addList` (store), `TEMPLATE_META`.
- Produces: complete tap-through filing; the dormant global-add flow becomes reachable (with a destination "new little list" escape hatch).

- [ ] **Step 1: Thread the scrap into the flow**

In `AddItemModal`:

```tsx
  const open = sheet?.kind === "item";
  const presetListId = open ? sheet.listId : undefined;
  const scrap = open ? sheet.scrap : undefined;

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Add a little thing">
      {open && (
        <AddItemFlow
          key={presetListId ?? scrap?.id ?? "home"}
          presetListId={presetListId}
          scrap={scrap}
          onClose={closeSheet}
        />
      )}
    </BottomSheet>
  );
```

`AddItemFlow` signature and initial state (imports gain `type ScrapRef` from `@/lib/ui` and `type ListTemplate` stays as-is):

```tsx
function AddItemFlow({
  presetListId,
  scrap,
  onClose,
}: {
  presetListId?: string;
  scrap?: ScrapRef;
  onClose: () => void;
}) {
  const { lists, addItem, addList, fileScrap, fireCelebration } = useStore();
  // ...
  const [type, setType] = useState<ItemType>(presetList?.kind ?? scrap?.kind ?? "movie");
  const [query, setQuery] = useState(scrap?.text ?? "");
  // ...
  const [title, setTitle] = useState(scrap?.text ?? "");
```

(Seeding `query` makes the existing debounced search effect fire on mount — the results are already loading when the sheet appears. Seeding `title` covers the non-searchable manual path, whose input renders `query || title`.)

- [ ] **Step 2: The scrap save path**

Replace `save` with:

```tsx
  const save = async () => {
    const listId = targetListId ?? lists[0]?.id;
    if (!listId || saving) return;
    const input = {
      type,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      note: note.trim() || undefined,
      status,
      tags: tag.trim() ? [tag.trim()] : undefined,
      emoji: meta.aspect === "note" ? emoji : undefined,
      seed: seed || title,
      imageUrl,
      meta: pickedMeta,
    };

    if (scrap) {
      // deferred file: optimistic now, one transaction on toast expiry, undo restores
      const listTitle = lists.find((l) => l.id === listId)?.title ?? "your list";
      const handle = fileScrap(scrap.id, listId, input);
      onClose();
      showToast(`Filed into ${listTitle} ✨`, {
        action: { label: "Undo", onAction: handle.undo },
        onExpire: handle.commit,
      });
      return;
    }

    const wasEmpty = (lists.find((l) => l.id === listId)?.items.length ?? 0) === 0;
    setSaving(true);
    try {
      await addItem(listId, input);
      // rare milestone: this list just came alive
      if (wasEmpty) fireCelebration("confetti");
      onClose();
      showToast("Saved to your little world ✨");
    } catch {
      setSaving(false);
      showToast("That didn't save. Let's try again 🌿");
    }
  };
```

- [ ] **Step 3: "a new little list" in the details step**

In `AddItemFlow`, add state + handler and pass them down:

```tsx
  const [creatingList, setCreatingList] = useState(false);
  const createTargetList = async () => {
    if (creatingList) return;
    setCreatingList(true);
    try {
      const t = template; // presetList?.template ?? (type as ListTemplate), already derived above
      const m = TEMPLATE_META[t];
      const created = await addList({ title: m.label, emoji: m.emoji, theme: m.theme, template: t, defaultView: m.defaultView });
      setTargetListId(created.id);
    } catch {
      showToast("That didn't save. Let's try again 🌿");
    } finally {
      setCreatingList(false);
    }
  };
```

Pass `onCreateList={presetListId ? undefined : createTargetList}` and `creatingList={creatingList}` into `<DetailsStep …>`; add both to its props type (`onCreateList?: () => void; creatingList?: boolean`). In `DetailsStep`, inside the `setTargetListId && (…)` "save into" rail, append after the list buttons:

```tsx
            {onCreateList && (
              <button
                type="button"
                onClick={onCreateList}
                disabled={creatingList}
                className={`flex shrink-0 items-center gap-1.5 rounded-pill border border-dashed border-line px-3 py-2 text-[0.82rem] font-bold text-brown transition ${focusRing} disabled:opacity-50`}
              >
                ＋ a new little list
              </button>
            )}
```

- [ ] **Step 4: Verify by hand**

With the app running: jot "the bear" and a nonsense scrap → tap the nonsense scrap → sheet opens with the text pre-filled, type picker visible → switch to Food → pick an icon → details step → "save into" shows lists **plus** "＋ a new little list" → tap it → a Food list appears selected → save → toast "Filed into Food list ✨", scrap gone, Undo restores it. Then tap "the bear" → search results already loading with posters → pick one → save into the movie list. Also confirm a normal in-list add (＋ on a list page) still behaves exactly as before.

- [ ] **Step 5: Commit**

```bash
git add components/add-item-modal.tsx
git commit -m "feat(pocket): file scraps through the add flow, with a new-list escape hatch"
```

---

### Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Static + unit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all clean/green.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: End-to-end pass via the project's `verify` skill**

Follow `verify` (dev server, Clerk test signup). Walk the whole loop as a fresh user: onboarding → Pocket badge absent → jot 3 scraps (one real movie title, one real book title, one nonsense) → badge "3" → chips appear for the two real ones only → one-tap file the movie (creates "Movie list" if none) → Undo → redo → tap-through file the book with a note → toss the nonsense scrap → badge and pile agree throughout → reload: everything persisted. Check at 7+ scraps the cozy header appears, and at 320px width nothing overflows.

- [ ] **Step 4: Commit anything the pass shook out; otherwise done**

```bash
git status   # should be clean
```
