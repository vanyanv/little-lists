# Capture Velocity — one-step add, everywhere

**Date:** 2026-07-13 · **Status:** approved in conversation, spec for review
**Slice:** 2.5 in the launch stretch (after S2 type-led cards, before S3 share target)

## Context

The product's core promise is "adds something in a few taps," but the add-item flow
today is two screens: compose (search or free text) → a details screen (status, note,
tag) → save. Everything on the details screen is optional, and status is auto-filled
on a search pick, so most trips through it add zero information and one full screen
of friction. This taxes every single use and is the behavior `item_created` will
judge first once real users arrive.

Principle: **save on first intent, embellish after.** The expanded item card is
already the embellishment surface (inline editor, status pills, notes, person picker);
we stop making people walk through a details toll booth before it.

## Design

### 1. One-tap save on search pick

Tapping a search result in the add-item flow saves the item immediately:
status = the template's capture default, cover/metadata from the hit, no note/tag.
The chosen-row glow plays, the sheet closes, and the toast reads
`Saved to <list> ✨` with **Undo** (existing deferred-commit pattern from
scrap filing; if a plain immediate save + `deleteItem` undo is simpler, that is
acceptable — the visible contract is just toast + working Undo).

The details step no longer appears on this path.

### 2. Enter-to-save free text

In the compose input, Enter saves:

- **Searchable templates (movie/book/music):** Enter picks the **first visible
  result** if any (the expected fast behavior; Undo makes a mispick cheap).
  With no results (or still searching), Enter saves the typed text as a manual
  item, same as today's "Add ‘x’ anyway."
- **Non-searchable templates:** Enter saves the typed text with capture defaults —
  except `personField` templates (gift), where Enter advances to the details step,
  consistent with §3's exception.
- Guard with `e.isComposing` (IME) — this also closes the known deferred minor
  for combobox Enter handlers. Empty/whitespace input: no-op.

### 3. The details step becomes opt-in

The compose step's primary button becomes **Save** (same action as Enter). A
quiet secondary affordance, "add details first," leads to the existing details
step unchanged for people who want status/note/tag up front.

**Exception — templates with `personField` (gift):** the details step stays in
the flow, because "who's it for?" is the point of a gift list, and the person
link drives the person-page "Little ideas" section. Rule of thumb: the details
screen only appears when it has something essential to ask.

### 4. Capture defaults per template

New optional `captureStatus` in `TEMPLATE_META` (lib/types.ts), falling back to
`statuses[0]`:

| Template | Capture default | Why |
|---|---|---|
| movie / book / music / place / date | `statuses[0]` (already "want-to-…") | first status is capture-shaped |
| gift | `statuses[0]` ("idea") | n/a (keeps details step anyway) |
| food | **`need-to-try`** | first status is "love", wrong for something not yet tried |
| custom | **no status** | "love" first is wrong for half of custom lists; unset is honest |

`statusesForList` / grandfathered people lists are untouched.

### 5. Duplicate guard

On both quick-save paths, a case-insensitive exact title match against the
target list opens the existing confirm sheet: "Already in this little list —
add it again?" (confirm = save anyway, cancel = keep the sheet open). Friction
returns only when it is earning its keep.

### 6. Analytics

`item_created` gains `flow: "quick" | "detailed"` (categorical, per the
schema's no-free-form rule). No schema change: `properties` is Json.

## Out of scope

Paste-to-import, "pick for me" shuffle, people in global search (candidate next
slice, not approved yet); the create-list flow; person-detail add flow; pocket
capture box (already one-step); any visual redesign of the compose step beyond
the button/affordance swap.

## Touched surfaces

`components/add-item-modal.tsx` (pickResult, continueManual, compose step
buttons, Enter handler), `lib/types.ts` (`captureStatus`), `lib/analytics`
call sites for `item_created`. Store/actions unchanged (existing `addItem` /
`fileScrap` are reused). Pocket tap-through filing inherits the fast path for
free (it is the same modal).

## Edge cases

- Enter during IME composition: ignored (`isComposing`).
- Enter while `searching` with stale results visible: results are dimmed and
  `pickResult` already ignores stale hits; Enter follows the same guard (falls
  back to save-as-typed).
- Scrap filing (`ScrapRef` present): quick save routes through `fileScrap`'s
  deferred transaction exactly as the details-step save does today.
- Duplicate check compares trimmed, case-folded titles; subtitle differences do
  not count as different (a second "Dune" with another year still prompts).

## Verification

- Unit: capture-default resolution (food → need-to-try, custom → none,
  movie → want-to-watch); duplicate matcher.
- Live (verify skill): movie list — type, Enter picks top hit, toast + Undo
  restores; food list — Enter saves with "Need to try"; gift list — details
  step still appears with person picker; duplicate add prompts; pocket
  tap-through quick-saves; keyboard-only pass (Enter, Escape, focus return).
- Analytics rows carry `flow` values. Lint/tests/build green.
