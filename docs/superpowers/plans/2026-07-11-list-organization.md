# Better Organization Inside Lists — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a single list real collection controls — sort (5 modes), drag-to-reorder, pin-to-top, move/copy between lists, filter by tag and person, duplicate a list, and an exact-duplicate-title warning on add.

**Architecture:** Sorting and filtering are pure client-side transforms over the existing optimistic store. Reorder, pin, move, copy, and duplicate are new server actions in `lib/actions.ts` that mutate the DB and return the mapped row(s); the store applies each change optimistically (no `revalidatePath`), mirroring the existing mutators. `ListItem.position` and `ListItem.pinned` already exist in the schema and only need wiring; the one migration adds `List.defaultSort`. Touch drag uses `@dnd-kit`.

**Tech Stack:** Next.js 16 (App Router, client components), Prisma 7 (Neon Postgres), React 19, `motion`, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/modifiers` + `@dnd-kit/utilities`, Vitest 4.

## Global Constraints

- **No em dashes** in any user-facing copy.
- **Optimistic-store pattern only** — never call `revalidatePath`/`revalidateTag`. Actions return mapped rows; the store applies changes locally and rolls back on failure via `signalSaveError()`. Mirror the existing mutators in `lib/store.tsx` exactly.
- **Ownership on every action** — every new action resolves the caller via `requireUserProfile()` and scopes every read/write by `userId: clerkUserId`; cross-list writes verify BOTH the item and the target list belong to the caller.
- **No free-form user content in analytics** — reuse only the existing `feature_used` event via `trackProductEvent("feature_used", { feature: "<slug>" })`. Do not add new event names.
- **440px mobile-first, touch-first** — every control works at 320-440px; reorder works with touch (drag handle carries `touch-none`).
- **This is a MODIFIED Next.js** (`AGENTS.md`) — check `node_modules/next/dist/docs/` before using framework APIs. `@dnd-kit` is client-only and unaffected.
- **Preserve `EXAMPLE_TAG`** handling wherever tags are read/written (it is filtered from display and re-appended on save).

---

## File Structure

- `prisma/schema.prisma` — add `List.defaultSort String?`.
- `prisma/migrations/20260711000000_list_default_sort/migration.sql` — new, hand-authored.
- `lib/sort.ts` — NEW. `SortMode`, `SORT_MODES`, `isSortMode`, `sortItems`, `isDuplicateTitle`. Pure, unit-tested.
- `lib/sort.test.ts` — NEW. Unit tests for `sortItems` + `isDuplicateTitle`.
- `lib/types.ts` — add `pinned?`/`position?` to `Item`; add `defaultSort?: SortMode` to `List`.
- `lib/server/serialize.ts` — `mapItem` reads `pinned`+`position`; `mapList` reads `defaultSort`.
- `lib/actions.ts` — 6 new actions: `setListSortAction`, `setItemPinnedAction`, `reorderItemsAction`, `moveItemAction`, `copyItemAction`, `duplicateListAction`.
- `lib/actions.organization.test.ts` — NEW. Action tests (mock prisma).
- `lib/store.tsx` — new optimistic mutators: `setListSort`, `reorderItems`, `setItemPinned`, `moveItem`, `copyItem`, `duplicateList`.
- `components/sort-control.tsx` — NEW. Sort-mode picker for the list header.
- `components/move-item-sheet.tsx` — NEW. Target-list picker with Move/Copy.
- `components/item-card.tsx` — pin toggle + "Move or copy" entry in `ItemEditor`.
- `lib/ui.tsx` — add `move-item` sheet kind + `openMoveItem`.
- `components/app-shell.tsx` — mount `<MoveItemSheet/>`.
- `app/app/(main)/list/[id]/page.tsx` — sort control, dnd reorder, tag/person filters, all wired.
- `components/add-item-modal.tsx` — duplicate-title confirm before save.
- `package.json` — add `@dnd-kit/*`.

---

## Task 1: Data-model + types + pure sort/dedup helpers

**Files:**
- Modify: `prisma/schema.prisma:57-74` (List model)
- Create: `prisma/migrations/20260711000000_list_default_sort/migration.sql`
- Create: `lib/sort.ts`
- Create: `lib/sort.test.ts`
- Modify: `lib/types.ts:117-136` (Item), `lib/types.ts:160-176` (List)
- Modify: `lib/server/serialize.ts:45-61` (mapItem), `lib/server/serialize.ts:65-81` (mapList)

**Interfaces:**
- Produces: `SortMode = "recent" | "title" | "rating" | "status" | "custom"`; `SORT_MODES: { id: SortMode; label: string }[]`; `isSortMode(v?: string): v is SortMode`; `sortItems(items: Item[], mode: SortMode, statusOrder: StatusId[]): Item[]`; `isDuplicateTitle(title: string, items: Pick<Item,"title">[]): boolean`. `Item` gains `pinned?: boolean` and `position?: number | null`. `List` gains `defaultSort?: SortMode`.

- [ ] **Step 1: Add the schema column**

In `prisma/schema.prisma`, inside `model List`, add after the `pinned` line (currently `prisma/schema.prisma:65`):

```prisma
  pinned          Boolean      @default(false)
  defaultSort     String?
```

- [ ] **Step 2: Hand-author the migration**

Create `prisma/migrations/20260711000000_list_default_sort/migration.sql`:

```sql
-- Add per-list saved sort preference (holds a SortMode id; null => "recent")
ALTER TABLE "List" ADD COLUMN "defaultSort" TEXT;
```

- [ ] **Step 3: Apply + regenerate**

Run (from repo root):
```bash
npx prisma migrate deploy && npx prisma generate && rm -rf .next/types .next/dev/types
```
Expected: `migrate deploy` reports the migration applied (or "already applied" if re-run); `generate` succeeds. Then confirm:
```bash
npx prisma migrate status
```
Expected: "Database schema is up to date!"

- [ ] **Step 4: Write the failing sort tests**

Create `lib/sort.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sortItems, isDuplicateTitle, isSortMode } from "./sort";
import type { Item, StatusId } from "./types";

// minimal item factory — only the fields sortItems reads
function item(p: Partial<Item> & { id: string; title: string }): Item {
  return { type: "custom", ...p } as Item;
}

const STATUS_ORDER: StatusId[] = ["want-to-watch", "watched", "favorite", "not-for-me"];

describe("sortItems", () => {
  it("recent keeps the incoming order", () => {
    const items = [item({ id: "a", title: "B" }), item({ id: "b", title: "A" })];
    expect(sortItems(items, "recent", STATUS_ORDER).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("title sorts case-insensitively A to Z", () => {
    const items = [item({ id: "a", title: "banana" }), item({ id: "b", title: "Apple" })];
    expect(sortItems(items, "title", STATUS_ORDER).map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("rating sorts high to low with unrated last", () => {
    const items = [
      item({ id: "a", title: "a", rating: 2 }),
      item({ id: "b", title: "b" }),
      item({ id: "c", title: "c", rating: 5 }),
    ];
    expect(sortItems(items, "rating", STATUS_ORDER).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("status groups by the template order, unknown/undefined last", () => {
    const items = [
      item({ id: "a", title: "a", status: "favorite" }),
      item({ id: "b", title: "b" }),
      item({ id: "c", title: "c", status: "want-to-watch" }),
    ];
    expect(sortItems(items, "status", STATUS_ORDER).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("custom sorts by position ascending, null positions last", () => {
    const items = [
      item({ id: "a", title: "a", position: 2 }),
      item({ id: "b", title: "b" }),
      item({ id: "c", title: "c", position: 0 }),
    ];
    expect(sortItems(items, "custom", STATUS_ORDER).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("pinned items float to the top in every mode, preserving mode order within groups", () => {
    const items = [
      item({ id: "a", title: "A" }),
      item({ id: "b", title: "B", pinned: true }),
      item({ id: "c", title: "C" }),
      item({ id: "d", title: "D", pinned: true }),
    ];
    // title mode: within pinned -> B,D ; within rest -> A,C
    expect(sortItems(items, "title", STATUS_ORDER).map((i) => i.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const items = [item({ id: "a", title: "B" }), item({ id: "b", title: "A" })];
    const copy = [...items];
    sortItems(items, "title", STATUS_ORDER);
    expect(items).toEqual(copy);
  });
});

describe("isDuplicateTitle", () => {
  const items = [{ title: "Dune" }, { title: "  The Bear " }];
  it("matches case-insensitively and trimmed", () => {
    expect(isDuplicateTitle("dune", items)).toBe(true);
    expect(isDuplicateTitle("the bear", items)).toBe(true);
  });
  it("does not match a different title", () => {
    expect(isDuplicateTitle("Dune Part Two", items)).toBe(false);
  });
  it("is false for an empty/whitespace title or empty list", () => {
    expect(isDuplicateTitle("   ", items)).toBe(false);
    expect(isDuplicateTitle("Dune", [])).toBe(false);
  });
});

describe("isSortMode", () => {
  it("accepts known modes and rejects others", () => {
    expect(isSortMode("custom")).toBe(true);
    expect(isSortMode("nonsense")).toBe(false);
    expect(isSortMode(undefined)).toBe(false);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx vitest run lib/sort.test.ts`
Expected: FAIL (module `./sort` not found).

- [ ] **Step 6: Implement `lib/sort.ts`**

Create `lib/sort.ts`:

```ts
import type { Item, StatusId } from "./types";

export type SortMode = "recent" | "title" | "rating" | "status" | "custom";

export const SORT_MODES: { id: SortMode; label: string }[] = [
  { id: "recent", label: "Recently added" },
  { id: "title", label: "Title A to Z" },
  { id: "rating", label: "Highest rated" },
  { id: "status", label: "By status" },
  { id: "custom", label: "Custom order" },
];

export function isSortMode(v: string | undefined | null): v is SortMode {
  return (
    v === "recent" || v === "title" || v === "rating" || v === "status" || v === "custom"
  );
}

function sortByMode(items: Item[], mode: SortMode, statusOrder: StatusId[]): Item[] {
  switch (mode) {
    case "recent":
      // already delivered newest-first; keep as-is
      return items;
    case "title":
      return [...items].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      );
    case "rating":
      return [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "status": {
      const rank = (s?: string) => {
        const i = s ? statusOrder.indexOf(s as StatusId) : -1;
        return i === -1 ? statusOrder.length : i;
      };
      return [...items].sort((a, b) => rank(a.status) - rank(b.status));
    }
    case "custom":
      return [...items].sort(
        (a, b) =>
          (a.position ?? Number.POSITIVE_INFINITY) - (b.position ?? Number.POSITIVE_INFINITY)
      );
  }
}

/**
 * Order a list's items by the chosen mode, then float pinned items to the top.
 * Array.prototype.sort is stable, so the mode order is preserved within the
 * pinned and unpinned groups. Never mutates the input.
 */
export function sortItems(items: Item[], mode: SortMode, statusOrder: StatusId[]): Item[] {
  const base = sortByMode(items, mode, statusOrder);
  return [...base].sort(
    (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
  );
}

/** True when `title` (trimmed, case-insensitive) already exists among `items`. */
export function isDuplicateTitle(title: string, items: Pick<Item, "title">[]): boolean {
  const norm = title.trim().toLowerCase();
  if (!norm) return false;
  return items.some((i) => i.title.trim().toLowerCase() === norm);
}
```

- [ ] **Step 7: Extend the `Item` and `List` types**

In `lib/types.ts`, in the `Item` interface (`lib/types.ts:117-136`), add before `fresh?`:

```ts
  /** the person this gift idea (or item generally) is linked to, if any */
  personId?: string;
  /** pinned items float to the top of the list in every sort mode */
  pinned?: boolean;
  /** manual sort position; null/undefined => unpositioned (sorts last in custom) */
  position?: number | null;
  /** newly added this session — used for the gentle pop-in */
  fresh?: boolean;
```

In the `List` interface (`lib/types.ts:160-176`), add after `defaultView?`:

```ts
  /** the user's chosen browsing view; falls back to the template default */
  defaultView?: ViewMode;
  /** the user's chosen sort for this list; falls back to "recent" */
  defaultSort?: SortMode;
```

Add the import at the top of `lib/types.ts` (after the existing `import type { StickerName }` line):

```ts
import type { SortMode } from "./sort";
```

Note: `lib/sort.ts` imports types from `lib/types.ts` and vice-versa — this is a type-only cycle (`import type`), which TypeScript resolves without a runtime cycle. Keep both imports `import type`.

- [ ] **Step 8: Wire the serializers**

In `lib/server/serialize.ts`, in `mapItem` (`lib/server/serialize.ts:45-61`), add two fields to the returned object (after `personId`):

```ts
    personId: row.personId ?? undefined,
    pinned: row.pinned,
    position: row.position ?? null,
  };
```

In `mapList` (`lib/server/serialize.ts:65-81`), add after `defaultView`:

```ts
    defaultView: row.defaultViewMode as ViewMode,
    defaultSort: (row.defaultSort as SortMode | null) ?? undefined,
    pinned: row.pinned,
```

Add the import at the top of `lib/server/serialize.ts` (in the `@/lib/types` import block, add `type SortMode`):

```ts
  type Scrap,
  type SortMode,
  type StatusId,
```

- [ ] **Step 9: Run the sort tests + typecheck**

Run: `npx vitest run lib/sort.test.ts && npx tsc --noEmit`
Expected: sort tests PASS; tsc clean.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/sort.ts lib/sort.test.ts lib/types.ts lib/server/serialize.ts
git commit -m "feat(organization): data model, types, and pure sort/dedup helpers"
```

---

## Task 2: Server actions

**Files:**
- Modify: `lib/actions.ts` (add 6 actions; add `SortMode` import)
- Create: `lib/actions.organization.test.ts`

**Interfaces:**
- Consumes: `requireUserProfile`, `prisma`, `mapItem`, `mapList`, `Prisma`, `ItemType`, `SortMode` (all already imported in `lib/actions.ts` except `SortMode`).
- Produces:
  - `setListSortAction(listId: string, sort: SortMode): Promise<void>`
  - `setItemPinnedAction(itemId: string, pinned: boolean): Promise<Item | null>`
  - `reorderItemsAction(listId: string, orderedIds: string[]): Promise<void>`
  - `moveItemAction(itemId: string, targetListId: string): Promise<Item | null>`
  - `copyItemAction(itemId: string, targetListId: string): Promise<Item | null>`
  - `duplicateListAction(listId: string): Promise<List | null>`

- [ ] **Step 1: Write the failing action tests**

Create `lib/actions.organization.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireUserProfile } = vi.hoisted(() => ({
  requireUserProfile: vi.fn(),
}));

// prisma surface used by the organization actions
const { prisma } = vi.hoisted(() => ({
  prisma: {
    list: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    listItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/server/profile", () => ({
  requireUserProfile,
  getCurrentUserProfile: vi.fn(),
  ensureProfileForClerkUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
// analytics is not exercised here; stub the recorder so imports resolve
vi.mock("@/lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics")>();
  return { ...actual, recordProductEvent: vi.fn() };
});
// clerk client is imported at module top for deleteAccountAction
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

import {
  setListSortAction,
  setItemPinnedAction,
  reorderItemsAction,
  moveItemAction,
  copyItemAction,
  duplicateListAction,
} from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireUserProfile.mockResolvedValue({ clerkUserId: "u1" });
  // default $transaction: run the array of promises (or the callback)
  prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[])
  );
});

describe("setListSortAction", () => {
  it("scopes the write to the caller's own list", async () => {
    prisma.list.updateMany.mockResolvedValue({ count: 1 });
    await setListSortAction("l1", "title");
    expect(prisma.list.updateMany).toHaveBeenCalledWith({
      where: { id: "l1", userId: "u1" },
      data: { defaultSort: "title" },
    });
  });
});

describe("setItemPinnedAction", () => {
  it("returns null when the item is not the caller's", async () => {
    prisma.listItem.findFirst.mockResolvedValue(null);
    expect(await setItemPinnedAction("i1", true)).toBeNull();
    expect(prisma.listItem.update).not.toHaveBeenCalled();
  });
  it("writes pinned and returns the mapped item", async () => {
    prisma.listItem.findFirst.mockResolvedValue({ id: "i1", metadata: { type: "movie" } });
    prisma.listItem.update.mockResolvedValue({
      id: "i1", title: "X", tags: [], metadata: { type: "movie" }, pinned: true, position: null,
    });
    const res = await setItemPinnedAction("i1", true);
    expect(prisma.listItem.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { pinned: true } });
    expect(res?.pinned).toBe(true);
  });
});

describe("reorderItemsAction", () => {
  it("does nothing when the list is not the caller's", async () => {
    prisma.list.findFirst.mockResolvedValue(null);
    await reorderItemsAction("l1", ["a", "b"]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("rejects when orderedIds do not exactly match the list's items", async () => {
    prisma.list.findFirst.mockResolvedValue({ id: "l1" });
    prisma.listItem.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    await reorderItemsAction("l1", ["a", "STRAY"]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("writes position=index for each id in order", async () => {
    prisma.list.findFirst.mockResolvedValue({ id: "l1" });
    prisma.listItem.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    prisma.listItem.update.mockImplementation((args: unknown) => args);
    await reorderItemsAction("l1", ["b", "a"]);
    expect(prisma.listItem.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { position: 0 } });
    expect(prisma.listItem.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { position: 1 } });
  });
});

describe("moveItemAction", () => {
  it("requires both the item and the target list to be the caller's", async () => {
    prisma.listItem.findFirst.mockResolvedValue({ id: "i1", metadata: {} });
    prisma.list.findFirst.mockResolvedValue(null); // target not owned
    expect(await moveItemAction("i1", "l2")).toBeNull();
    expect(prisma.listItem.update).not.toHaveBeenCalled();
  });
  it("reassigns listId and appends at the target end", async () => {
    prisma.listItem.findFirst.mockResolvedValue({ id: "i1", metadata: { type: "book" } });
    prisma.list.findFirst.mockResolvedValue({ id: "l2" });
    prisma.listItem.aggregate.mockResolvedValue({ _max: { position: 4 } });
    prisma.listItem.update.mockResolvedValue({ id: "i1", title: "X", tags: [], metadata: { type: "book" }, pinned: false, position: 5 });
    await moveItemAction("i1", "l2");
    expect(prisma.listItem.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { listId: "l2", position: 5 },
    });
  });
});

describe("copyItemAction", () => {
  it("creates a new row in the target with pinned reset to false", async () => {
    prisma.listItem.findFirst.mockResolvedValue({
      id: "i1", title: "X", subtitle: null, note: null, status: "watched",
      emoji: null, imageUrl: null, tags: ["t"], metadata: { type: "movie" },
      personId: null, pinned: true,
    });
    prisma.list.findFirst.mockResolvedValue({ id: "l2" });
    prisma.listItem.aggregate.mockResolvedValue({ _max: { position: null } });
    prisma.listItem.create.mockResolvedValue({ id: "i2", title: "X", tags: ["t"], metadata: { type: "movie" }, pinned: false, position: null });
    await copyItemAction("i1", "l2");
    const arg = prisma.listItem.create.mock.calls[0][0].data;
    expect(arg.listId).toBe("l2");
    expect(arg.pinned).toBe(false);
    expect(arg.title).toBe("X");
    expect(arg.tags).toEqual(["t"]);
  });
});

describe("duplicateListAction", () => {
  it("returns null when the source is not the caller's", async () => {
    prisma.list.findFirst.mockResolvedValue(null);
    expect(await duplicateListAction("l1")).toBeNull();
  });
  it("copies the list with a (copy) title and deep-copies items", async () => {
    prisma.list.findFirst.mockResolvedValue({
      id: "l1", title: "Films", emoji: "🎬", templateType: "movie", themeColor: "blush",
      defaultViewMode: "grid", defaultSort: "title", description: null, pinned: true,
      items: [{ title: "A", subtitle: null, note: null, status: null, emoji: null, imageUrl: null, tags: [], metadata: { type: "movie" }, position: 0, pinned: false, personId: null }],
    });
    prisma.list.create.mockResolvedValue({
      id: "l2", title: "Films (copy)", emoji: "🎬", templateType: "movie", themeColor: "blush",
      defaultViewMode: "grid", defaultSort: "title", pinned: false, items: [],
    });
    const res = await duplicateListAction("l1");
    const arg = prisma.list.create.mock.calls[0][0].data;
    expect(arg.title).toBe("Films (copy)");
    expect(arg.pinned).toBe(false);
    expect(arg.items.create).toHaveLength(1);
    expect(res?.title).toBe("Films (copy)");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/actions.organization.test.ts`
Expected: FAIL (the six actions are not exported yet).

- [ ] **Step 3: Add the `SortMode` import**

In `lib/actions.ts`, add `SortMode` to the `@/lib/types` import block (near `type Scrap,`):

```ts
  type Scrap,
  type SortMode,
  type StatusId,
```

Wait — `SortMode` lives in `lib/sort.ts`, not `lib/types.ts`. Add a separate import instead, right after the `@/lib/types` import block:

```ts
import type { SortMode } from "@/lib/sort";
```

- [ ] **Step 4: Implement the six actions**

In `lib/actions.ts`, add this block at the end of the `/* ── items ── */` section (immediately after `deleteItemAction`, before `/* ── scraps ── */`):

```ts
/* ── organization: sort, pin, reorder, move, copy ────────────────────── */

export async function setListSortAction(listId: string, sort: SortMode): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  await prisma.list.updateMany({
    where: { id: listId, userId: clerkUserId },
    data: { defaultSort: sort },
  });
}

export async function setItemPinnedAction(itemId: string, pinned: boolean): Promise<Item | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.listItem.findFirst({ where: { id: itemId, userId: clerkUserId } });
  if (!existing) return null;
  const row = await prisma.listItem.update({ where: { id: itemId }, data: { pinned } });
  const fallbackType = ((existing.metadata ?? {}) as unknown as { type?: ItemType }).type ?? "custom";
  return mapItem(row, fallbackType);
}

export async function reorderItemsAction(listId: string, orderedIds: string[]): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  const list = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    select: { id: true },
  });
  if (!list) return;
  // orderedIds must be exactly this list's items — a foreign or missing id
  // aborts the whole reorder rather than corrupting positions.
  const owned = await prisma.listItem.findMany({
    where: { listId, userId: clerkUserId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((i) => i.id));
  if (orderedIds.length !== ownedIds.size || orderedIds.some((id) => !ownedIds.has(id))) return;
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.listItem.update({ where: { id }, data: { position: index } })
    )
  );
}

export async function moveItemAction(itemId: string, targetListId: string): Promise<Item | null> {
  const { clerkUserId } = await requireUserProfile();
  const item = await prisma.listItem.findFirst({ where: { id: itemId, userId: clerkUserId } });
  if (!item) return null;
  const target = await prisma.list.findFirst({
    where: { id: targetListId, userId: clerkUserId },
    select: { id: true },
  });
  if (!target) return null;
  const max = await prisma.listItem.aggregate({
    where: { listId: targetListId },
    _max: { position: true },
  });
  const nextPos = max._max.position == null ? null : max._max.position + 1;
  const row = await prisma.listItem.update({
    where: { id: itemId },
    data: { listId: targetListId, position: nextPos },
  });
  const fallbackType = ((item.metadata ?? {}) as unknown as { type?: ItemType }).type ?? "custom";
  return mapItem(row, fallbackType);
}

export async function copyItemAction(itemId: string, targetListId: string): Promise<Item | null> {
  const { clerkUserId } = await requireUserProfile();
  const item = await prisma.listItem.findFirst({ where: { id: itemId, userId: clerkUserId } });
  if (!item) return null;
  const target = await prisma.list.findFirst({
    where: { id: targetListId, userId: clerkUserId },
    select: { id: true },
  });
  if (!target) return null;
  const max = await prisma.listItem.aggregate({
    where: { listId: targetListId },
    _max: { position: true },
  });
  const nextPos = max._max.position == null ? null : max._max.position + 1;
  const row = await prisma.listItem.create({
    data: {
      listId: targetListId,
      userId: clerkUserId,
      title: item.title,
      subtitle: item.subtitle,
      note: item.note,
      status: item.status,
      emoji: item.emoji,
      imageUrl: item.imageUrl,
      tags: item.tags,
      metadata: item.metadata as Prisma.InputJsonValue,
      personId: item.personId,
      position: nextPos,
      pinned: false,
    },
  });
  const fallbackType = ((item.metadata ?? {}) as unknown as { type?: ItemType }).type ?? "custom";
  return mapItem(row, fallbackType);
}

export async function duplicateListAction(listId: string): Promise<List | null> {
  const { clerkUserId } = await requireUserProfile();
  const source = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  if (!source) return null;
  const row = await prisma.list.create({
    data: {
      userId: clerkUserId,
      title: `${source.title} (copy)`,
      emoji: source.emoji,
      templateType: source.templateType,
      themeColor: source.themeColor,
      defaultViewMode: source.defaultViewMode,
      defaultSort: source.defaultSort,
      description: source.description,
      pinned: false,
      items: {
        create: source.items.map((it) => ({
          userId: clerkUserId,
          title: it.title,
          subtitle: it.subtitle,
          note: it.note,
          status: it.status,
          emoji: it.emoji,
          imageUrl: it.imageUrl,
          tags: it.tags,
          metadata: it.metadata as Prisma.InputJsonValue,
          position: it.position,
          pinned: it.pinned,
          personId: it.personId,
        })),
      },
    },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  return mapList(row);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/actions.organization.test.ts && npx tsc --noEmit`
Expected: PASS; tsc clean.

- [ ] **Step 6: Commit**

```bash
git add lib/actions.ts lib/actions.organization.test.ts
git commit -m "feat(organization): server actions for sort, pin, reorder, move, copy, duplicate"
```

---

## Task 3: Sort control + custom-order drag reorder

**Files:**
- Modify: `package.json` (add `@dnd-kit/*`)
- Modify: `lib/store.tsx` (add `setListSort`, `reorderItems`)
- Create: `components/sort-control.tsx`
- Modify: `app/app/(main)/list/[id]/page.tsx` (sort state, sort control, dnd reorder, apply `sortItems`)

**Interfaces:**
- Consumes: `sortItems`, `SORT_MODES`, `SortMode`, `isSortMode` (Task 1); `setListSortAction`, `reorderItemsAction` (Task 2); `trackProductEvent` from `@/lib/analytics-client`.
- Produces on the store: `setListSort(listId: string, sort: SortMode): void`; `reorderItems(listId: string, orderedIds: string[]): void`.

- [ ] **Step 1: Add the dependencies**

Run (from repo root):
```bash
npm install @dnd-kit/core@^6 @dnd-kit/sortable@^10 @dnd-kit/modifiers@^9 @dnd-kit/utilities@^3
```
Expected: installs succeed; `package.json` gains the four `@dnd-kit/*` entries. (`postinstall` runs `prisma generate` — that is fine.)

- [ ] **Step 2: Add the store mutators**

In `lib/store.tsx`:

(a) Add imports. In the `./actions` import block add `reorderItemsAction, setListSortAction`; and add a new import for the analytics client after the `./scraps` import:

```ts
import { SCRAP_MAX_LENGTH, type DetectionResult } from "./scraps";
import { trackProductEvent } from "./analytics-client";
import type { SortMode } from "./sort";
```

(b) In the `StoreValue` interface, add after `setListView`:

```ts
  setListView: (listId: string, view: ViewMode) => void;
  setListSort: (listId: string, sort: SortMode) => void;
  reorderItems: (listId: string, orderedIds: string[]) => void;
```

(c) Implement the mutators. Add immediately after `setListView` (`lib/store.tsx:198`):

```ts
  const setListSort = useCallback<StoreValue["setListSort"]>((listId, sort) => {
    let before: List | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l;
        return { ...l, defaultSort: sort };
      })
    );
    if (isTempId(listId)) return;
    void setListSortAction(listId, sort).catch((err) => {
      console.error("setListSort failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? snap : l)));
      signalSaveError();
    });
  }, [signalSaveError]);

  const reorderItems = useCallback<StoreValue["reorderItems"]>((listId, orderedIds) => {
    let before: Item[] | undefined;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        before = l.items;
        const byId = new Map(l.items.map((i) => [i.id, i]));
        // reflect the new order AND stamp concrete positions so custom sort holds
        const items = orderedIds
          .map((id, index) => {
            const it = byId.get(id);
            return it ? { ...it, position: index } : null;
          })
          .filter((i): i is Item => i !== null);
        return { ...l, items };
      })
    );
    trackProductEvent("feature_used", { feature: "items_reordered" });
    if (isTempId(listId)) return;
    void reorderItemsAction(listId, orderedIds).catch((err) => {
      console.error("reorderItems failed", err);
      const snap = before;
      if (snap) setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, items: snap } : l)));
      signalSaveError();
    });
  }, [signalSaveError]);
```

(d) Add `setListSort` and `reorderItems` to BOTH the `value` object and the dependency array of the `useMemo` (`lib/store.tsx:771-832`), right after the existing `setListView` entry in each.

- [ ] **Step 3: Create the sort control**

Create `components/sort-control.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { tap } from "@/lib/motion";
import { focusRing, focusRingInset } from "@/lib/a11y";
import { SORT_MODES, type SortMode } from "@/lib/sort";

/** A labeled trigger that opens an anchored popover of the five sort modes. */
export function SortControl({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (v: SortMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // return focus to the trigger on close (Escape / select / tap-away)
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const portal = (
    <AnimatePresence>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label="Sort by"
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={
              rect
                ? { position: "fixed", top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) }
                : { position: "fixed", top: 0, right: 8 }
            }
            className="z-50 min-w-[11rem] overflow-hidden rounded-xl bg-paper p-1 shadow-lift ring-1 ring-line/60"
          >
            {SORT_MODES.map((m) => {
              const active = m.id === value;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setOpen(false);
                    onChange(m.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3.5 py-2.5 text-left text-[0.92rem] font-semibold transition-colors hover:bg-cream-deep ${focusRingInset} ${
                    active ? "text-ink" : "text-brown"
                  }`}
                >
                  <span aria-hidden className={`w-3 ${active ? "opacity-100" : "opacity-0"}`}>✓</span>
                  {m.label}
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const currentLabel = SORT_MODES.find((m) => m.id === value)?.label ?? "Sort";

  return (
    <div className="relative">
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={tap}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort by ${currentLabel}`}
        title={`Sort: ${currentLabel}`}
        onClick={() => {
          if (!open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
          setOpen((o) => !o);
        }}
        className={`inline-flex h-10 items-center gap-1.5 rounded-pill bg-paper px-3 text-[0.82rem] font-bold text-brown shadow-soft ring-1 ring-line/60 ${focusRing}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden>
          <path d="M7 5v14M7 19l-3-3M7 5l3 3" />
          <line x1="13" y1="7" x2="20" y2="7" />
          <line x1="13" y1="12" x2="18" y2="12" />
          <line x1="13" y1="17" x2="16" y2="17" />
        </svg>
        <span className="max-w-[6.5rem] truncate">{currentLabel}</span>
      </motion.button>
      {mounted && createPortal(portal, document.body)}
    </div>
  );
}
```

- [ ] **Step 4: Wire sort + reorder into the list detail page**

Edit `app/app/(main)/list/[id]/page.tsx`.

(a) Add imports at the top (after the existing component imports):

```ts
import { SortControl } from "@/components/sort-control";
import { sortItems, isSortMode, type SortMode } from "@/lib/sort";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
```

(b) Add a helper for the list's saved sort, next to `defaultViewFor` (`app/app/(main)/list/[id]/page.tsx:24`):

```ts
function defaultSortFor(list?: Pick<List, "defaultSort">): SortMode {
  return list?.defaultSort ?? "recent";
}
```

(c) In `ListDetailScreen`, pull `setListSort, reorderItems` from the store and add sort state:

```ts
  const { setListView, setListSort, reorderItems, deleteList } = useStore();
```
```ts
  const [view, setView] = useState<ViewMode>(() => defaultViewFor(list));
  const [sort, setSort] = useState<SortMode>(() => defaultSortFor(list));
  const [query, setQuery] = useState("");
```

(d) Add `changeSort` next to `changeView`:

```ts
  const changeSort = (next: SortMode) => {
    setSort(next);
    if (list) setListSort(list.id, next);
  };
```

(e) In the per-list reset effect (`app/app/(main)/list/[id]/page.tsx:50-57`), also reset sort:

```ts
    setFilter("all");
    setQuery("");
    setView(defaultViewFor(list));
    setSort(defaultSortFor(list));
```

(f) Replace the `visible` memo (`app/app/(main)/list/[id]/page.tsx:72-80`) so it filters THEN sorts:

```ts
  const visible = useMemo(() => {
    if (!list) return [];
    const byStatus = filterItemsByStatus(list.items, filter);
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? byStatus
      : byStatus.filter(
          (i) => i.title.toLowerCase().includes(q) || (i.note ?? "").toLowerCase().includes(q)
        );
    return sortItems(filtered, sort, statusesForList(list));
  }, [list, filter, query, sort]);
```

(g) Reorder is only offered on the unfiltered custom view. Add, after `visible`:

```ts
  const dragEnabled =
    !!list && sort === "custom" && filter === "all" && query.trim().length === 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!list || !over || active.id === over.id) return;
    const ids = visible.map((i) => i.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorderItems(list.id, arrayMove(ids, oldIndex, newIndex));
  };
```

Note: `useSensors`/`useSensor` are hooks and must be called unconditionally on every render, which they are here (before the early `if (!list)` return is fine because these lines sit above it — keep them above the `if (!list) return` block).

(h) Add the `SortControl` to the sticky control bar. In the `<div className="mb-2 flex items-center justify-end gap-2">` block (`app/app/(main)/list/[id]/page.tsx:175`), add the sort control just before `<ViewToggle .../>`:

```tsx
            <SortControl value={sort} onChange={changeSort} />
            <ViewToggle value={view} onChange={changeView} />
```

(i) Render the reorderable branch. Replace the final `visible.map(...)` render block (`app/app/(main)/list/[id]/page.tsx:249-271`, the `<AnimatePresence mode="wait">...` element) with a branch on `dragEnabled`:

```tsx
        ) : dragEnabled ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={visible.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className={layoutClass}>
                {visible.map((item) => (
                  <SortableItemRow key={item.id} list={list} item={item} view={view} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              className={layoutClass}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {visible.map((item, i) => (
                <motion.div
                  key={item.id}
                  className={rowClass}
                  layout={!skipLayout}
                  initial={reduce ? false : { opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={reduce ? softSpring : { ...softSpring, delay: Math.min(i, 8) * 0.04 }}
                >
                  <ItemCard listId={list.id} item={item} view={view} statuses={statusesForList(list)} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
```

(j) Add the `SortableItemRow` component at the bottom of the file (after `ListDetailScreen`):

```tsx
function SortableItemRow({
  list,
  item,
  view,
}: {
  list: List;
  item: import("@/lib/types").Item;
  view: ViewMode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1.5">
      <button
        type="button"
        aria-label={`Reorder ${item.title}`}
        {...attributes}
        {...listeners}
        className={`mt-1 grid h-9 w-6 shrink-0 touch-none cursor-grab place-items-center rounded-md text-brown-soft/70 transition-colors hover:bg-cream-deep hover:text-ink active:cursor-grabbing ${focusRing}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <ItemCard listId={list.id} item={item} view={view} statuses={statusesForList(list)} />
      </div>
    </div>
  );
}
```

Note: in custom-drag mode `layoutClass` is used as the flex/grid wrapper — that is fine; the grip + card sit in a flex row per item. The drag handle carries `touch-none` so touch-drag is not stolen by scroll, and the card's tap-to-expand still works because the handle is a separate target and the `PointerSensor` needs 6px of movement to start a drag.

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc clean; all tests pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/store.tsx components/sort-control.tsx "app/app/(main)/list/[id]/page.tsx"
git commit -m "feat(organization): sort control and touch drag-to-reorder in custom mode"
```

---

## Task 4: Pin an item + move/copy between lists

**Files:**
- Modify: `lib/store.tsx` (add `setItemPinned`, `moveItem`, `copyItem`)
- Modify: `lib/ui.tsx` (add `move-item` sheet kind + `openMoveItem`)
- Create: `components/move-item-sheet.tsx`
- Modify: `components/app-shell.tsx` (mount `<MoveItemSheet/>`)
- Modify: `components/item-card.tsx` (pin toggle + "Move or copy" button in `ItemEditor`)

**Interfaces:**
- Consumes: `setItemPinnedAction`, `moveItemAction`, `copyItemAction` (Task 2); `trackProductEvent`.
- Produces on the store: `setItemPinned(listId, itemId, pinned): void`; `moveItem(fromListId, itemId, toListId): void`; `copyItem(fromItem: Item, toListId: string): Promise<void>`. On the UI context: `openMoveItem(listId: string, itemId: string): void`.

- [ ] **Step 1: Add the store mutators**

In `lib/store.tsx`:

(a) Add to the `./actions` import block: `copyItemAction, moveItemAction, setItemPinnedAction`.

(b) In the `StoreValue` interface, add after `deleteItem`:

```ts
  deleteItem: (listId: string, itemId: string) => Promise<void>;
  setItemPinned: (listId: string, itemId: string, pinned: boolean) => void;
  moveItem: (fromListId: string, itemId: string, toListId: string) => void;
  copyItem: (fromItem: Item, toListId: string) => Promise<void>;
```

(c) Implement, immediately after `deleteItem` (`lib/store.tsx:405`):

```ts
  const setItemPinned = useCallback<StoreValue["setItemPinned"]>((listId, itemId, pinned) => {
    let before: Item | undefined;
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) => {
                if (i.id !== itemId) return i;
                before = i;
                return { ...i, pinned };
              }),
            }
          : l
      )
    );
    if (pinned) trackProductEvent("feature_used", { feature: "item_pinned" });
    if (isTempId(itemId)) return;
    void setItemPinnedAction(itemId, pinned).catch((err) => {
      console.error("setItemPinned failed", err);
      const snap = before;
      if (snap)
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId ? { ...l, items: l.items.map((i) => (i.id === itemId ? snap : i)) } : l
          )
        );
      signalSaveError();
    });
  }, [signalSaveError]);

  const moveItem = useCallback<StoreValue["moveItem"]>((fromListId, itemId, toListId) => {
    if (fromListId === toListId) return;
    let moved: Item | undefined;
    let fromSnap: List | undefined;
    let toSnap: List | undefined;
    setLists((prev) => {
      const from = prev.find((l) => l.id === fromListId);
      moved = from?.items.find((i) => i.id === itemId);
      if (!moved) return prev;
      fromSnap = from;
      toSnap = prev.find((l) => l.id === toListId);
      const m = moved;
      return prev.map((l) => {
        if (l.id === fromListId) return { ...l, items: l.items.filter((i) => i.id !== itemId) };
        if (l.id === toListId)
          return { ...l, items: [{ ...m, position: null, fresh: true }, ...l.items] };
        return l;
      });
    });
    if (!moved) return;
    trackProductEvent("feature_used", { feature: "item_moved" });
    if (isTempId(itemId)) return;
    void moveItemAction(itemId, toListId)
      .then((row) => {
        if (row)
          setLists((prev) =>
            prev.map((l) =>
              l.id === toListId
                ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...row, fresh: true } : i)) }
                : l
            )
          );
      })
      .catch((err) => {
        console.error("moveItem failed", err);
        const fs = fromSnap;
        const ts = toSnap;
        if (fs && ts)
          setLists((prev) =>
            prev.map((l) => (l.id === fromListId ? fs : l.id === toListId ? ts : l))
          );
        signalSaveError();
      });
  }, [signalSaveError]);

  const copyItem = useCallback<StoreValue["copyItem"]>(async (fromItem, toListId) => {
    const tempId = makeId("item");
    const optimistic: Item = { ...fromItem, id: tempId, pinned: false, position: null, fresh: true };
    setLists((prev) =>
      prev.map((l) => (l.id === toListId ? { ...l, items: [optimistic, ...l.items] } : l))
    );
    trackProductEvent("feature_used", { feature: "item_copied" });
    try {
      const row = await copyItemAction(fromItem.id, toListId);
      if (!row) throw new Error("copyItem: no row");
      setLists((prev) =>
        prev.map((l) =>
          l.id === toListId
            ? { ...l, items: l.items.map((i) => (i.id === tempId ? { ...row, fresh: true } : i)) }
            : l
        )
      );
    } catch (err) {
      setLists((prev) =>
        prev.map((l) => (l.id === toListId ? { ...l, items: l.items.filter((i) => i.id !== tempId) } : l))
      );
      throw err;
    }
  }, []);
```

(d) Add `setItemPinned`, `moveItem`, `copyItem` to BOTH the `value` object and the `useMemo` dependency array, right after `deleteItem` in each.

- [ ] **Step 2: Add the `move-item` sheet to the UI context**

In `lib/ui.tsx`:

(a) In the `SheetState` union, add:

```ts
  | { kind: "item"; listId?: string; scrap?: ScrapRef }
  | { kind: "move-item"; listId: string; itemId: string }
```

(b) In `UiValue`, add after `openItemSheet`:

```ts
  openItemSheet: (listId?: string) => void;
  openMoveItem: (listId: string, itemId: string) => void;
```

(c) Implement in `UiProvider` (after `openItemSheet`):

```ts
  const openMoveItem = useCallback(
    (listId: string, itemId: string) => setSheet({ kind: "move-item", listId, itemId }),
    []
  );
```

(d) Add `openMoveItem` to BOTH the `value` object and the `useMemo` dependency array.

- [ ] **Step 3: Create the move/copy sheet**

Create `components/move-item-sheet.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { focusRing } from "@/lib/a11y";
import { sheetTitle } from "@/lib/field";
import { BottomSheet } from "./bottom-sheet";
import { StickerBadge } from "./icons/sticker-badge";

export function MoveItemSheet() {
  const { sheet, closeSheet, showToast } = useUi();
  const open = sheet?.kind === "move-item";
  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Move or copy to another list">
      {open && (
        <MoveItemFlow
          fromListId={sheet.listId}
          itemId={sheet.itemId}
          onClose={closeSheet}
          showToast={showToast}
        />
      )}
    </BottomSheet>
  );
}

function MoveItemFlow({
  fromListId,
  itemId,
  onClose,
  showToast,
}: {
  fromListId: string;
  itemId: string;
  onClose: () => void;
  showToast: (m: string) => void;
}) {
  const { lists, moveItem, copyItem } = useStore();
  const [mode, setMode] = useState<"move" | "copy">("move");
  const source = lists.find((l) => l.id === fromListId);
  const item = source?.items.find((i) => i.id === itemId);
  const others = lists.filter((l) => l.id !== fromListId);

  if (!item) {
    return <p className="py-6 text-center text-brown">That little thing wandered off.</p>;
  }

  const choose = async (toListId: string, toTitle: string) => {
    if (mode === "move") {
      moveItem(fromListId, itemId, toListId);
      onClose();
      showToast(`Moved to ${toTitle} ✨`);
    } else {
      onClose();
      try {
        await copyItem(item, toListId);
        showToast(`Copied to ${toTitle} ✨`);
      } catch {
        showToast("That didn't save. Let's try again 🌿");
      }
    }
  };

  return (
    <div className="pt-1">
      <h2 className={sheetTitle}>Send &ldquo;{item.title}&rdquo; somewhere</h2>

      {/* move vs copy */}
      <div className="mt-4 inline-flex rounded-pill bg-cream-deep p-0.5 ring-1 ring-line/60">
        {(["move", "copy"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-pill px-4 text-[0.85rem] font-bold capitalize transition ${focusRing} ${
              mode === m ? "bg-ink text-cream shadow-soft" : "text-brown"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[0.9rem] text-brown">
        {mode === "move" ? "It leaves this list and joins the one you pick." : "A copy is added; the original stays here."}
      </p>

      {others.length === 0 ? (
        <p className="mt-5 rounded-xl bg-cream-deep/50 p-4 text-center text-[0.92rem] text-brown">
          You only have this one little list so far. Make another to move things around.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {others.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => choose(l.id, l.title)}
              className={`flex items-center gap-3 rounded-xl bg-cream-deep/50 p-3 text-left transition hover:bg-cream-deep ${focusRing}`}
            >
              <StickerBadge emoji={l.emoji} size={34} rounded="rounded-lg" className="shadow-none" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[1rem] font-semibold text-ink">{l.title}</span>
                <span className="block text-[0.8rem] text-brown">{l.items.length} inside</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Mount the sheet**

In `components/app-shell.tsx`, add the import (near the other sheet imports, ~line 18):

```ts
import { ConfirmSheet } from "./confirm-sheet";
import { MoveItemSheet } from "./move-item-sheet";
```

And mount it alongside the others (after `<ConfirmSheet />`, ~line 63):

```tsx
              <ConfirmSheet />
              <MoveItemSheet />
```

- [ ] **Step 5: Add pin toggle + move/copy entry to the item editor**

In `components/item-card.tsx`, `ItemEditor`:

(a) Pull the new store method and the UI opener. Change the `useStore`/`useUi` destructuring (`components/item-card.tsx:32-33`):

```ts
  const { lists, people, addItem, addPerson, updateItem, deleteItem, setItemPinned } = useStore();
  const { showToast, openMoveItem } = useUi();
```

(b) Add a pin + move/copy row just above the existing Remove row (`components/item-card.tsx:233`, the `<div className="mt-3 flex justify-end">`). Insert before it:

```tsx
      {/* pin + move/copy */}
      <div className="mt-3.5 flex items-center gap-2">
        <button
          type="button"
          aria-pressed={Boolean(item.pinned)}
          onClick={() => setItemPinned(listId, item.id, !item.pinned)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-[0.8rem] font-bold transition ${focusRing} ${
            item.pinned ? "bg-ink text-cream shadow-soft" : "bg-cream-deep text-brown ring-1 ring-line/60"
          }`}
        >
          <LittleIcon name="star-tiny" size={14} />
          {item.pinned ? "Pinned to top" : "Pin to top"}
        </button>
        {lists.length > 1 && (
          <button
            type="button"
            onClick={() => openMoveItem(listId, item.id)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-cream-deep px-3 text-[0.8rem] font-bold text-brown ring-1 ring-line/60 transition hover:text-ink ${focusRing}`}
          >
            Move or copy
          </button>
        )}
      </div>
```

Note: `LittleIcon name="star-tiny"` is the existing star glyph used for ratings; reusing it keeps the icon set unchanged. If a distinct pin glyph is wanted later it can be added to the icon set, but that is out of scope here.

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add lib/store.tsx lib/ui.tsx components/move-item-sheet.tsx components/app-shell.tsx components/item-card.tsx
git commit -m "feat(organization): pin items and move/copy between lists"
```

---

## Task 5: Filter by tag and person

**Files:**
- Modify: `app/app/(main)/list/[id]/page.tsx` (tag + person filter state, options, control, apply to `visible`)

**Interfaces:**
- Consumes: the store's `people` (to label person filter), `Item.tags`/`Item.personId`, `EXAMPLE_TAG`.
- Produces: no new exports; local UI state only.

- [ ] **Step 1: Compute the tag/person options**

In `app/app/(main)/list/[id]/page.tsx`, add imports:

```ts
import { EXAMPLE_TAG } from "@/lib/onboarding";
```

Add `people` to the store destructure and add filter state near the other `useState`s:

```ts
  const { setListView, setListSort, reorderItems, deleteList } = useStore();
  const people = useStore().people;
```
```ts
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<string | null>(null);
```

(Reset them in the per-list effect and in the `changeSort` sibling — add to the effect at `setFilter("all")`:)

```ts
    setFilter("all");
    setTagFilter(null);
    setPersonFilter(null);
```

- [ ] **Step 2: Derive the available tags and people**

After the `options` memo (`app/app/(main)/list/[id]/page.tsx:70`), add:

```ts
  const tagOptions = useMemo(() => {
    if (!list) return [] as string[];
    const set = new Set<string>();
    for (const it of list.items) for (const t of it.tags ?? []) if (t !== EXAMPLE_TAG) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [list]);

  const personOptions = useMemo(() => {
    if (!list) return [] as { id: string; name: string }[];
    const ids = new Set<string>();
    for (const it of list.items) if (it.personId) ids.add(it.personId);
    return [...ids]
      .map((id) => ({ id, name: people.find((p) => p.id === id)?.name ?? "Someone" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [list, people]);
```

- [ ] **Step 3: Apply tag/person to `visible`**

Extend the `visible` memo from Task 3 so tag + person filter compose (AND) with status + search, and are applied BEFORE `sortItems`:

```ts
  const visible = useMemo(() => {
    if (!list) return [];
    let rows = filterItemsByStatus(list.items, filter);
    if (tagFilter) rows = rows.filter((i) => (i.tags ?? []).includes(tagFilter));
    if (personFilter) rows = rows.filter((i) => i.personId === personFilter);
    const q = query.trim().toLowerCase();
    if (q)
      rows = rows.filter(
        (i) => i.title.toLowerCase().includes(q) || (i.note ?? "").toLowerCase().includes(q)
      );
    return sortItems(rows, sort, statusesForList(list));
  }, [list, filter, tagFilter, personFilter, query, sort]);
```

Update `dragEnabled` so a tag/person filter also disables drag:

```ts
  const dragEnabled =
    !!list &&
    sort === "custom" &&
    filter === "all" &&
    !tagFilter &&
    !personFilter &&
    query.trim().length === 0;
```

- [ ] **Step 4: Render the tag/person filter control**

Below the existing `<FilterChips .../>` line (`app/app/(main)/list/[id]/page.tsx:208`), add a second compact rail, shown only when there is something to filter by:

```tsx
          <FilterChips options={options} active={filter} onChange={setFilter} />
          {(tagOptions.length > 0 || personOptions.length > 0) && (
            <div className="no-scrollbar fade-x -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
              {personOptions.map((p) => {
                const active = personFilter === p.id;
                return (
                  <button
                    key={`person-${p.id}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPersonFilter(active ? null : p.id)}
                    className={`flex min-h-11 shrink-0 items-center gap-1 rounded-pill px-3.5 text-[0.8rem] font-bold transition ${focusRing} ${
                      active ? "bg-ink text-cream shadow-soft" : "bg-paper text-brown ring-1 ring-line/70"
                    }`}
                  >
                    <span aria-hidden>◍</span> {p.name}
                  </button>
                );
              })}
              {tagOptions.map((t) => {
                const active = tagFilter === t;
                return (
                  <button
                    key={`tag-${t}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTagFilter(active ? null : t)}
                    className={`flex min-h-11 shrink-0 items-center gap-1 rounded-pill px-3.5 text-[0.8rem] font-bold transition ${focusRing} ${
                      active ? "bg-ink text-cream shadow-soft" : "bg-paper text-brown ring-1 ring-line/70"
                    }`}
                  >
                    <span aria-hidden>#</span> {t}
                  </button>
                );
              })}
            </div>
          )}
```

- [ ] **Step 5: Handle the "no matches" empty state**

The existing empty branch keys off `searching`. Extend it so a tag/person filter with zero matches offers a clear. In the `visible.length === 0` block (`app/app/(main)/list/[id]/page.tsx:224-247`), the non-searching `EmptyState`'s action currently only clears status. Change its action to also clear tag/person:

```tsx
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setFilter("all");
                    setTagFilter(null);
                    setPersonFilter(null);
                  }}
                >
                  Show everything
                </Button>
              }
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add "app/app/(main)/list/[id]/page.tsx"
git commit -m "feat(organization): filter a list by tag and by person"
```

---

## Task 6: Duplicate a list + duplicate-item detection

**Files:**
- Modify: `lib/store.tsx` (add `duplicateList`)
- Modify: `app/app/(main)/list/[id]/page.tsx` (add "Duplicate list" to the overflow menu)
- Modify: `components/add-item-modal.tsx` (exact-title confirm before save)

**Interfaces:**
- Consumes: `duplicateListAction` (Task 2); `isDuplicateTitle` (Task 1); `useUi().openConfirm`.
- Produces on the store: `duplicateList(listId: string): Promise<List | null>`.

- [ ] **Step 1: Add the `duplicateList` store mutator**

In `lib/store.tsx`:

(a) Add `duplicateListAction` to the `./actions` import block.

(b) In `StoreValue`, add after `deleteList`:

```ts
  deleteList: (listId: string) => DeleteHandle;
  duplicateList: (listId: string) => Promise<List | null>;
```

(c) Implement after `deleteList` (`lib/store.tsx:286`):

```ts
  const duplicateList = useCallback<StoreValue["duplicateList"]>(async (listId) => {
    const source = lists.find((l) => l.id === listId);
    if (!source || isTempId(listId)) return null;
    const tempId = makeId("list");
    const optimistic: List = {
      ...source,
      id: tempId,
      title: `${source.title} (copy)`,
      pinned: false,
      items: source.items.map((i) => ({ ...i })),
    };
    setLists((prev) => [optimistic, ...prev]);
    trackProductEvent("feature_used", { feature: "list_duplicated" });
    try {
      const created = await duplicateListAction(listId);
      if (!created) throw new Error("duplicateList: no row");
      setLists((prev) => prev.map((l) => (l.id === tempId ? created : l)));
      return created;
    } catch (err) {
      console.error("duplicateList failed", err);
      setLists((prev) => prev.filter((l) => l.id !== tempId));
      signalSaveError();
      return null;
    }
  }, [lists, signalSaveError]);
```

(d) Add `duplicateList` to BOTH the `value` object and the `useMemo` dependency array, after `deleteList`.

- [ ] **Step 2: Add "Duplicate list" to the list overflow menu**

In `app/app/(main)/list/[id]/page.tsx`:

(a) Pull `duplicateList` from the store and `showToast`/`router` are already present. Add to the store destructure:

```ts
  const { setListView, setListSort, reorderItems, deleteList, duplicateList } = useStore();
```

(b) In `listMenu`'s `items` array (`app/app/(main)/list/[id]/page.tsx:85-106`), add a "Duplicate list" entry between "Edit list" and "Delete list":

```tsx
        { label: "Edit list", onSelect: () => openEditList(list.id) },
        {
          label: "Duplicate list",
          onSelect: () => {
            void duplicateList(list.id).then((created) => {
              if (created) {
                showToast("Copied your little list ✨");
                router.push(`/app/list/${created.id}`);
              } else {
                showToast("That didn't save. Let's try again 🌿");
              }
            });
          },
        },
        {
          label: "Delete list",
          ...
```

- [ ] **Step 3: Add the duplicate-title confirm to the add flow**

In `components/add-item-modal.tsx`:

(a) Add imports:

```ts
import { isDuplicateTitle } from "@/lib/sort";
```

(b) Pull `openConfirm` from `useUi` in `AddItemFlow` (`components/add-item-modal.tsx:66`):

```ts
  const { showToast, openConfirm } = useUi();
```

(c) Split `save` (`components/add-item-modal.tsx:208`) into a duplicate-guard wrapper and the existing persist body. Rename the current `save` body to `persist`, and add a new `save` in front of it that checks for an exact-title duplicate in the destination list:

```ts
  const persist = async () => {
    const listId = targetListId ?? lists[0]?.id;
    if (!listId || saving) return;
    const input = {
      // ...unchanged body of the current save()...
    };
    // ...rest of current save() unchanged...
  };

  const save = () => {
    const listId = targetListId ?? lists[0]?.id;
    if (!listId || saving) return;
    const targetItems = lists.find((l) => l.id === listId)?.items ?? [];
    if (isDuplicateTitle(title, targetItems)) {
      openConfirm({
        title: "Already in this list",
        body: `"${title.trim()}" is already here. Add it again anyway?`,
        confirmLabel: "Add anyway",
        onConfirm: () => {
          void persist();
        },
      });
      return;
    }
    void persist();
  };
```

Leave the `onSave={save}` wiring on `DetailsStep` as-is; it now routes through the guard. The `persist` body is the current `save` implementation verbatim (the `scrap` branch and the normal-add branch), so both filing a scrap and a plain add get the duplicate check.

- [ ] **Step 4: Typecheck + build + full test run**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc clean; all tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add lib/store.tsx "app/app/(main)/list/[id]/page.tsx" components/add-item-modal.tsx
git commit -m "feat(organization): duplicate a list and warn on exact-duplicate items"
```

---

## Final verification (whole slice)

After all six tasks, run the full gate and a live smoke:

```bash
npx tsc --noEmit && npx vitest run && npm run build
```

Live smoke (per `.claude/skills/verify`): sign in as a `+clerk_test@example.com` user, then confirm:
1. Sort menu switches order for all 5 modes; the choice persists across reload (server-saved).
2. In Custom sort with no filter, the drag handle reorders items via touch; order persists across reload.
3. Pinning an item floats it to the top in every sort mode.
4. Move sends an item to another list (gone from the source); Copy leaves the original and adds a copy.
5. Tag and person filter rails appear only when applicable and compose with the status filter.
6. "Duplicate list" creates "<name> (copy)" with all items and navigates to it.
7. Adding an item whose title already exists (case-insensitive) shows the "Already in this list" confirm; "Add anyway" proceeds, Cancel aborts.

Then finish with superpowers:finishing-a-development-branch.
