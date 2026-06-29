# Edit, Delete & Manage interactions — design

**Date:** 2026-06-29
**Status:** Approved, ready for implementation plan

## Goal

Give users full control over the things they've collected: edit and delete
lists, list items, people, and person details, plus move a person detail to a
different section. Every destructive action is guarded by a warm confirmation.
Interactions are mobile-first and reuse the existing cozy sheets and cards.

This is a **wiring + UI** change, not a redesign. The Soft Collectible
Scrapbook look — the `BottomSheet`, the `DetailHeader`, the expand-to-edit
item cards, the create sheets — is preserved exactly. We add a management
layer on top of it.

### Out of scope (do not add)

Sharing, friends, comments, feed, AI. **Drag-to-reorder is explicitly
deferred** to a later step (it needs a schema `position` column + migration);
nothing in this spec adds ordering.

## Decisions (settled with the user)

- **Reorder:** skipped this step. No `position` field, no ordering UI.
- **Template editing:** a list's template **is** editable. When the template
  changes, items keep their stored `status` even if it is not in the new
  template's status set — such items simply don't appear under a status
  filter (they still appear under "All"). No status data is mutated or lost.
- **Edit/delete trigger:** an overflow (`⋯`) menu opens a cozy popover with
  *Edit* / *Delete*; *Edit* opens a bottom sheet, *Delete* opens a warm
  confirm sheet. Items keep their existing expand-to-edit card (enriched).

## Current state (what already exists)

- **Items** already have a full data layer: `updateItemAction(itemId, patch)`
  (title, subtitle, note, status, tags, emoji, rating) and
  `deleteItemAction(itemId)` in `lib/actions.ts`, with optimistic
  `updateItem` / `deleteItem` wrappers in `lib/store.tsx`. The expanded
  `ItemEditor` in `components/item-card.tsx` currently edits **status** and
  **note** only, and deletes **without** confirmation.
- **Person details** have `createPersonDetailAction` and
  `deletePersonDetailAction` (+ store wrappers). There is **no** update
  action and **no** move-section path. `PersonDetailSection` renders an
  inline `×` that deletes **without** confirmation.
- **Lists** have only `createListAction` and `setListViewAction` — **no**
  title/emoji/theme/template edit and **no** delete.
- **People** have only `createPersonAction` — **no** edit and **no** delete.
- `prisma/schema.prisma`: `ListItem.list` and `PersonDetail.person` both
  declare `onDelete: Cascade`, so deleting a list or person removes its
  children at the database level. **No manual child deletion is needed** in
  the delete actions.
- `DetailHeader` (`components/detail-header.tsx`) is shared by the list and
  person detail screens; it has a Back button top-left and no other actions.
- `BottomSheet` (`components/bottom-sheet.tsx`) provides scrim + spring +
  drag-to-dismiss + Escape handling, reused by every sheet.
- `UiContext` (`lib/ui.tsx`) holds the single `sheet` state and the toast.

## Architecture

Three layers, each following an established pattern in the repo.

### 1. Server actions — `lib/actions.ts`

All actions are ownership-scoped exactly like the existing ones (the row's
`userId` must equal the caller's `clerkUserId`). New actions:

```ts
export interface UpdateListPatch {
  title?: string;
  emoji?: string;
  theme?: ThemeColor;
  template?: ListTemplate;
  defaultView?: ViewMode;
}
// returns the updated List, or null when not owned/found
export async function updateListAction(listId: string, patch: UpdateListPatch): Promise<List | null>;

// cascade handles items; just deleteMany scoped to the user
export async function deleteListAction(listId: string): Promise<void>;

export interface UpdatePersonPatch {
  name?: string;
  emoji?: string;
  theme?: ThemeColor;
  note?: string; // "" clears it (stored as null)
}
export async function updatePersonAction(personId: string, patch: UpdatePersonPatch): Promise<Person | null>;

// cascade handles details
export async function deletePersonAction(personId: string): Promise<void>;

export interface UpdatePersonDetailPatch {
  title?: string;
  note?: string;             // "" clears it (stored as null)
  tags?: string[];
  /** UI section id to move to (e.g. "dates"); maps to the db enum via ID_TO_DB_SECTION */
  sectionId?: string;
}
// returns the new UI sectionId + updated entry (sectionId may differ from the old one = a move)
export async function updatePersonDetailAction(
  detailId: string,
  patch: UpdatePersonDetailPatch
): Promise<{ sectionId: string; entry: PersonDetailEntry } | null>;
```

`updateListAction` maps `template` through the existing `templateToDb`
bridge. `updatePersonDetailAction` maps `sectionId` through the existing
`ID_TO_DB_SECTION` map and re-derives the returned `sectionId` from the
saved row via `DB_SECTION_TO_ID`, so a move is reported back accurately.

Items need **no** new action — `updateItemAction` / `deleteItemAction`
already cover every editable field.

### 2. Store — `lib/store.tsx`

Optimistic wrappers mirroring the existing `addItem` / `deleteItem` shape
(apply locally → call action → on error revert + rethrow so the caller can
toast). Temp-id rows (not yet persisted) update locally and skip the network,
matching the existing `isTempId` guard.

```ts
updateList: (listId: string, patch: Partial<List>) => void;          // fire-and-forget, like updateItem
deleteList: (listId: string) => void;
```

`updateList` applies the patch optimistically; when `patch.template` is
present it also re-derives `noun` and `kind` from `TEMPLATE_META[template]`
(the same derivation `mapDraftList` already uses), so the card label and item
rendering stay correct without a server round-trip. The persisted
`updateListAction` only stores `templateType`; `noun`/`kind` are always
derived from it on read.

```ts
updatePerson: (personId: string, patch: Partial<Person>) => void;
deletePerson: (personId: string) => void;
updatePersonDetail: (
  personId: string,
  fromSectionId: string,
  detailId: string,
  patch: { title?: string; note?: string; tags?: string[]; toSectionId?: string }
) => void;
```

`updatePersonDetail` updates the entry's fields in place; when
`toSectionId` differs from `fromSectionId` it removes the entry from the old
section and inserts it into the new one (reusing the existing `removeDetail` /
`insertDetail` helpers). A small pure helper `moveDetailBetweenSections` holds
this transform so it is unit-testable.

### 3. UI

**Two new reusable primitives:**

- `components/overflow-menu.tsx` — `OverflowMenu`. A `⋯` trigger button that
  opens a cozy anchored popover (full-screen transparent scrim to dismiss;
  the popover itself is a small rounded `bg-paper` card with `shadow-lift`).
  Props: `items: { label: string; tone?: "default" | "danger"; onSelect: () => void }[]`
  and an optional `ariaLabel`. The danger row uses warm red-clay text. Used on
  detail headers and on home/people cards (with `stopPropagation` so a card's
  menu does not trigger its navigation).

- `components/confirm-sheet.tsx` — `ConfirmSheet`. A `BottomSheet` rendering a
  title, body, a danger-toned confirm button, and a quiet Cancel. Driven by
  new `UiContext` state so any component can summon it:

  ```ts
  // added to UiContext in lib/ui.tsx
  confirm: ConfirmState | null;   // { title, body, confirmLabel, tone, onConfirm }
  openConfirm: (opts: ConfirmOptions) => void;
  closeConfirm: () => void;
  ```

  A single `<ConfirmSheet />` is mounted in `app-shell.tsx`. Confirming runs
  `onConfirm` then closes; cancelling just closes.

**Shared form extraction (DRY):**

The create sheets contain the field controls we also need for editing.
Extract the presentational field bodies so create and edit share them:

- `components/list-form-fields.tsx` — `ListFormFields` = the live preview +
  name input + template carousel + emoji grid + theme beads + view toggle,
  as a controlled component (value + onChange props for each field).
  `CreateListSheet` and the new `EditListSheet` both render it; each owns its
  own heading, save label, and submit logic. The template-carousel scroll/edge
  logic moves with it unchanged.
- `components/person-form-fields.tsx` — `PersonFormFields` = name + emoji +
  theme + note, controlled. Shared by `CreatePersonSheet` and `EditPersonSheet`.

This is a refactor of working code; create-sheet behavior must be unchanged
after extraction (verified at runtime).

**Three edit sheets** (each a `BottomSheet` keyed by id, prefilled from the
store, mounted in `app-shell.tsx`):

- `components/edit-list-sheet.tsx` — `EditListSheet`. Opens on
  `sheet.kind === "edit-list"`. Renders `ListFormFields` prefilled from the
  list; "Save changes" calls `updateList`; closes + toasts "Updated ✨".
  Heading: "Edit this little list".
- `components/edit-person-sheet.tsx` — `EditPersonSheet`. Opens on
  `sheet.kind === "edit-person"`. `PersonFormFields` prefilled; saves via
  `updatePerson`. Heading: "Edit their little world".
- `components/edit-detail-sheet.tsx` — `EditDetailSheet`. Opens on
  `sheet.kind === "edit-detail"`. Title + note + tags + the existing
  section-picker pill row (now also the **move** control), prefilled. "Save
  changes" calls `updatePersonDetail` with `toSectionId` = the picked section.
  Heading: "Update this little thing".

**New `UiContext` sheet states** (extend the `SheetState` union in `lib/ui.tsx`):

```ts
| { kind: "edit-list"; listId: string }
| { kind: "edit-person"; personId: string }
| { kind: "edit-detail"; personId: string; sectionId: string; detailId: string }
```

with openers `openEditList(listId)`, `openEditPerson(personId)`,
`openEditDetail(personId, sectionId, detailId)`.

## Entry points

- **List detail header** (`app/(app)/list/[id]/page.tsx`): `DetailHeader` gets
  an optional `menu?: ReactNode` slot rendered top-right (opposite Back). The
  list page passes `<OverflowMenu>` with *Edit list* → `openEditList(list.id)`
  and *Delete list* → `openConfirm({ title: "Remove this little list?", body:
  "This will delete the list and everything inside it.", confirmLabel: "Delete
  list", tone: "danger", onConfirm: () => { deleteList(list.id);
  router.replace("/"); showToast("Removed from your little world"); } })`.
- **Person detail header** (`app/(app)/person/[id]/page.tsx`): same `menu`
  slot with *Edit person* → `openEditPerson` and *Delete person* → confirm
  ("Remove this person?", "This will delete them and every little detail you
  saved.", "Delete person"), then `router.replace("/people")`.
- **Home list cards** (`components/list-card.tsx`) and **people cards**
  (`components/person-card.tsx`): the same `OverflowMenu` in a corner, with
  `stopPropagation`, offering Edit / Delete without navigating. Delete uses the
  same confirm copy; no router redirect needed (the card just disappears).
- **Items** (`components/item-card.tsx`): keep the expand-to-edit card. Enrich
  `ItemEditor` to also edit **title** (text input), **tags** (comma input,
  reusing the add-detail tag pattern), and **emoji** (for note-type items only
  — media items show their search cover). Its existing "Remove from this
  little list" button now calls `openConfirm` ("Remove this little thing?",
  "It'll be gone from this little list.", "Remove") before `deleteItem`.
- **Person detail entries** (`components/person-detail-section.tsx`): tapping
  a chip body / note row opens `EditDetailSheet`; the existing `×` becomes a
  quick delete that routes through `openConfirm` ("Remove this little thing?",
  …, "Remove"). Section emoji/label unchanged.

## Data flow

- **Edit:** sheet/editor → store optimistic patch → server action. On success,
  keep the optimistic state (the action's return reconciles ids where needed);
  on error, revert and `showToast("That didn't save — let's try again 🌿")`.
- **Delete:** trigger → `openConfirm(...)` → on confirm → store optimistic
  remove + server action → `showToast("Removed from your little world")`. For
  detail-screen deletes, redirect home/people first so the user isn't left on
  a dead route.

## Copy

| Surface | Copy |
| --- | --- |
| Edit list sheet heading | "Edit this little list" |
| Edit person sheet heading | "Edit their little world" |
| Edit detail sheet heading | "Update this little thing" |
| Delete list confirm | title "Remove this little list?" · body "This will delete the list and everything inside it." · button "Delete list" |
| Delete person confirm | title "Remove this person?" · body "This will delete them and every little detail you saved." · button "Delete person" |
| Delete item confirm | title "Remove this little thing?" · body "It'll be gone from this little list." · button "Remove" |
| Delete detail confirm | title "Remove this little thing?" · body "It'll be gone from their little world." · button "Remove" |
| Cancel (all confirms) | "Keep it" |
| Update toast | "Updated ✨" |
| Delete toast | "Removed from your little world" |
| Save-failure toast | "That didn't save — let's try again 🌿" |

## Error handling

- Provider/action errors → optimistic revert + the failure toast; the UI never
  ends in a half-applied state.
- A `null` return from an update/delete action (row not owned/found) is
  treated as a no-op on the server; the optimistic UI already removed/updated
  the row locally, and a background `console.error` records it (matching the
  existing `updateItem` / `deleteItem` error style).
- Confirm sheets prevent accidental deletion; the destructive button is the
  non-default (right/danger) action and Cancel ("Keep it") is always one tap.

## Testing

- **Unit (Vitest):** pure logic only, matching the existing normalizer-test
  style — `moveDetailBetweenSections` (entry leaves the old section, lands in
  the new one, other sections untouched) and a `statusVisibleForTemplate`-style
  helper proving an item with an out-of-template status still counts under
  "All" but not under a status filter.
- **Runtime verification (verify skill):** drive each flow end-to-end in the
  running app — edit a list (incl. template change), delete a list, edit/delete
  an item with confirm, edit a person, delete a person, edit a detail, move a
  detail to another section, delete a detail — confirming persistence across a
  reload and zero console errors. UI + Prisma flows are not meaningfully
  unit-testable, so runtime is the primary evidence (as in Step 4).
