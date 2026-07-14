# Paste-to-Import — bring your lists from Notes

**Date:** 2026-07-13 · **Status:** spec for review (rev 2 — user upgraded media
matching from a review step to fully automatic: "anything that has images or
posters should automatically be added")
**Companion mini-feature (no own spec):** OG social card for the landing page (§7).

## Context

The coldest moment in the product is a new user with 40 movies in Apple Notes
and an empty Little Lists. Retyping is the #1 bounce reason for exactly the
thoughtful users the product targets. Paste-a-list → items with real covers is
the highest-leverage conversion feature available, and it reuses the existing
media-search providers wholesale. User decisions: available from BOTH an
existing list and the new-list moment; matches go through a REVIEW step before
anything saves (no wrong posters sneak in).

## 1. Entry points (one shared sheet)

- **List detail ⋯ menu:** new item "Paste a list in" (between "Edit list" and
  "Duplicate list").
- **Empty-state CTA:** the list empty state gains "or paste a whole list in ›"
  — this IS the "step when creating a new list": creating a list lands you on
  its empty state, so the paste option greets you immediately. (Adaptation
  from the approved option: same reachability, no create-sheet surgery, and
  every empty list benefits.)

Both open the same `ImportSheet` (new `components/import-sheet.tsx`, lazy via
app-shell like the other sheets) bound to the current list.

## 2. Parsing (pure, unit-tested — new `lib/import.ts`)

`parsePastedList(text: string): string[]`
- Split on newlines; trim.
- Strip leading list markers: `-`, `*`, `•`, `·`, `–`, `—`, `☐`, `☑`, `[ ]`,
  `[x]`, and numbering (`1.`, `1)`, `(1)`).
- Drop empty lines and case-insensitive duplicates within the paste.
- Cap at **50 lines**; if truncated, the sheet says "50 at a time for now —
  paste the rest after ✨" (no silent truncation).

## 3. Matching — automatic, no review gate

Paste box → **"Tuck them in ✨"** → the sheet becomes a live progress view and
everything saves by itself. The paste-to-poster-wall moment IS the feature; no
per-row approval.

- **Searchable kinds (movie/book/music):** each line fires
  `/api/search/<kind>?q=<line>` in waves of 4 (reuse the pocket detection
  wave pattern). The top hit's cover/subtitle/meta auto-applies; rows stream
  in visibly (spinner → cover thumbnail) so the magic is watchable. Lines
  with no/failed match import as typed (placeholder cover). When the last
  line settles, the whole batch saves in one transaction and the sheet
  closes. A wrong poster is fixed per-item afterwards (editor already
  supports it) — the toast copy invites a glance: see §4.
- **Non-searchable kinds (food/place/date/gift/custom):** no matching; the
  batch saves immediately on tap. (Gift imports carry no person link —
  statuses land as "idea"; link people later per item.)
- Escape/dismiss during matching aborts the import — nothing saves until the
  single transactional save fires (consistent with quick-pick's
  dismiss-aborts rule).

## 4. Saving

New transactional server action `importItemsAction(listId, inputs:
CreateItemInput[]): Promise<Item[]>` in `lib/actions.ts` (same shape checks as
`createItemAction`, one transaction, positions appended in paste order) + a
store mutation `importItems` (optimistic, mirrors `addItem`'s pattern).

- Every imported item gets `status: captureStatusFor(template)` and, for
  matched rows, the hit's `imageUrl`/`subtitle`/`meta`.
- Toast: `Tucked N things into <list> ✨` — with **Undo** (removes the whole
  imported batch; with no review gate, batch Undo is the safety net). Undo
  deletes the returned item ids; reuse the deferred-commit pattern only if
  cheap, otherwise immediate delete like quick-save's Undo.
- **Analytics:** per item `item_created` with `flow: "import"` (widen the
  union `"quick" | "detailed" | "import"`), plus ONE
  `feature_used { feature: "paste_import", lines: N, matched: M }` summary
  (counts are schema-legal).

## 5. Edge cases

- Duplicate titles vs items already in the list: lines that exactly match an
  existing item title (case-insensitive, `isDuplicateTitle`) are skipped
  automatically and reported in the toast ("skipped 2 already here"). No
  confirm sheets in bulk.
- Search failures/timeouts: row falls back to as-typed, never blocks the
  import.
- Paste of one line still works (degenerate case of the same flow).
- Line length: clip each line to the same max used for item titles.

## 6. Out of scope (MVP)

CSV/JSON re-import of exports, cross-list splitting of a mixed paste,
person-linking during import, a per-row review/toggle UI (deliberately
dropped in rev 2), IME/RTL-specific parsing.

## 7. Companion: OG social card (landing page)

`app/opengraph-image.tsx` (Next ImageResponse, static at build): warm cream
ground, Fraunces "Little Lists" wordmark, tagline "remember what you love and
what they love", and a rotated cover-stack motif echoing `CardStack` (drawn
with plain divs — no remote images). Also set `metadata.openGraph` +
`twitter: summary_large_image` in `app/layout.tsx`. Brand register applies;
verify with an OG preview render before merge.

## Verification

- Vitest: `parsePastedList` (markers, numbering, checkboxes, dupes, cap,
  empties), `importItemsAction` shape/transaction (mock level consistent with
  existing action tests where cheap).
- Live (`verify` skill): paste a 12-line movie list from a Notes-style text →
  covers stream in, batch auto-saves, posters render with "want-to-watch",
  toast Undo removes the whole batch; paste into a food list → instant save,
  "Need to try"; lines already in the list are skipped and the toast says so;
  60-line paste shows the cap message; Escape mid-matching aborts with
  nothing saved; empty-state CTA and ⋯ menu both open the sheet.
- OG: `curl -I /opengraph-image` 200 + visual check of the rendered card.
