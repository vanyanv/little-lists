# Edit, Delete & Manage Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users edit and delete lists, items, people, and person details (and move a detail between sections), every destructive action guarded by a warm confirmation, reusing the existing cozy sheets and cards.

**Architecture:** Three layers added on top of the existing app — new ownership-scoped server actions in `lib/actions.ts`, optimistic store wrappers in `lib/store.tsx` built on pure helpers in a new `lib/store-helpers.ts`, and a UI layer of two reusable primitives (`OverflowMenu`, `ConfirmSheet`), three edit sheets, and `⋯` entry points. No redesign; the Soft Collectible Scrapbook look is preserved.

**Tech Stack:** Next.js 16 (App Router, "use client" components, Server Actions), React 19, TypeScript 5, Prisma 7 + Neon Postgres, Tailwind v4, motion, Vitest 4 (pure-logic unit tests only).

## Global Constraints

- Do **not** redesign. Preserve the Soft Collectible Scrapbook UI: the `BottomSheet`, `DetailHeader`, expand-to-edit item cards, and create sheets are reused as-is.
- Out of scope: sharing, friends, comments, feed, AI, and **drag-to-reorder** (no `position` column, no ordering UI).
- Template editing is allowed; when a list's template changes, items keep their stored `status` even if it is not in the new template's set (such items show under "All", not under a status filter). No status data is mutated.
- All server actions are ownership-scoped: every query filters by the row's `userId === clerkUserId`, exactly like the existing actions.
- Delete confirmations are cozy `BottomSheet`-based sheets, never `window.confirm`. The destructive button is the non-default action; Cancel reads "Keep it".
- Exact copy (headings, confirm titles/bodies/buttons, toasts) is fixed — see the copy table in each task and in `docs/superpowers/specs/2026-06-29-edit-delete-manage-design.md`.
- Deleting a list or person relies on the DB-level `onDelete: Cascade` already in `prisma/schema.prisma`; do not manually delete children.
- Unit tests cover pure logic only (matching the existing `lib/search/*.test.ts` style). Server actions and React components are verified at runtime in the final task; their per-task gate is `npx tsc --noEmit`.

**Test commands:**
- Unit test (single file): `npx vitest run lib/store-helpers.test.ts`
- Typecheck gate: `npx tsc --noEmit`

---

### Task 1: Pure store helpers + unit tests

**Files:**
- Create: `lib/store-helpers.ts`
- Create: `lib/store-helpers.test.ts`
- Modify: `lib/store.tsx` (remove the local `mutateSection`/`insertDetail`/`replaceDetail`/`removeDetail` definitions at the bottom; import them from `./store-helpers` instead)

**Interfaces:**
- Consumes: `Item`, `List`, `ListTemplate`, `ItemType`, `Person`, `PersonDetailEntry` from `@/lib/types`; `TEMPLATE_META` from `@/lib/types`.
- Produces:
  - `mutateSection(people: Person[], personId: string, sectionId: string, fn: (entries: PersonDetailEntry[]) => PersonDetailEntry[]): Person[]`
  - `insertDetail(people: Person[], personId: string, sectionId: string, entry: PersonDetailEntry): Person[]`
  - `replaceDetail(people: Person[], personId: string, sectionId: string, tempId: string, entry: PersonDetailEntry): Person[]`
  - `removeDetail(people: Person[], personId: string, sectionId: string, detailId: string): Person[]`
  - `moveDetailBetweenSections(people: Person[], personId: string, fromSectionId: string, toSectionId: string, detailId: string, patch: { title?: string; note?: string; tags?: string[] }): Person[]`
  - `filterItemsByStatus(items: Item[], filter: string): Item[]`
  - `deriveListMeta(template: ListTemplate): { noun: string; kind: ItemType }`

- [ ] **Step 1: Write the failing tests**

Create `lib/store-helpers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  moveDetailBetweenSections,
  filterItemsByStatus,
  deriveListMeta,
} from "./store-helpers";
import type { Person, Item } from "./types";

function people(): Person[] {
  return [
    {
      id: "p1",
      name: "Mae",
      emoji: "🌷",
      theme: "blush",
      note: "",
      sections: [
        { id: "likes", label: "Likes", emoji: "💛", kind: "chips", entries: [
          { id: "d1", title: "matcha", tags: [] },
          { id: "d2", title: "long walks", tags: [] },
        ] },
        { id: "dislikes", label: "Dislikes", emoji: "🙅", kind: "chips", entries: [] },
        { id: "notes", label: "Notes", emoji: "📝", kind: "notes", entries: [] },
      ],
    },
  ];
}

describe("moveDetailBetweenSections", () => {
  it("moves an entry to another section and applies the patch", () => {
    const out = moveDetailBetweenSections(people(), "p1", "likes", "dislikes", "d1", { title: "cilantro" });
    const p = out[0];
    expect(p.sections.find((s) => s.id === "likes")!.entries.map((e) => e.id)).toEqual(["d2"]);
    const moved = p.sections.find((s) => s.id === "dislikes")!.entries;
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({ id: "d1", title: "cilantro" });
  });

  it("edits in place when from and to are the same section", () => {
    const out = moveDetailBetweenSections(people(), "p1", "likes", "likes", "d1", { title: "iced matcha" });
    const likes = out[0].sections.find((s) => s.id === "likes")!.entries;
    expect(likes.map((e) => e.id)).toEqual(["d1", "d2"]); // order preserved
    expect(likes[0].title).toBe("iced matcha");
  });

  it("returns the input unchanged when the detail is not found", () => {
    const input = people();
    expect(moveDetailBetweenSections(input, "p1", "likes", "dislikes", "nope", {})).toEqual(input);
  });
});

describe("filterItemsByStatus", () => {
  const items: Item[] = [
    { id: "i1", type: "movie", title: "A", status: "watched" },
    { id: "i2", type: "music", title: "B", status: "want-to-listen" }, // orphan after movie→ template
  ];
  it("returns everything under 'all'", () => {
    expect(filterItemsByStatus(items, "all")).toHaveLength(2);
  });
  it("returns only matching items under a status filter", () => {
    expect(filterItemsByStatus(items, "watched").map((i) => i.id)).toEqual(["i1"]);
  });
  it("returns nothing for a status no item has (out-of-template status hidden from that filter)", () => {
    expect(filterItemsByStatus(items, "want-to-watch")).toEqual([]);
  });
});

describe("deriveListMeta", () => {
  it("derives noun and kind from the template", () => {
    expect(deriveListMeta("food")).toEqual({ noun: "little tastes noted", kind: "food" });
    expect(deriveListMeta("movie")).toEqual({ noun: "little films saved", kind: "movie" });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/store-helpers.test.ts`
Expected: FAIL — `Failed to resolve import "./store-helpers"` / functions not defined.

- [ ] **Step 3: Implement `lib/store-helpers.ts`**

Create `lib/store-helpers.ts` (the first four functions are moved verbatim from the bottom of `lib/store.tsx`):

```ts
import {
  TEMPLATE_META,
  type Item,
  type ItemType,
  type ListTemplate,
  type Person,
  type PersonDetailEntry,
} from "./types";

export function mutateSection(
  people: Person[],
  personId: string,
  sectionId: string,
  fn: (entries: PersonDetailEntry[]) => PersonDetailEntry[]
): Person[] {
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          sections: p.sections.map((s) =>
            s.id === sectionId ? { ...s, entries: fn(s.entries) } : s
          ),
        }
      : p
  );
}

export function insertDetail(people: Person[], personId: string, sectionId: string, entry: PersonDetailEntry) {
  return mutateSection(people, personId, sectionId, (entries) => [...entries, entry]);
}

export function replaceDetail(
  people: Person[],
  personId: string,
  sectionId: string,
  tempId: string,
  entry: PersonDetailEntry
) {
  return mutateSection(people, personId, sectionId, (entries) =>
    entries.map((e) => (e.id === tempId ? entry : e))
  );
}

export function removeDetail(people: Person[], personId: string, sectionId: string, detailId: string) {
  return mutateSection(people, personId, sectionId, (entries) =>
    entries.filter((e) => e.id !== detailId)
  );
}

/** Edit a detail in place, or move it to another section, applying the patch. */
export function moveDetailBetweenSections(
  people: Person[],
  personId: string,
  fromSectionId: string,
  toSectionId: string,
  detailId: string,
  patch: { title?: string; note?: string; tags?: string[] }
): Person[] {
  const person = people.find((p) => p.id === personId);
  const existing = person?.sections
    .find((s) => s.id === fromSectionId)
    ?.entries.find((e) => e.id === detailId);
  if (!existing) return people;

  const updated: PersonDetailEntry = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.note !== undefined ? { note: patch.note || undefined } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
  };

  if (fromSectionId === toSectionId) {
    return mutateSection(people, personId, fromSectionId, (entries) =>
      entries.map((e) => (e.id === detailId ? updated : e))
    );
  }
  const removed = removeDetail(people, personId, fromSectionId, detailId);
  return insertDetail(removed, personId, toSectionId, updated);
}

/** The list-detail filter: "all" shows everything; a status id shows only matches. */
export function filterItemsByStatus(items: Item[], filter: string): Item[] {
  if (filter === "all") return items;
  return items.filter((i) => i.status === filter);
}

/** The derived label noun + item kind for a template (mirrors mapList on the server). */
export function deriveListMeta(template: ListTemplate): { noun: string; kind: ItemType } {
  const meta = TEMPLATE_META[template];
  return { noun: meta.noun, kind: meta.kind };
}
```

- [ ] **Step 4: Point `lib/store.tsx` at the shared helpers**

In `lib/store.tsx`, add to the import block near the top (after the `actions` import):

```ts
import { insertDetail, removeDetail, replaceDetail } from "./store-helpers";
```

Then delete the local `mutateSection`, `insertDetail`, `replaceDetail`, and `removeDetail` function definitions at the bottom of the file (the `/* ── helpers ── */` block keeps `isTempId`, `mapDraftList`, and `mapDraftPerson`; remove only the four section helpers). `mutateSection` is no longer referenced in `store.tsx` directly, so it does not need importing there.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/store-helpers.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/store-helpers.ts lib/store-helpers.test.ts lib/store.tsx
git commit -m "feat(store): extract pure section/list helpers with tests"
```

---

### Task 2: Server actions for lists, people, and details

**Files:**
- Modify: `lib/actions.ts` (add five actions + their input interfaces; extend the `@/lib/people` import)

**Interfaces:**
- Consumes: `prisma`, `requireUserProfile`, `mapList`, `mapPerson`, `templateToDb` (already imported); `ID_TO_DB_SECTION` (already imported) and `DB_SECTION_TO_ID` (add to import).
- Produces:
  - `updateListAction(listId: string, patch: UpdateListPatch): Promise<List | null>`
  - `deleteListAction(listId: string): Promise<void>`
  - `updatePersonAction(personId: string, patch: UpdatePersonPatch): Promise<Person | null>`
  - `deletePersonAction(personId: string): Promise<void>`
  - `updatePersonDetailAction(detailId: string, patch: UpdatePersonDetailPatch): Promise<{ sectionId: string; entry: PersonDetailEntry } | null>`
  - Interfaces `UpdateListPatch`, `UpdatePersonPatch`, `UpdatePersonDetailPatch`.

- [ ] **Step 1: Extend the people import**

In `lib/actions.ts`, change:

```ts
import { ID_TO_DB_SECTION } from "@/lib/people";
```
to:
```ts
import { DB_SECTION_TO_ID, ID_TO_DB_SECTION } from "@/lib/people";
```

- [ ] **Step 2: Add the list actions**

Append to the `/* ── lists ── */` section of `lib/actions.ts` (after `setListViewAction`):

```ts
export interface UpdateListPatch {
  title?: string;
  emoji?: string;
  theme?: ThemeColor;
  template?: ListTemplate;
  defaultView?: ViewMode;
}

export async function updateListAction(listId: string, patch: UpdateListPatch): Promise<List | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.list.findFirst({
    where: { id: listId, userId: clerkUserId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.list.update({
    where: { id: listId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
      ...(patch.theme !== undefined ? { themeColor: patch.theme } : {}),
      ...(patch.template !== undefined ? { templateType: templateToDb(patch.template) } : {}),
      ...(patch.defaultView !== undefined ? { defaultViewMode: patch.defaultView } : {}),
    },
    include: { items: true },
  });
  return mapList(row);
}

export async function deleteListAction(listId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  // ListItem.list is onDelete: Cascade, so items go with it
  await prisma.list.deleteMany({ where: { id: listId, userId: clerkUserId } });
}
```

- [ ] **Step 3: Add the person + detail actions**

Append to the `/* ── people ── */` section (after `deletePersonDetailAction`):

```ts
export interface UpdatePersonPatch {
  name?: string;
  emoji?: string;
  theme?: ThemeColor;
  note?: string;
}

export async function updatePersonAction(personId: string, patch: UpdatePersonPatch): Promise<Person | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.person.findFirst({
    where: { id: personId, userId: clerkUserId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.person.update({
    where: { id: personId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
      ...(patch.theme !== undefined ? { themeColor: patch.theme } : {}),
      ...(patch.note !== undefined ? { shortNote: patch.note || null } : {}),
    },
    include: { details: true },
  });
  return mapPerson(row);
}

export async function deletePersonAction(personId: string): Promise<void> {
  const { clerkUserId } = await requireUserProfile();
  // PersonDetail.person is onDelete: Cascade, so details go with it
  await prisma.person.deleteMany({ where: { id: personId, userId: clerkUserId } });
}

export interface UpdatePersonDetailPatch {
  title?: string;
  note?: string;
  tags?: string[];
  /** UI section id to move to (e.g. "dates"); maps to the db enum via ID_TO_DB_SECTION */
  sectionId?: string;
}

export async function updatePersonDetailAction(
  detailId: string,
  patch: UpdatePersonDetailPatch
): Promise<{ sectionId: string; entry: PersonDetailEntry } | null> {
  const { clerkUserId } = await requireUserProfile();
  const existing = await prisma.personDetail.findFirst({
    where: { id: detailId, userId: clerkUserId },
    select: { id: true },
  });
  if (!existing) return null;

  let section: PersonDetail["section"] | undefined;
  if (patch.sectionId !== undefined) {
    section = ID_TO_DB_SECTION[patch.sectionId];
    if (!section) throw new Error("updatePersonDetailAction: unknown section");
  }

  const row = await prisma.personDetail.update({
    where: { id: detailId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.note !== undefined ? { note: patch.note || null } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(section ? { section } : {}),
    },
  });

  return {
    sectionId: DB_SECTION_TO_ID[row.section],
    entry: { id: row.id, title: row.title, note: row.note ?? undefined, tags: row.tags },
  };
}
```

Add `PersonDetail` to the existing `@prisma/client` type import at the top of the file (it currently imports `Prisma`):

```ts
import { Prisma, type PersonDetail } from "@prisma/client";
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Behavioral correctness is proven at runtime in Task 13; these actions hit Prisma + Clerk and follow the existing un-unit-tested action pattern.)

- [ ] **Step 5: Commit**

```bash
git add lib/actions.ts
git commit -m "feat(actions): add update/delete actions for lists, people, details"
```

---

### Task 3: UI context — confirm state + edit-sheet states

**Files:**
- Modify: `lib/ui.tsx`

**Interfaces:**
- Produces (added to `UiValue` / `useUi()`):
  - `SheetState` union gains `{ kind: "edit-list"; listId: string }`, `{ kind: "edit-person"; personId: string }`, `{ kind: "edit-detail"; personId: string; sectionId: string; detailId: string }`.
  - `openEditList(listId: string): void`, `openEditPerson(personId: string): void`, `openEditDetail(personId: string, sectionId: string, detailId: string): void`
  - `confirm: ConfirmState | null`, `openConfirm(opts: ConfirmOptions): void`, `closeConfirm(): void`
  - Types `ConfirmTone = "default" | "danger"`, `ConfirmOptions`, `ConfirmState`.

- [ ] **Step 1: Extend the `SheetState` union and add confirm types**

In `lib/ui.tsx`, replace the `SheetState` type and add confirm types beneath it:

```ts
export type SheetState =
  | { kind: "item"; listId?: string }
  | { kind: "detail"; personId: string }
  | { kind: "list" }
  | { kind: "person" }
  | { kind: "edit-list"; listId: string }
  | { kind: "edit-person"; personId: string }
  | { kind: "edit-detail"; personId: string; sectionId: string; detailId: string }
  | null;

export type ConfirmTone = "default" | "danger";

export interface ConfirmOptions {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
}

export type ConfirmState = ConfirmOptions;
```

- [ ] **Step 2: Extend `UiValue` and the provider**

In the `UiValue` interface add:

```ts
  openEditList: (listId: string) => void;
  openEditPerson: (personId: string) => void;
  openEditDetail: (personId: string, sectionId: string, detailId: string) => void;
  confirm: ConfirmState | null;
  openConfirm: (opts: ConfirmOptions) => void;
  closeConfirm: () => void;
```

In `UiProvider`, add the state + callbacks (next to the existing `sheet` state and openers):

```ts
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const openEditList = useCallback((listId: string) => setSheet({ kind: "edit-list", listId }), []);
  const openEditPerson = useCallback((personId: string) => setSheet({ kind: "edit-person", personId }), []);
  const openEditDetail = useCallback(
    (personId: string, sectionId: string, detailId: string) =>
      setSheet({ kind: "edit-detail", personId, sectionId, detailId }),
    []
  );
  const openConfirm = useCallback((opts: ConfirmOptions) => setConfirm(opts), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);
```

Add all six names to the `value` object and to the `useMemo` dependency array:

```ts
  const value = useMemo(
    () => ({
      sheet,
      openItemSheet,
      openDetailSheet,
      openListSheet,
      openPersonSheet,
      openEditList,
      openEditPerson,
      openEditDetail,
      closeSheet,
      toast,
      showToast,
      dismissToast,
      confirm,
      openConfirm,
      closeConfirm,
    }),
    [
      sheet, openItemSheet, openDetailSheet, openListSheet, openPersonSheet,
      openEditList, openEditPerson, openEditDetail, closeSheet,
      toast, showToast, dismissToast, confirm, openConfirm, closeConfirm,
    ]
  );
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/ui.tsx
git commit -m "feat(ui): add confirm state and edit-sheet states to Ui context"
```

---

### Task 4: Store optimistic wrappers

**Files:**
- Modify: `lib/store.tsx`

**Interfaces:**
- Consumes: actions from Task 2 (`updateListAction`, `deleteListAction`, `updatePersonAction`, `deletePersonAction`, `updatePersonDetailAction`); helpers from Task 1 (`deriveListMeta`, `moveDetailBetweenSections`).
- Produces (added to `StoreValue` / `useStore()`):
  - `updateList(listId: string, patch: Partial<Pick<List, "title" | "emoji" | "theme" | "template" | "defaultView">>): void`
  - `deleteList(listId: string): void`
  - `updatePerson(personId: string, patch: Partial<Pick<Person, "name" | "emoji" | "theme" | "note">>): void`
  - `deletePerson(personId: string): void`
  - `updatePersonDetail(personId: string, fromSectionId: string, detailId: string, patch: { title?: string; note?: string; tags?: string[]; toSectionId?: string }): void`

- [ ] **Step 1: Extend imports**

In `lib/store.tsx`, add the new actions to the `./actions` import and the helpers to the `./store-helpers` import:

```ts
import {
  createItemAction,
  createListAction,
  createPersonAction,
  createPersonDetailAction,
  deleteItemAction,
  deleteListAction,
  deletePersonAction,
  deletePersonDetailAction,
  setListViewAction,
  updateItemAction,
  updateListAction,
  updatePersonAction,
  updatePersonDetailAction,
  updateProfileAction,
  type CreateItemInput,
  type CreateListInput,
  type CreatePersonInput,
} from "./actions";
import { deriveListMeta, insertDetail, moveDetailBetweenSections, removeDetail, replaceDetail } from "./store-helpers";
```

- [ ] **Step 2: Extend the `StoreValue` interface**

Add to `interface StoreValue` (after the existing list/people methods):

```ts
  updateList: (listId: string, patch: Partial<Pick<List, "title" | "emoji" | "theme" | "template" | "defaultView">>) => void;
  deleteList: (listId: string) => void;
  updatePerson: (personId: string, patch: Partial<Pick<Person, "name" | "emoji" | "theme" | "note">>) => void;
  deletePerson: (personId: string) => void;
  updatePersonDetail: (
    personId: string,
    fromSectionId: string,
    detailId: string,
    patch: { title?: string; note?: string; tags?: string[]; toSectionId?: string }
  ) => void;
```

- [ ] **Step 3: Implement the list wrappers**

In `ListsProvider`, after `setListView`, add:

```ts
  const updateList = useCallback<StoreValue["updateList"]>((listId, patch) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const next = { ...l, ...patch };
        if (patch.template !== undefined) {
          const meta = deriveListMeta(patch.template);
          next.noun = meta.noun;
          next.kind = meta.kind;
        }
        return next;
      })
    );
    if (isTempId(listId)) return;
    void updateListAction(listId, {
      title: patch.title,
      emoji: patch.emoji,
      theme: patch.theme,
      template: patch.template,
      defaultView: patch.defaultView,
    }).catch((err) => console.error("updateList failed", err));
  }, []);

  const deleteList = useCallback<StoreValue["deleteList"]>((listId) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
    if (isTempId(listId)) return;
    void deleteListAction(listId).catch((err) => console.error("deleteList failed", err));
  }, []);
```

- [ ] **Step 4: Implement the people wrappers**

After `addPerson` (or near the people section), add:

```ts
  const updatePerson = useCallback<StoreValue["updatePerson"]>((personId, patch) => {
    setPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, ...patch } : p)));
    if (isTempId(personId)) return;
    void updatePersonAction(personId, {
      name: patch.name,
      emoji: patch.emoji,
      theme: patch.theme,
      note: patch.note,
    }).catch((err) => console.error("updatePerson failed", err));
  }, []);

  const deletePerson = useCallback<StoreValue["deletePerson"]>((personId) => {
    setPeople((prev) => prev.filter((p) => p.id !== personId));
    if (isTempId(personId)) return;
    void deletePersonAction(personId).catch((err) => console.error("deletePerson failed", err));
  }, []);

  const updatePersonDetail = useCallback<StoreValue["updatePersonDetail"]>(
    (personId, fromSectionId, detailId, patch) => {
      const toSectionId = patch.toSectionId ?? fromSectionId;
      setPeople((prev) =>
        moveDetailBetweenSections(prev, personId, fromSectionId, toSectionId, detailId, {
          title: patch.title,
          note: patch.note,
          tags: patch.tags,
        })
      );
      if (isTempId(detailId)) return;
      void updatePersonDetailAction(detailId, {
        title: patch.title,
        note: patch.note,
        tags: patch.tags,
        sectionId: patch.toSectionId,
      }).catch((err) => console.error("updatePersonDetail failed", err));
    },
    []
  );
```

- [ ] **Step 5: Register in `value` + deps**

Add `updateList, deleteList, updatePerson, deletePerson, updatePersonDetail` to both the `value` object and the `useMemo` dependency array.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/store.tsx
git commit -m "feat(store): add optimistic update/delete wrappers for lists, people, details"
```

---

### Task 5: ConfirmSheet primitive + rosewood token

**Files:**
- Create: `components/confirm-sheet.tsx`
- Modify: `app/globals.css` (add one `--color-rosewood` token in `@theme`)
- Modify: `components/app-shell.tsx` (mount `<ConfirmSheet />`)

**Interfaces:**
- Consumes: `useUi()` → `confirm`, `closeConfirm`; `BottomSheet`; `tap` from `@/lib/motion`.
- Produces: `ConfirmSheet` component (no props; reads context).

- [ ] **Step 1: Add the rosewood token**

In `app/globals.css`, inside the `@theme { ... }` block, after `--color-clay: ...;`, add:

```css
  /* destructive actions — a muted dusty rose, warm not alarming */
  --color-rosewood: oklch(0.55 0.13 18);
```

This makes `bg-rosewood` and `text-rosewood` available (Tailwind v4 generates utilities from `--color-*`).

- [ ] **Step 2: Create the ConfirmSheet**

Create `components/confirm-sheet.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import { useUi } from "@/lib/ui";
import { tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";

/** A cozy confirmation sheet, summoned via useUi().openConfirm(). */
export function ConfirmSheet() {
  const { confirm, closeConfirm } = useUi();

  return (
    <BottomSheet open={confirm !== null} onClose={closeConfirm} ariaLabel={confirm?.title}>
      {confirm && (
        <div className="pt-1">
          <h2 className="font-display text-[1.4rem] font-semibold leading-tight text-ink">
            {confirm.title}
          </h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-brown">{confirm.body}</p>

          <div className="mt-6 flex flex-col gap-2.5">
            <motion.button
              type="button"
              whileTap={tap}
              onClick={() => {
                confirm.onConfirm();
                closeConfirm();
              }}
              className={`w-full rounded-pill py-4 text-[1rem] font-bold text-cream shadow-lift ${
                confirm.tone === "danger" ? "bg-rosewood" : "bg-ink"
              }`}
            >
              {confirm.confirmLabel}
            </motion.button>
            <button
              type="button"
              onClick={closeConfirm}
              className="w-full rounded-pill py-3.5 text-[0.95rem] font-bold text-brown-soft transition-colors hover:bg-cream-deep"
            >
              Keep it
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 3: Mount it in the app shell**

In `components/app-shell.tsx`, add the import and render it alongside the other sheets:

```tsx
import { ConfirmSheet } from "./confirm-sheet";
```

Inside the phone-frame `div`, after `<CreatePersonSheet />`:

```tsx
          <ConfirmSheet />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Visual + interaction proof in Task 13.)

- [ ] **Step 5: Commit**

```bash
git add components/confirm-sheet.tsx components/app-shell.tsx app/globals.css
git commit -m "feat(ui): add ConfirmSheet primitive and rosewood danger token"
```

---

### Task 6: OverflowMenu primitive

**Files:**
- Create: `components/overflow-menu.tsx`

**Interfaces:**
- Consumes: `motion` from `motion/react`; `tap` from `@/lib/motion`.
- Produces: `OverflowMenu` component with props:

```ts
interface OverflowMenuItem {
  label: string;
  tone?: "default" | "danger";
  onSelect: () => void;
}
interface OverflowMenuProps {
  items: OverflowMenuItem[];
  ariaLabel?: string;     // default "More options"
  /** when true, stop click/navigation propagation (cards wrap the menu in a Link) */
  stopPropagation?: boolean;
}
```

- [ ] **Step 1: Create the OverflowMenu**

Create `components/overflow-menu.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { tap } from "@/lib/motion";

interface OverflowMenuItem {
  label: string;
  tone?: "default" | "danger";
  onSelect: () => void;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  ariaLabel?: string;
  stopPropagation?: boolean;
}

/** A ⋯ trigger that opens a cozy anchored popover of actions. */
export function OverflowMenu({ items, ariaLabel = "More options", stopPropagation }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const guard = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        whileTap={tap}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          guard(e);
          setOpen((o) => !o);
        }}
        className="grid h-9 w-9 place-items-center rounded-full bg-paper/80 text-ink shadow-soft backdrop-blur-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* tap-away scrim (transparent) */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={(e) => {
                guard(e);
                setOpen(false);
              }}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-11 z-50 min-w-[10rem] overflow-hidden rounded-xl bg-paper p-1 shadow-lift ring-1 ring-line/60"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    guard(e);
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={`block w-full rounded-lg px-3.5 py-2.5 text-left text-[0.92rem] font-semibold transition-colors hover:bg-cream-deep ${
                    item.tone === "danger" ? "text-rosewood" : "text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/overflow-menu.tsx
git commit -m "feat(ui): add OverflowMenu popover primitive"
```

---

### Task 7: Extract shared form fields from the create sheets

**Files:**
- Create: `components/list-form-fields.tsx`
- Create: `components/person-form-fields.tsx`
- Modify: `components/create-list-sheet.tsx` (use `ListFormFields`)
- Modify: `components/create-person-sheet.tsx` (use `PersonFormFields`)

**Interfaces:**
- Produces:
  - `ListFormFields` — controlled list-form body. Props:
    ```ts
    interface ListFormValue { name: string; template: ListTemplate; emoji: string; theme: ThemeColor; view: ViewMode; }
    interface ListFormFieldsProps {
      value: ListFormValue;
      onChange: (patch: Partial<ListFormValue>) => void;
      /** when a template is chosen, seed emoji/theme/view unless the user already touched them */
      onChooseTemplate: (t: ListTemplate) => void;
    }
    ```
  - `PersonFormFields` — controlled person-form body. Props:
    ```ts
    interface PersonFormValue { name: string; emoji: string; theme: ThemeColor; note: string; }
    interface PersonFormFieldsProps {
      value: PersonFormValue;
      onChange: (patch: Partial<PersonFormValue>) => void;
    }
    ```
- Consumes: same imports the create sheets already use (`TEMPLATE_META`, `THEME_COLORS`, `ViewToggle`, `themeClass`, `motion`, `tap`, `softSpring`).

**Note:** This refactor must not change create-sheet behavior. The `EMOJI_CHOICES` arrays and the template-rail scroll/edge logic move into the field components unchanged.

- [ ] **Step 1: Create `components/list-form-fields.tsx`**

Move the preview + name + template carousel + emoji + theme + view markup out of `CreateListFlow` into a controlled component. The `EMOJI_CHOICES` constant and the `railRef`/`atStart`/`atEnd`/`measureRail` logic move here verbatim.

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  TEMPLATE_META,
  THEME_COLORS,
  type ListTemplate,
  type ThemeColor,
  type ViewMode,
} from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { softSpring, tap } from "@/lib/motion";
import { ViewToggle } from "./view-toggle";

const TEMPLATE_ORDER: ListTemplate[] = [
  "custom", "movie", "book", "music", "food", "place", "gift", "date", "people",
];

const EMOJI_CHOICES = ["✨", "🎬", "📚", "🍴", "📍", "🎁", "🌷", "🌼", "🛋️", "🎧", "☕", "🍵", "🌿", "🏞️", "💌", "🪩", "🖊️", "🐾"];

export interface ListFormValue {
  name: string;
  template: ListTemplate;
  emoji: string;
  theme: ThemeColor;
  view: ViewMode;
}

interface ListFormFieldsProps {
  value: ListFormValue;
  onChange: (patch: Partial<ListFormValue>) => void;
  onChooseTemplate: (t: ListTemplate) => void;
}

export function ListFormFields({ value, onChange, onChooseTemplate }: ListFormFieldsProps) {
  const { name, template, emoji, theme, view } = value;

  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const measureRail = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    measureRail();
  }, [measureRail]);

  return (
    <>
      {/* live preview */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--t-bg)" }}>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-2xl shadow-soft">
          {emoji}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[1.05rem] font-semibold text-[var(--t-ink)]">
            {name.trim() || "Your little world"}
          </p>
          <p className="text-[0.8rem] font-semibold text-brown">{TEMPLATE_META[template].label}</p>
        </div>
      </div>

      {/* name */}
      <label className="mt-5 block">
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          name your little world
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Things that give me the ick…"
          className="w-full rounded-xl border border-line bg-cream-deep/50 px-4 py-3.5 text-[1.05rem] font-medium text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none"
        />
      </label>

      {/* template picker */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a starting point</p>
          <motion.span
            animate={{ opacity: atEnd ? 0 : 1, x: atEnd ? 4 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-[0.72rem] font-bold lowercase tracking-tight text-[var(--t-ink)] opacity-80"
            aria-hidden
          >
            swipe for more →
          </motion.span>
        </div>

        <div className="relative">
          <motion.div
            animate={{ opacity: atStart ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8"
            style={{ background: "linear-gradient(to right, var(--color-paper), transparent)" }}
            aria-hidden
          />
          <motion.div
            animate={{ opacity: atEnd ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-11"
            style={{ background: "linear-gradient(to left, var(--color-paper), transparent)" }}
            aria-hidden
          />

          <div
            ref={railRef}
            onScroll={measureRail}
            className="no-scrollbar -mx-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-2 px-2 pb-2 pt-2"
          >
            {TEMPLATE_ORDER.map((t) => {
              const meta = TEMPLATE_META[t];
              const active = t === template;
              return (
                <motion.button
                  key={t}
                  type="button"
                  whileTap={tap}
                  onClick={() => onChooseTemplate(t)}
                  aria-pressed={active}
                  className={`${themeClass(meta.theme)} relative flex w-[6.25rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition ${
                    active ? "shadow-soft ring-2 ring-[var(--t-edge)]" : "ring-1 ring-[var(--t-edge)]"
                  }`}
                  style={{ background: active ? "var(--t-wash)" : "var(--t-bg)" }}
                >
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={softSpring}
                      className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-ink text-[0.66rem] font-bold text-cream shadow-soft"
                      aria-hidden
                    >
                      ✓
                    </motion.span>
                  )}
                  <span className={`grid h-8 w-8 place-items-center rounded-lg text-lg transition ${active ? "bg-paper shadow-soft" : "bg-paper/70"}`}>
                    {meta.emoji}
                  </span>
                  <span className="text-[0.74rem] font-bold leading-tight text-[var(--t-ink)]">{meta.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* emoji */}
      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">pick a vibe</p>
        <div className="grid grid-cols-9 gap-1.5">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange({ emoji: e })}
              className={`grid aspect-square place-items-center rounded-lg text-xl transition ${
                emoji === e ? "bg-cream-deep ring-2 ring-ink/20" : "bg-cream-deep/40"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* theme */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a color</p>
          <span className="text-[0.72rem] font-bold lowercase tracking-tight text-[var(--t-ink)]">{theme}</span>
        </div>
        <div className="flex justify-between gap-2">
          {THEME_COLORS.map((c) => {
            const active = theme === c;
            return (
              <motion.button
                key={c}
                type="button"
                whileTap={tap}
                onClick={() => onChange({ theme: c })}
                aria-label={`${c} theme`}
                aria-pressed={active}
                className={`${themeClass(c)} relative grid h-11 w-11 place-items-center rounded-full transition`}
                style={{
                  background: "radial-gradient(125% 125% at 32% 24%, var(--t-wash), var(--t) 72%)",
                  boxShadow: active
                    ? "inset 0 0 0 1px var(--t-edge), 0 0 0 2px var(--color-paper), 0 0 0 4.5px var(--color-ink)"
                    : "inset 0 0 0 1px var(--t-edge), var(--shadow-soft)",
                }}
              >
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={softSpring}
                    className="grid h-5 w-5 place-items-center rounded-full bg-ink/85 text-[0.58rem] font-bold text-cream"
                    aria-hidden
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* default view */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">how you&apos;ll browse it</p>
        <ViewToggle value={view} onChange={(v) => onChange({ view: v })} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Rewrite `CreateListSheet` to use `ListFormFields`**

In `components/create-list-sheet.tsx`, replace the inline markup (preview through default-view) with `<ListFormFields>`, keeping the outer `themeClass(theme)` wrapper, the heading, the sticky save footer, and all save logic. The `chooseTemplate` handler stays in the flow (it owns the `emojiTouched`/`themeTouched` guards) and is passed as `onChooseTemplate`:

```tsx
import { ListFormFields, type ListFormValue } from "./list-form-fields";
// ...
  const [value, setValue] = useState<ListFormValue>({
    name: "",
    template: "custom",
    emoji: TEMPLATE_META.custom.emoji,
    theme: TEMPLATE_META.custom.theme,
    view: TEMPLATE_META.custom.defaultView,
  });
  const [emojiTouched, setEmojiTouched] = useState(false);
  const [themeTouched, setThemeTouched] = useState(false);

  const patch = (p: Partial<ListFormValue>) => {
    if (p.emoji !== undefined) setEmojiTouched(true);
    if (p.theme !== undefined) setThemeTouched(true);
    setValue((v) => ({ ...v, ...p }));
  };

  const chooseTemplate = (t: ListTemplate) => {
    const meta = TEMPLATE_META[t];
    setValue((v) => ({
      ...v,
      template: t,
      view: meta.defaultView,
      theme: themeTouched ? v.theme : meta.theme,
      emoji: emojiTouched ? v.emoji : meta.emoji,
    }));
  };
```

Save uses `value.name`/`value.emoji`/`value.theme`/`value.template`/`value.view`. Render:

```tsx
  return (
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-ink">
        What little list are we starting?
      </h2>
      <p className="mt-1 text-[0.92rem] text-brown">Start with a template or make it totally yours.</p>

      <ListFormFields value={value} onChange={patch} onChooseTemplate={chooseTemplate} />

      <p className="mt-5 text-center text-[0.82rem] text-brown-soft">You can always change this later.</p>

      {/* sticky save footer — unchanged */}
      {/* ...existing footer markup, calling save(), label "Save your little list" / "Making it…" ... */}
    </div>
  );
```

- [ ] **Step 3: Create `components/person-form-fields.tsx`**

Move the name + emoji + theme + note markup out of `CreatePersonFlow`. The `EMOJI_CHOICES` array moves here verbatim.

```tsx
"use client";

import { motion } from "motion/react";
import { THEME_COLORS, type ThemeColor } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { softSpring, tap } from "@/lib/motion";

const EMOJI_CHOICES = ["🌷", "🍔", "☕", "🎧", "🌼", "💛", "🐾", "🌿", "🍵", "📚", "🎬", "🌙", "🪩", "🧁", "🌸", "🫶", "🍂", "✨"];

export interface PersonFormValue {
  name: string;
  emoji: string;
  theme: ThemeColor;
  note: string;
}

interface PersonFormFieldsProps {
  value: PersonFormValue;
  onChange: (patch: Partial<PersonFormValue>) => void;
}

export function PersonFormFields({ value, onChange }: PersonFormFieldsProps) {
  const { name, emoji, theme, note } = value;

  return (
    <>
      {/* live preview */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--t-bg)" }}>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-2xl shadow-soft">
          {emoji}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[1.05rem] font-semibold text-[var(--t-ink)]">
            {name.trim() || "Someone lovely"}
          </p>
          <p className="line-clamp-1 text-[0.8rem] font-semibold text-brown">
            {note.trim() || "the little things about them"}
          </p>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">their name</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Maddie, Mom, best friend…"
          className="w-full rounded-xl border border-line bg-cream-deep/50 px-4 py-3.5 text-[1.05rem] font-medium text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none"
        />
      </label>

      <div className="mt-5">
        <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">pick a vibe</p>
        <div className="grid grid-cols-9 gap-1.5">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange({ emoji: e })}
              className={`grid aspect-square place-items-center rounded-lg text-xl transition ${
                emoji === e ? "bg-cream-deep ring-2 ring-ink/20" : "bg-cream-deep/40"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">choose a color</p>
          <span className="text-[0.72rem] font-bold lowercase tracking-tight text-[var(--t-ink)]">{theme}</span>
        </div>
        <div className="flex justify-between gap-2">
          {THEME_COLORS.map((c) => {
            const active = theme === c;
            return (
              <motion.button
                key={c}
                type="button"
                whileTap={tap}
                onClick={() => onChange({ theme: c })}
                aria-label={`${c} theme`}
                aria-pressed={active}
                className={`${themeClass(c)} relative grid h-11 w-11 place-items-center rounded-full transition`}
                style={{
                  background: "radial-gradient(125% 125% at 32% 24%, var(--t-wash), var(--t) 72%)",
                  boxShadow: active
                    ? "inset 0 0 0 1px var(--t-edge), 0 0 0 2px var(--color-paper), 0 0 0 4.5px var(--color-ink)"
                    : "inset 0 0 0 1px var(--t-edge), var(--shadow-soft)",
                }}
              >
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={softSpring}
                    className="grid h-5 w-5 place-items-center rounded-full bg-ink/85 text-[0.58rem] font-bold text-cream"
                    aria-hidden
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">
          a little note (optional)
        </span>
        <input
          value={note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="horror movies, cozy books, no mushrooms…"
          className="w-full rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.95rem] text-ink placeholder:text-brown-soft/70 focus:border-brown-soft/50 focus:outline-none"
        />
      </label>
    </>
  );
}
```

- [ ] **Step 4: Rewrite `CreatePersonSheet` to use `PersonFormFields`**

Replace the inline fields in `CreatePersonFlow` with state held as a `PersonFormValue` and `<PersonFormFields>`, keeping the heading, `themeClass(value.theme)` wrapper, and the save button + logic (`addPerson`, toast "A new little world of details ✨", `router.push`).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/list-form-fields.tsx components/person-form-fields.tsx components/create-list-sheet.tsx components/create-person-sheet.tsx
git commit -m "refactor(sheets): extract shared ListFormFields and PersonFormFields"
```

---

### Task 8: Edit sheets (list, person, detail)

**Files:**
- Create: `components/edit-list-sheet.tsx`
- Create: `components/edit-person-sheet.tsx`
- Create: `components/edit-detail-sheet.tsx`
- Modify: `components/app-shell.tsx` (mount all three)

**Interfaces:**
- Consumes: `useUi()` (`sheet`, `closeSheet`, `showToast`); `useStore()` (`lists`, `people`, `updateList`, `updatePerson`, `updatePersonDetail`); `ListFormFields`/`ListFormValue`, `PersonFormFields`/`PersonFormValue`; `BottomSheet`; `TEMPLATE_META`.
- Produces: `EditListSheet`, `EditPersonSheet`, `EditDetailSheet` (no props; read context).

- [ ] **Step 1: Create `components/edit-list-sheet.tsx`**

```tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { TEMPLATE_META, type ListTemplate } from "@/lib/types";
import { themeClass } from "@/lib/visual";
import { tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";
import { ListFormFields, type ListFormValue } from "./list-form-fields";

export function EditListSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "edit-list";
  const listId = open ? sheet.listId : undefined;

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Edit this little list">
      {open && listId && <EditListFlow key={listId} listId={listId} onClose={closeSheet} />}
    </BottomSheet>
  );
}

function EditListFlow({ listId, onClose }: { listId: string; onClose: () => void }) {
  const { lists, updateList } = useStore();
  const { showToast } = useUi();
  const list = lists.find((l) => l.id === listId);

  const [value, setValue] = useState<ListFormValue>(() => ({
    name: list?.title ?? "",
    template: list?.template ?? "custom",
    emoji: list?.emoji ?? TEMPLATE_META.custom.emoji,
    theme: list?.theme ?? TEMPLATE_META.custom.theme,
    view: list?.defaultView ?? TEMPLATE_META[list?.template ?? "custom"].defaultView,
  }));

  if (!list) return null;

  const patch = (p: Partial<ListFormValue>) => setValue((v) => ({ ...v, ...p }));
  // editing: choosing a template only switches the starting point; it does not
  // stomp the title/emoji/theme the user already set
  const chooseTemplate = (t: ListTemplate) =>
    setValue((v) => ({ ...v, template: t, view: TEMPLATE_META[t].defaultView }));

  const canSave = value.name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    updateList(list.id, {
      title: value.name.trim(),
      emoji: value.emoji,
      theme: value.theme,
      template: value.template,
      defaultView: value.view,
    });
    onClose();
    showToast("Updated ✨");
  };

  return (
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-ink">Edit this little list</h2>
      <p className="mt-1 text-[0.92rem] text-brown">Tweak the name, vibe, or how you browse it.</p>

      <ListFormFields value={value} onChange={patch} onChooseTemplate={chooseTemplate} />

      <div className="sticky bottom-0 z-10 -mx-5 mt-5 bg-paper px-5 pb-1 pt-3">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-gradient-to-t from-paper to-transparent" />
        <motion.button
          type="button"
          whileTap={tap}
          onClick={save}
          disabled={!canSave}
          className="w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40"
        >
          Save changes
        </motion.button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/edit-person-sheet.tsx`**

```tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";
import { PersonFormFields, type PersonFormValue } from "./person-form-fields";

export function EditPersonSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "edit-person";
  const personId = open ? sheet.personId : undefined;

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Edit their little world">
      {open && personId && <EditPersonFlow key={personId} personId={personId} onClose={closeSheet} />}
    </BottomSheet>
  );
}

function EditPersonFlow({ personId, onClose }: { personId: string; onClose: () => void }) {
  const { people, updatePerson } = useStore();
  const { showToast } = useUi();
  const person = people.find((p) => p.id === personId);

  const [value, setValue] = useState<PersonFormValue>(() => ({
    name: person?.name ?? "",
    emoji: person?.emoji ?? "🌷",
    theme: person?.theme ?? "blush",
    note: person?.note ?? "",
  }));

  if (!person) return null;

  const patch = (p: Partial<PersonFormValue>) => setValue((v) => ({ ...v, ...p }));
  const canSave = value.name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    updatePerson(person.id, {
      name: value.name.trim(),
      emoji: value.emoji,
      theme: value.theme,
      note: value.note.trim(),
    });
    onClose();
    showToast("Updated ✨");
  };

  return (
    <div className={`pt-1 ${themeClass(value.theme)}`}>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-ink">Edit their little world</h2>
      <p className="mt-1 text-[0.92rem] text-brown">Update their name, vibe, or note.</p>

      <PersonFormFields value={value} onChange={patch} />

      <motion.button
        type="button"
        whileTap={tap}
        onClick={save}
        disabled={!canSave}
        className="mt-6 w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40"
      >
        Save changes
      </motion.button>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/edit-detail-sheet.tsx`**

The section-picker pill row is reused from `add-detail-sheet.tsx` and doubles as the move control. Prefill from the detail being edited.

```tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { themeClass } from "@/lib/visual";
import { tap } from "@/lib/motion";
import { BottomSheet } from "./bottom-sheet";

export function EditDetailSheet() {
  const { sheet, closeSheet } = useUi();
  const open = sheet?.kind === "edit-detail";

  return (
    <BottomSheet open={open} onClose={closeSheet} ariaLabel="Update this little thing">
      {open && sheet.kind === "edit-detail" && (
        <EditDetailFlow
          key={sheet.detailId}
          personId={sheet.personId}
          sectionId={sheet.sectionId}
          detailId={sheet.detailId}
          onClose={closeSheet}
        />
      )}
    </BottomSheet>
  );
}

function EditDetailFlow({
  personId,
  sectionId,
  detailId,
  onClose,
}: {
  personId: string;
  sectionId: string;
  detailId: string;
  onClose: () => void;
}) {
  const { people, updatePersonDetail } = useStore();
  const { showToast } = useUi();
  const person = people.find((p) => p.id === personId);
  const entry = person?.sections.find((s) => s.id === sectionId)?.entries.find((e) => e.id === detailId);

  const [toSectionId, setToSectionId] = useState(sectionId);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [tags, setTags] = useState((entry?.tags ?? []).join(", "));

  if (!person || !entry) return null;

  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    updatePersonDetail(person.id, sectionId, detailId, {
      title: title.trim(),
      note: note.trim() || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      toSectionId: toSectionId !== sectionId ? toSectionId : undefined,
    });
    onClose();
    showToast("Updated ✨");
  };

  return (
    <div className={`pt-1 ${themeClass(person.theme)}`}>
      <h2 className="font-display text-[1.45rem] font-semibold text-ink">Update this little thing</h2>
      <p className="mt-1 text-[0.92rem] text-brown">Edit it, or move it to another little corner.</p>

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">where does it live?</p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {person.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setToSectionId(s.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[0.84rem] font-bold transition ${
              s.id === toSectionId ? "bg-ink text-cream" : "bg-cream-deep text-brown ring-1 ring-line/60"
            }`}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">the little thing</p>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.98rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a note (optional)</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.95rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      <p className="mb-2 mt-5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">tags (optional)</p>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="comma, separated, little, labels"
        className="w-full rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-[0.95rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      <motion.button
        type="button"
        whileTap={tap}
        onClick={save}
        disabled={!canSave}
        className="mt-6 w-full rounded-pill bg-ink py-4 text-[1rem] font-bold text-cream shadow-lift disabled:opacity-40"
      >
        Save changes
      </motion.button>
    </div>
  );
}
```

- [ ] **Step 4: Mount the three sheets in `app-shell.tsx`**

Add imports and render them after `<CreatePersonSheet />` (and before `<ConfirmSheet />`):

```tsx
import { EditListSheet } from "./edit-list-sheet";
import { EditPersonSheet } from "./edit-person-sheet";
import { EditDetailSheet } from "./edit-detail-sheet";
// ...
          <EditListSheet />
          <EditPersonSheet />
          <EditDetailSheet />
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/edit-list-sheet.tsx components/edit-person-sheet.tsx components/edit-detail-sheet.tsx components/app-shell.tsx
git commit -m "feat(ui): add edit sheets for lists, people, and details"
```

---

### Task 9: Detail-header menus + list-page filter helper

**Files:**
- Modify: `components/detail-header.tsx` (add optional `menu` slot)
- Modify: `app/(app)/list/[id]/page.tsx` (pass an `OverflowMenu`; use `filterItemsByStatus`)
- Modify: `app/(app)/person/[id]/page.tsx` (pass an `OverflowMenu`)

**Interfaces:**
- Consumes: `OverflowMenu` (Task 6); `useUi()` `openEditList`/`openEditPerson`/`openConfirm`; `useStore()` `deleteList`/`deletePerson`; `useRouter`; `filterItemsByStatus` (Task 1).
- Produces: `DetailHeader` gains optional prop `menu?: ReactNode`.

- [ ] **Step 1: Add the `menu` slot to `DetailHeader`**

In `components/detail-header.tsx`, add `menu?: ReactNode` to `DetailHeaderProps` and render it top-right opposite the Back button. Wrap the back button and menu in a row:

```tsx
import type { ReactNode } from "react";
// ...
interface DetailHeaderProps {
  emoji: string;
  title: string;
  subtitle?: string;
  sticker?: StickerName;
  menu?: ReactNode;
}

export function DetailHeader({ emoji, title, subtitle, sticker = "sparkle", menu }: DetailHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden rounded-b-[2rem] px-5 pb-7 pt-[calc(env(safe-area-inset-top)+1rem)]" style={{ background: "var(--t-bg)" }}>
      <Sticker name={sticker} size={92} className="pointer-events-none absolute -right-4 top-3 opacity-20" rotate={14} />

      <div className="flex items-center justify-between">
        <motion.button
          type="button"
          whileTap={tap}
          onClick={() => router.back()}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-paper/80 text-ink shadow-soft backdrop-blur-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        {menu}
      </div>

      <div className="mt-5 flex items-end gap-3">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-paper text-3xl shadow-soft">{emoji}</span>
        <div className="min-w-0 pb-0.5">
          <h1 className="font-display text-[1.65rem] font-semibold leading-[1.14] text-[var(--t-ink)]">{title}</h1>
          {subtitle && <p className="mt-1 text-[0.92rem] font-semibold text-brown">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the list detail page**

In `app/(app)/list/[id]/page.tsx`:
- Add to the `useStore()` destructure: `deleteList`. Add to `useUi()`: `openEditList`, `openConfirm`. Add `useRouter` from `next/navigation`.
- Import `OverflowMenu` and `filterItemsByStatus`.
- Replace the inline `visible` filter body with the helper:

```tsx
import { filterItemsByStatus } from "@/lib/store-helpers";
// ...
  const visible = useMemo(() => {
    if (!list) return [];
    return filterItemsByStatus(list.items, filter);
  }, [list, filter]);
```

- Pass the menu to `DetailHeader` (only when `list` exists). Define a handler above the return:

```tsx
  const router = useRouter();
  const listMenu = list ? (
    <OverflowMenu
      ariaLabel="List options"
      items={[
        { label: "Edit list", onSelect: () => openEditList(list.id) },
        {
          label: "Delete list",
          tone: "danger",
          onSelect: () =>
            openConfirm({
              title: "Remove this little list?",
              body: "This will delete the list and everything inside it.",
              confirmLabel: "Delete list",
              tone: "danger",
              onConfirm: () => {
                deleteList(list.id);
                showToast("Removed from your little world");
                router.replace("/");
              },
            }),
        },
      ]}
    />
  ) : null;
```

`showToast` comes from `useUi()` — add it to that destructure. Then:

```tsx
      <DetailHeader
        emoji={list.emoji}
        title={list.title}
        subtitle={listCountLabel(list)}
        sticker={TEMPLATE_META[list.template].sticker}
        menu={listMenu}
      />
```

- [ ] **Step 3: Wire the person detail page**

In `app/(app)/person/[id]/page.tsx`:
- Add to `useStore()`: `deletePerson`. Add to `useUi()`: `openEditPerson`, `openConfirm`, `showToast`. Import `OverflowMenu`, `useRouter`.
- Build the menu and pass it to `DetailHeader`:

```tsx
  const router = useRouter();
  const personMenu = (
    <OverflowMenu
      ariaLabel="Person options"
      items={[
        { label: "Edit person", onSelect: () => openEditPerson(person.id) },
        {
          label: "Delete person",
          tone: "danger",
          onSelect: () =>
            openConfirm({
              title: "Remove this person?",
              body: "This will delete them and every little detail you saved.",
              confirmLabel: "Delete person",
              tone: "danger",
              onConfirm: () => {
                deletePerson(person.id);
                showToast("Removed from your little world");
                router.replace("/people");
              },
            }),
        },
      ]}
    />
  );
```

Add `menu={personMenu}` to the `DetailHeader`. (Build `personMenu` after the `if (!person) return ...` guard so `person` is defined.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/detail-header.tsx "app/(app)/list/[id]/page.tsx" "app/(app)/person/[id]/page.tsx"
git commit -m "feat(ui): add edit/delete menus to list and person detail headers"
```

---

### Task 10: Card overflow menus on home and people grids

**Files:**
- Modify: `components/list-card.tsx`
- Modify: `components/person-card.tsx`

**Interfaces:**
- Consumes: `OverflowMenu` with `stopPropagation` (Task 6); `useUi()` (`openEditList`/`openEditPerson`, `openConfirm`, `showToast`); `useStore()` (`deleteList`/`deletePerson`).
- Note: both cards are `Link`s — the menu must use `stopPropagation` so opening it or selecting an action does not navigate.

- [ ] **Step 1: Add the menu to `ListCard`**

Convert `ListCard` to a client hook consumer (the file is already `"use client"`). Position the menu absolutely in the top-right of the card, above the sticker. Add imports:

```tsx
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { OverflowMenu } from "./overflow-menu";
```

Inside `ListCard`, before the return:

```tsx
  const { deleteList } = useStore();
  const { openEditList, openConfirm, showToast } = useUi();

  const menu = (
    <div className="absolute right-2.5 top-2.5 z-20">
      <OverflowMenu
        ariaLabel={`Options for ${list.title}`}
        stopPropagation
        items={[
          { label: "Edit list", onSelect: () => openEditList(list.id) },
          {
            label: "Delete list",
            tone: "danger",
            onSelect: () =>
              openConfirm({
                title: "Remove this little list?",
                body: "This will delete the list and everything inside it.",
                confirmLabel: "Delete list",
                tone: "danger",
                onConfirm: () => {
                  deleteList(list.id);
                  showToast("Removed from your little world");
                },
              }),
          },
        ]}
      />
    </div>
  );
```

Render `{menu}` as the first child inside the `motion.div` (it is `relative`), so the menu sits above the sticker. The menu's `stopPropagation` keeps card navigation intact for the rest of the card.

- [ ] **Step 2: Add the menu to `PersonCard`**

Same pattern. Add the imports and:

```tsx
  const { deletePerson } = useStore();
  const { openEditPerson, openConfirm, showToast } = useUi();
```

Make the inner `motion.div` `relative` (add `relative` to its className) and render at the top:

```tsx
        <div className="absolute right-2.5 top-2.5 z-20">
          <OverflowMenu
            ariaLabel={`Options for ${person.name}`}
            stopPropagation
            items={[
              { label: "Edit person", onSelect: () => openEditPerson(person.id) },
              {
                label: "Delete person",
                tone: "danger",
                onSelect: () =>
                  openConfirm({
                    title: "Remove this person?",
                    body: "This will delete them and every little detail you saved.",
                    confirmLabel: "Delete person",
                    tone: "danger",
                    onConfirm: () => {
                      deletePerson(person.id);
                      showToast("Removed from your little world");
                    },
                  }),
              },
            ]}
          />
        </div>
```

Add right padding to the person card's header text container if needed so the name doesn't run under the menu (e.g. add `pr-10` to the `flex items-center gap-3.5` row).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/list-card.tsx components/person-card.tsx
git commit -m "feat(ui): add edit/delete menus to home list cards and people cards"
```

---

### Task 11: Enriched item editor (title, tags, emoji, confirmed delete)

**Files:**
- Modify: `components/item-card.tsx` (`ItemEditor`)

**Interfaces:**
- Consumes: `useStore()` `updateItem`/`deleteItem`; `useUi()` `openConfirm`, `showToast`; `ITEM_TYPE_META`, `STATUSES_FOR`.
- Behavior: edit title (all items), tags (all items), emoji (note-type items only — media items keep their search cover), plus the existing status + note. Delete routes through `openConfirm`.

- [ ] **Step 1: Rewrite `ItemEditor`**

Replace the `ItemEditor` function in `components/item-card.tsx` with:

```tsx
const NOTE_EMOJI_CHOICES = ["✨", "🍴", "📍", "🎁", "🌷", "☕", "🍵", "🌿", "🏞️", "💌", "🐾", "🌙"];

function ItemEditor({ listId, item }: { listId: string; item: Item }) {
  const { updateItem, deleteItem } = useStore();
  const { openConfirm, showToast } = useUi();
  const options = STATUSES_FOR[item.type];
  const isNote = ITEM_TYPE_META[item.type].aspect === "note";

  return (
    <div className="mt-3 rounded-xl bg-cream-deep/60 p-3.5">
      {/* title */}
      <p className="mb-1.5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">the name</p>
      <input
        defaultValue={item.title}
        onChange={(e) => updateItem(listId, item.id, { title: e.target.value })}
        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[0.95rem] font-medium text-ink focus:border-[var(--t-edge)] focus:outline-none"
      />

      {/* emoji — note-type items only */}
      {isNote && (
        <>
          <p className="mb-1.5 mt-3.5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">its little face</p>
          <div className="grid grid-cols-6 gap-1.5">
            {NOTE_EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => updateItem(listId, item.id, { emoji: e })}
                className={`grid aspect-square place-items-center rounded-lg text-xl transition ${
                  item.emoji === e ? "bg-cream-deep ring-2 ring-ink/20" : "bg-cream-deep/40"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}

      {/* status */}
      <p className="mb-2 mt-3.5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">how do you feel about it?</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((s) => {
          const selected = item.status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => updateItem(listId, item.id, { status: s })}
              className={`rounded-pill transition ${selected ? "ring-2 ring-ink/20" : "opacity-55 hover:opacity-90"}`}
            >
              <StatusPill status={s} />
            </button>
          );
        })}
      </div>

      {/* note */}
      <p className="mb-1.5 mt-3.5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">a little note</p>
      <textarea
        defaultValue={item.note ?? ""}
        onChange={(e) => updateItem(listId, item.id, { note: e.target.value })}
        placeholder="Add a note so future you remembers why ✨"
        rows={2}
        className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[0.9rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      {/* tags */}
      <p className="mb-1.5 mt-3.5 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">tags (optional)</p>
      <input
        defaultValue={(item.tags ?? []).join(", ")}
        onChange={(e) =>
          updateItem(listId, item.id, {
            tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
          })
        }
        placeholder="comma, separated, little, labels"
        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[0.9rem] text-ink placeholder:text-brown-soft/70 focus:border-[var(--t-edge)] focus:outline-none"
      />

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() =>
            openConfirm({
              title: "Remove this little thing?",
              body: "It'll be gone from this little list.",
              confirmLabel: "Remove",
              tone: "danger",
              onConfirm: () => {
                deleteItem(listId, item.id);
                showToast("Removed from your little world");
              },
            })
          }
          className="rounded-pill px-3 py-1.5 text-[0.78rem] font-bold text-brown-soft transition-colors hover:bg-cream-deep hover:text-ink"
        >
          Remove from this little list
        </button>
      </div>
    </div>
  );
}
```

Add the `useUi` import to the file:

```tsx
import { useUi } from "@/lib/ui";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/item-card.tsx
git commit -m "feat(items): edit title/tags/emoji and confirm item deletion"
```

---

### Task 12: Person-detail entry edit + confirmed delete

**Files:**
- Modify: `components/person-detail-section.tsx` (tap to edit; `×` → confirm)
- Modify: `app/(app)/person/[id]/page.tsx` (wire `onEdit` + confirmed `onDelete`)

**Interfaces:**
- Consumes: `useUi()` `openEditDetail`, `openConfirm`, `showToast`; `useStore()` `deletePersonDetail`.
- Produces: `PersonDetailSection` gains `onEdit?: (detailId: string) => void`; its `onDelete` is now invoked by the parent through a confirm.

- [ ] **Step 1: Add `onEdit` and make entries tappable**

In `components/person-detail-section.tsx`, extend the props and wire edit/delete. For chips, tapping the chip body calls `onEdit`; the `×` calls `onDelete`. For notes, tapping the row text calls `onEdit`; the `×` calls `onDelete`.

```tsx
export function PersonDetailSection({
  section,
  onDelete,
  onEdit,
}: {
  section: PersonSection;
  onDelete?: (detailId: string) => void;
  onEdit?: (detailId: string) => void;
}) {
```

Chip entry — wrap the label in a button that calls `onEdit`:

```tsx
                    <motion.span
                      key={e.id}
                      layout
                      className="group inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[0.85rem] font-semibold text-[var(--t-ink)]"
                      style={{ background: "var(--t-bg)" }}
                    >
                      <button
                        type="button"
                        onClick={() => onEdit?.(e.id)}
                        className="cursor-pointer text-left"
                      >
                        {e.title}
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(e.id)}
                          aria-label={`Remove ${e.title}`}
                          className="grid h-4 w-4 place-items-center rounded-full text-[var(--t-ink)]/50 transition-colors hover:bg-ink/10 hover:text-[var(--t-ink)]"
                        >
                          ×
                        </button>
                      )}
                    </motion.span>
```

Note entry — make the text span a button:

```tsx
                      <button
                        type="button"
                        onClick={() => onEdit?.(e.id)}
                        className="flex-1 text-left"
                      >
                        {e.title}
                        {e.note && <span className="mt-0.5 block text-[0.82rem] text-brown">{e.note}</span>}
                      </button>
```

(keep the existing `×` delete button as-is).

- [ ] **Step 2: Wire the person page**

In `app/(app)/person/[id]/page.tsx`, add `openEditDetail`, `openConfirm`, `showToast` from `useUi()`. Pass both handlers to each `PersonDetailSection`:

```tsx
              <PersonDetailSection
                section={s}
                onEdit={(detailId) => openEditDetail(person.id, s.id, detailId)}
                onDelete={(detailId) =>
                  openConfirm({
                    title: "Remove this little thing?",
                    body: "It'll be gone from their little world.",
                    confirmLabel: "Remove",
                    tone: "danger",
                    onConfirm: () => {
                      deletePersonDetail(person.id, s.id, detailId);
                      showToast("Removed from your little world");
                    },
                  })
                }
              />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/person-detail-section.tsx "app/(app)/person/[id]/page.tsx"
git commit -m "feat(people): edit details, move between sections, confirm detail deletion"
```

---

### Task 13: Full runtime verification (pixel-perfect pass)

**Files:** none (verification only)

This task uses the **verify skill**: build, run the app, and drive every flow in the browser (Playwright MCP), capturing screenshots. It is the behavioral proof for Tasks 2–12 (which have no unit tests).

- [ ] **Step 1: Start the dev server**

Run (background): `npm run dev` and wait for "Ready". Confirm `npx prisma generate` has run (it runs on install; if the music-template gotcha recurs, regenerate). Open `http://localhost:3000`.

- [ ] **Step 2: Drive each flow and screenshot**

Sign in, then exercise and visually confirm each:

1. **Edit list:** open a list → `⋯` → Edit list → change title, emoji, theme, **template** (e.g. movie→book) → Save. Expect "Updated ✨", header + card reflect changes, item covers re-render for the new kind, no console errors.
2. **Template fallback:** after the template change, confirm items with a now-out-of-template status still show under "All" and not under a missing status filter.
3. **Delete list:** `⋯` → Delete list → confirm sheet shows "This will delete the list and everything inside it." → Delete list → toast "Removed from your little world", redirected home, list gone.
4. **Card menu:** on Home, a list card `⋯` → Edit / Delete works without navigating into the list.
5. **Item edit:** open an item card → edit title, tags, emoji (note item), status, note → values persist.
6. **Item delete:** item editor → Remove → confirm "Remove this little thing?" → removed, toast.
7. **Edit person / delete person:** from the person detail header `⋯` and from a people-grid card.
8. **Edit detail / move section:** tap a detail → change title/note/tags, pick a different section → Save → it moves; tapping the same section edits in place.
9. **Delete detail:** `×` on a chip/note → confirm → removed.
10. **Create sheets still work:** create a new list and a new person (regression check on the Task 7 extraction).

- [ ] **Step 3: Reload-persistence check**

After the edits/moves, hard-reload and confirm all changes persisted (server round-trips, not just optimistic state) and the console is clean.

- [ ] **Step 4: Report**

Produce a verify-style report (PASS/FAIL + steps + screenshots). Any FAIL → fix before finishing the branch.

---

## Self-Review

**Spec coverage:**
- Lists: edit title/emoji/theme/template/view → Tasks 2,4,8,9; delete + confirm → Tasks 2,4,5,9,10. ✓
- List items: edit title/note/status/tags/emoji → Task 11; delete + confirm → Tasks 5,11; reorder → out of scope per Global Constraints. ✓
- People: edit name/emoji/note/theme → Tasks 2,4,8,9,10; delete + confirm → Tasks 2,4,9,10. ✓
- Person details: edit title/note → Task 8,12; move section → Tasks 1,2,4,8; delete + confirm → Tasks 5,12. ✓
- UX: cozy sheets/popovers (ConfirmSheet, OverflowMenu), warm copy (copy table), avoid accidental deletion (confirm), success toasts, mobile-first (BottomSheet). ✓
- Testing: pure-logic units (Task 1) + runtime verification (Task 13). ✓

**Placeholder scan:** no TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `UpdateListPatch`/`UpdatePersonPatch`/`UpdatePersonDetailPatch`, `ConfirmOptions`/`ConfirmState`, `ListFormValue`/`PersonFormValue`, and the store wrapper signatures match across Tasks 1–12. `updatePersonDetail(personId, fromSectionId, detailId, patch)` is used identically in store (Task 4), edit-detail sheet (Task 8), and person page (Task 12). ✓
