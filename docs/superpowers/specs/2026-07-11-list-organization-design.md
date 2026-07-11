# Better Organization Inside Lists

Date: 2026-07-11
Slice: Roadmap #3 (see `2026-07-11-product-roadmap.md`)
Status: Design approved; ready for implementation plan.

## Goal

Give a single list real collection controls: sort by several modes, drag to
reorder, pin items to the top, move/copy items between lists, filter by tag and
person, duplicate a whole list, and warn before adding an exact-duplicate item.
All seven capabilities ship in this one slice.

## What already exists (verified 2026-07-11 — do not rebuild)

- **`ListItem.position Int?` and `ListItem.pinned Boolean @default(false)` already
  exist in `prisma/schema.prisma`** but are DEAD: `mapItem`
  (`lib/server/serialize.ts:45`) does not read them, the client `Item` type
  (`lib/types.ts:117`) does not carry them, no action writes them, and no query
  sorts on them. The only reader is the raw JSON export route. **No migration is
  needed for these two columns** — they only need to be wired.
- **Item ordering today is purely `createdAt desc`**, set once in
  `lib/server/data.ts` `getInitialData()` via
  `include: { items: { orderBy: { createdAt: "desc" } } }`. There is no
  user-facing sort, reorder, or non-status filter anywhere.
- **The list detail page is a client component** (`app/app/(main)/list/[id]/page.tsx`,
  `ListDetailScreen`) reading from the client store via `useList(id)`. It already
  has status `FilterChips`, a grid/list/cozy `ViewToggle`, and an inline
  title/note search that appears only when a list has > 30 items.
- **All mutations flow through the optimistic client store** (`lib/store.tsx`);
  server actions in `lib/actions.ts` mutate the DB and return the mapped row —
  **none call `revalidatePath`/`revalidateTag`**. Every new action in this slice
  MUST follow that same optimistic pattern (mirror `updateItem`/`deleteItem` in
  the store).
- **`rating` and `type` are NOT columns** — they live inside `ListItem.metadata`
  JSON (`{ type, seed, rating }`), unpacked by `mapItem`.
- **Tags** are `String[] @default([])`; the client `Item.tags` is `undefined`
  when empty. A reserved `EXAMPLE_TAG` marker (from `@/lib/onboarding`) is
  filtered out of the editor and re-appended on save — preserve that handling.
- **A linked person** is `Item.personId?: string`; the person's name is
  denormalized into `Item.subtitle`. `linkedItemsByPerson(lists, personId)` in
  `lib/store-helpers.ts` already groups by person.
- **`List.pinned` and `List.defaultViewMode` are fully wired** (via
  `setListPinnedAction` / `setListViewAction`) — the templates to mirror for the
  new per-list sort preference.

## Global constraints

- **No em dashes** in any user-facing copy (project convention).
- **Optimistic-store pattern only** — no `revalidatePath`. Actions return the
  mapped row(s); the store applies changes locally. Mirror existing store
  mutators.
- **Ownership on every action** — every new action filters by the current
  `userId` (via the same auth/profile resolution the existing actions use) and
  verifies target-list ownership before writing, exactly like
  `createItemAction`/`moveItem` targets.
- **Analytics never breaks the product** — reuse the existing `feature_used`
  event via `trackProductEvent`; fire-and-forget, swallow errors. No new event
  names (keeps the slice #2 catalog stable).
- **440px mobile-first column** — every new control must work at 320–440px width
  and with touch. Reorder must work with touch, not just mouse.
- **This is a MODIFIED Next.js** (see `AGENTS.md`) — check
  `node_modules/next/dist/docs/` before using framework APIs; `@dnd-kit` is
  client-only so it is unaffected.

## Data model

One migration, one new column:

```prisma
model List {
  // ...existing fields...
  defaultSort String? // holds a SortMode id; null => "recent" default
}
```

- `ListItem.position Int?` and `ListItem.pinned Boolean` are reused as-is.
- Migration authored by hand (the environment cannot run `prisma migrate dev`
  interactively): generate with `prisma migrate diff --script`, place under
  `prisma/migrations/<timestamp>_list_default_sort/`, apply with
  `prisma migrate deploy`, verify with `prisma migrate status`. Then
  `prisma generate` and clear `.next/types`.

## Sort

`SortMode` id set (a fixed union, defined once in `lib/types.ts` or a small
`lib/sort.ts`):

| id | Label | Order (before pin float) |
|---|---|---|
| `recent` | Recently added | `createdAt` desc (current behavior, default) |
| `title` | Title A to Z | `title` case-insensitive asc, stable |
| `rating` | Highest rated | `rating` desc; unrated sort last |
| `status` | By status | grouped by `status` in the list's template status order; within a group, `createdAt` desc |
| `custom` | Custom order | `position` asc; items with null position sort after, by `createdAt` desc |

Rules:
- **Pinned items always float to the top**, in their own sub-order (same active
  sort applied within the pinned group), in every mode.
- Sorting is a **pure client-side transform** over the store's items — one
  `sortItems(items, mode)` helper in `lib/sort.ts`, unit-tested. The only server
  query change is that `data.ts` items include must also load `position`/`pinned`
  (they come through automatically once selected/mapped — see Wiring).
- The active mode is chosen from a compact sort control in the list detail header
  (near the existing `ViewToggle`). Persisted per list via `defaultSort`.

### `setListSortAction(listId: string, sort: SortMode): Promise<void>`

- Mirror `setListViewAction`. Verify list ownership, write `List.defaultSort`,
  return void. Store updates `list.defaultSort` optimistically.

## Custom order + drag reorder

- **Dependency:** add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`
  (client-only). Use `PointerSensor` + `KeyboardSensor` so drag works with touch,
  mouse, and keyboard; restrict movement to the vertical axis with a modifier.
- **Drag is enabled only when the active sort is `custom`.** In any other mode the
  rows render without drag handles (dragging would contradict a computed order).
  Switching to Custom is how the user unlocks reordering.
- **`reorderItemsAction(listId: string, orderedIds: string[]): Promise<void>`**
  - Verify list ownership. Verify every id in `orderedIds` belongs to that list
    and user (reject the call if any stray id is present). Write `position = index` for each id in
    a single transaction (`prisma.$transaction` of `updateMany`/`update` calls).
    Lists here are small, so a full rewrite is acceptable and avoids fractional
    indexing.
  - The store reorders `list.items` locally first (optimistic), then calls the
    action. On failure, the action having swallowed nothing, the store keeps the
    optimistic order (acceptable; next load reconciles).
- **Lazy position init:** if the list's items all have null `position` (legacy),
  the first successful `reorderItemsAction` assigns positions to the entire list
  based on the dropped order, so custom order becomes concrete. No separate
  backfill migration.
- Coexist with the existing `motion` layout animation: dnd-kit owns the drag
  transform; disable/skip the `layout` animation on the actively dragged row to
  avoid a fight (dnd-kit provides its own transform/transition).
- Analytics: `feature_used` with `{ feature: "items_reordered" }`, once per drop.

## Pin an item

- Wire the existing `ListItem.pinned` column:
  - `mapItem` reads `pinned` into the client `Item`; add `pinned?: boolean` to the
    `Item` type in `lib/types.ts`.
  - **`setItemPinnedAction(itemId: string, pinned: boolean): Promise<Item | null>`**
    — ownership check, `update({ data: { pinned } })`, return `mapItem`. Store
    updates the item optimistically (mirror `updateItem`).
  - Pin toggle in `ItemEditor` (a labeled toggle/button, e.g. "Pin to top" /
    "Unpin"). Pinned items float per the Sort rules above.
- Analytics: `feature_used` `{ feature: "item_pinned" }` on pin (not unpin).

## Move / copy between lists

Both actions live in `lib/actions.ts`; **Move is the primary** UI action.

- **`moveItemAction(itemId: string, targetListId: string): Promise<Item | null>`**
  - Verify ownership of the item AND the target list. Reassign `listId` to the
    target, set `position` to append at the target's end (max(position)+1 or null
    if target has no custom order yet), keep all other fields including
    `personId`/`pinned`/`metadata`. Return `mapItem`.
  - Store: remove the item from the source list, add to the target list.
  - Analytics: `feature_used` `{ feature: "item_moved" }`.
- **`copyItemAction(itemId: string, targetListId: string): Promise<Item | null>`**
  - Verify ownership of the item AND the target list. Create a NEW row in the
    target list copying `title, subtitle, note, status, emoji, imageUrl, tags,
    metadata, personId`; fresh id; append at target end; `pinned` reset to false.
    Return the new `mapItem`.
  - Store: add the new item to the target list; source unchanged.
  - Analytics: `feature_used` `{ feature: "item_copied" }`.
- **UI:** in `ItemEditor`, a "Move to list..." (primary) and "Copy to list..."
  (secondary) affordance that opens a picker of the user's OTHER lists (exclude
  the current list). Reuse the app's bottom-sheet/list-picker idiom. If the user
  has only one list, hide both controls.

## Filter by tag and person

- Keep the existing status `FilterChips` unchanged.
- Add a **secondary client-side filter** for tag and (on lists that have linked
  people) person. Filtering is a pure transform over the store's items — extend
  the existing `visible` computation in the list detail page.
  - **Tag filter:** the option set is the distinct tags actually present on the
    list's items (excluding `EXAMPLE_TAG`). Selecting a tag shows only items
    carrying it. "All tags" clears it.
  - **Person filter:** only rendered when at least one item in the list has a
    `personId`. Options are the distinct linked people (join `personId` to the
    store's `people`); label by person name. "Anyone" clears it.
- Status, tag, and person filters compose (AND). Keep the control compact for
  320–440px: a small filter affordance (e.g. a row of chips or a compact
  dropdown/sheet), not a wall of controls. Only render the tag/person filter when
  there is something to filter by (≥2 distinct tags, or ≥1 linked person).

## Duplicate a list

- **`duplicateListAction(listId: string): Promise<List>`** (returns the new list,
  including its items, in the same shape `getInitialData`/`mapList` produce).
  - Verify ownership. Create a new `List` copying
    `title` (+ " (copy)"), `emoji`, `templateType`, `themeColor`,
    `defaultViewMode`, `defaultSort`, `description`; `pinned` reset to false.
  - Deep-copy every item into the new list: copy
    `title, subtitle, note, status, emoji, imageUrl, tags, metadata, position,
    pinned, personId`; fresh ids. Preserve relative order.
  - Do it in a transaction. Return the fully mapped new list so the store can
    insert it without a reload.
  - Store: add the new list (and select/navigate per existing "create list" UX,
    or just surface it — match how `createListAction` results are handled).
  - Analytics: `feature_used` `{ feature: "list_duplicated" }`.
- **Trigger:** from the list's settings/menu surface (wherever
  `setListPinnedAction`/`deleteListAction` are already triggered from). A
  "Duplicate list" entry.

## Duplicate-item detection

- **Client-side, in the add-item flow** (the step-2 detail form where the title
  is known, before `createItemAction`/`fileScrapAction`). The store already holds
  the target list's items, so no round-trip.
- Before saving, normalize the new title (`trim().toLowerCase()`) and compare to
  each existing item's normalized title in the SAME target list. On an **exact**
  match, show a confirm: "'<title>' is already in this list. Add it anyway?" with
  Add anyway / Cancel. Case-insensitive, whitespace-trimmed; **exact only** (no
  fuzzy matching).
- Cancel aborts the save (returns the user to the form). Add anyway proceeds
  normally. No new server guard — the warning is a UX affordance, not an
  invariant.

## Wiring summary (files touched)

- `prisma/schema.prisma` — add `List.defaultSort String?`; hand-authored migration.
- `lib/server/serialize.ts` — `mapItem` reads BOTH `position` and `pinned` into
  the client `Item` (custom sort runs client-side, so the client needs
  `position`); `mapList` reads `defaultSort`.
- `lib/server/data.ts` — items include stays `orderBy: createdAt desc` (the client
  re-sorts); ensure `position`/`pinned` are selected (default full-row select
  already includes them).
- `lib/types.ts` — add `pinned?: boolean` and `position?: number | null` to
  `Item`; add `defaultSort?: SortMode` to the `List` type; define the `SortMode`
  union (or in `lib/sort.ts`).
- `lib/sort.ts` (new) — `SortMode`, `SORT_MODES` (id + label list),
  `sortItems(items, mode, statusOrder)` with pin-float; pure + unit-tested.
- `lib/actions.ts` — `setListSortAction`, `reorderItemsAction`,
  `setItemPinnedAction`, `moveItemAction`, `copyItemAction`, `duplicateListAction`.
- `lib/store.tsx` — optimistic mutators: set list sort, reorder items, set item
  pinned, move item across lists, copy item, add duplicated list.
- `components/item-card.tsx` (`ItemEditor`) — pin toggle; move/copy picker entry.
- `components/sort-control.tsx` (new) — sort mode picker in the detail header.
- `components/list-picker-sheet.tsx` (new, or reuse bottom-sheet) — target list
  chooser for move/copy.
- `app/app/(main)/list/[id]/page.tsx` — mount sort control; wrap rows in dnd-kit
  `SortableContext` when `custom`; extend `visible` with tag/person filters; add
  tag/person filter control.
- The list settings/menu surface — "Duplicate list" trigger.
- `package.json` — `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`.

## Testing

Unit (pure, fast — Vitest):
- `sortItems`: each of the 5 modes orders correctly; pinned float to top in every
  mode; null-position items sort last in `custom`; unrated sort last in `rating`;
  stable for equal keys.
- Duplicate-title detection helper: exact case-insensitive trimmed match true;
  different title false; whitespace/case variants match; empty list false.
- Any tag/person filter helper extracted from the page.

Action behavior (mock prisma, mirror existing action tests):
- `reorderItemsAction`: writes `position = index`; rejects ids not in the list;
  ownership enforced.
- `moveItemAction` / `copyItemAction`: ownership on item AND target; move
  reassigns `listId` and copy creates a new row with reset `pinned`.
- `duplicateListAction`: copies list + all items with fresh ids, " (copy)" title,
  `pinned` reset.
- `setItemPinnedAction` / `setListSortAction`: ownership + field write.

DnD interaction + the sort/filter controls are verified by a live Playwright
smoke (drag on touch, pin float, move/copy, duplicate, dedup warning) plus code
review, consistent with prior practice for interaction-heavy UI.

## Open questions resolved (from the roadmap)

- **Custom vs other sorts:** custom is one sort mode; drag only in custom mode;
  pinned floats in all modes. (Approved.)
- **Duplicate detection:** exact case-insensitive title match, warn-then-confirm.
  (Approved.)
- **Move vs copy default:** both offered, Move primary. (Approved.)
- **Sort persistence:** per-list, server-side (`List.defaultSort`), mirroring
  `defaultViewMode`. (Approved.)
- **Reorder interaction:** real touch drag via `@dnd-kit`. (Approved.)

## Out of scope (this slice)

- Cross-list bulk operations / multi-select.
- Fuzzy or cross-list duplicate detection.
- Saved/named filter presets.
- Fractional-index reordering (full position rewrite is enough at this scale).
- A new analytics event catalog (reuse `feature_used`).
