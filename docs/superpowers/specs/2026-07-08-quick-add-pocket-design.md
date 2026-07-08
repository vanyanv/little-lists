# Quick-Add Pocket — Design

**Date:** 2026-07-08
**Status:** Approved

## Purpose

Little Lists' biggest friction is capture: adding something requires opening the app, finding the right list, and completing the add flow — but thoughts arrive un-filed ("that ramen place Dana mentioned"). The Pocket is a global quick-capture surface: jot a "scrap" in two seconds with **zero decisions**, then file it into a list later, in a calm moment, with enrichment-powered suggestions doing most of the sorting.

Product constraints (from the post-MVP strategy):

- The pocket must stay a small, cozy holding spot — never a pseudo-list. No statuses, no views, no tags on scraps.
- Suggestion chips must be **right or absent** — a wrong guess erodes trust in the whole feature.
- This is the in-app half of "quick capture"; a future PWA share target (Phase 2) will land shares in the same pocket via the same action.

## Decisions made during brainstorming

1. **Capture requires no decisions** — pure scrap (text only), not "confirm a suggested destination."
2. **Entry point: Pocket slot in the bottom nav** (Lists · Pocket · People · Profile), opening a bottom sheet. The contextual floating + button is unchanged everywhere.
3. **Filing: both** inline one-tap suggestion chips **and** tap-through to the full pre-seeded add flow.
4. **Destinations: existing lists + a "new little list" escape hatch.** Person profiles come later with person↔list linking.
5. **Data model: dedicated `Scrap` table** (not a hidden system list, not nullable `listId` on `ListItem`).

## Data model

New Prisma model (one migration):

```prisma
model Scrap {
  id        String   @id @default(cuid())
  userId    String
  text      String
  detection Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user Profile @relation(fields: [userId], references: [clerkUserId], onDelete: Cascade)

  @@index([userId])
}
```

- `Profile` gains `scraps Scrap[]`.
- `detection` caches the enrichment guess, computed at most once per scrap:
  - matched: `{ kind: "movie" | "book" | "music", title, subtitle, imageUrl?, sourceId, meta }`
  - checked-but-no-match: `{ none: true }`
  - `null` = not yet checked.

## Server actions (`lib/actions.ts`)

- `createScrapAction(text: string): Promise<Scrap>` — trimmed, non-empty, ≤200 chars.
- `deleteScrapAction(scrapId: string): Promise<void>`
- `saveScrapDetectionAction(scrapId: string, detection: Json): Promise<void>`
- `fileScrapAction(scrapId: string, listId: string, input: CreateItemInput): Promise<Item>` — **transactional**: creates the `ListItem` (reusing the creation logic of `createItemAction`) and deletes the scrap in one transaction.

All follow the existing auth/ownership pattern (`clerkUserId` scoping) used by every action in the file.

## Client state (`lib/store.tsx`)

Scraps join the global store, serialized from the server layout like lists/people. Store methods: `addScrap` (optimistic — capture must feel instant), `removeScrap` (deferred-delete with undo, same pattern as items/lists/people), `setScrapDetection`, `fileScrap` (optimistic: item appears in target list, scrap leaves the pile; undo restores the scrap and removes the item, commit runs `fileScrapAction`).

## UI

### Bottom nav (`components/bottom-nav.tsx`)

Fourth slot **Pocket** between Lists and People. It is a `button` (opens the pocket sheet), not a `Link`; no active-route state. When scraps exist, the icon wears a small count badge (display capped at "9+"). Icon: a hand-drawn pocket, consistent with `components/icons`.

### Pocket sheet (new `components/pocket-sheet.tsx`)

New sheet kind `"pocket"` in `lib/ui.tsx`, rendered with the existing `BottomSheet`.

- **Top — capture:** one autofocused input ("Jot it down before it flits off…") + save. Enter saves, clears the input, keeps the sheet open, and the scrap drops into the pile below with a soft animation (rapid multi-capture = repeated Enter). Failures use the existing save-error toast; input constraints: trimmed, non-empty, `maxLength` 200.
- **Below — the pile:** scraps newest-first. Each row: text, relative timestamp ("just now", "3 days"), optional suggestion chip, overflow menu with delete (undo toast).
- **Empty state:** "Nothing tucked away. Jot the next little thing ✨"
- **Gentle fullness pressure:** at 7+ scraps the pile header reads "your pocket's getting cozy — tuck a few into lists? 🌿". No hard cap.

### Suggestion chips (detection)

- **Lazy:** when the pocket opens, scraps with `detection == null` (max 5 per open) are checked against the existing `/api/search/{movie,book,music}` routes in parallel.
- **Confidence rule:** a chip appears only on a confident match — after normalizing both strings (lowercase, strip punctuation, collapse whitespace), the top hit's title must equal the scrap text, or the scrap text must equal the start of the hit's title (user typed "past lives", hit is "Past Lives"). Otherwise persist `{ none: true }` and show nothing.
- Results (including "none") persist via `saveScrapDetectionAction` so detection never re-runs.
- **Chip tap = one-tap file:** into the user's most recently updated list of that kind, using detected title/subtitle/artwork/metadata and the template's default status. If no list of that kind exists, the chip reads "→ new Watchlist?" and creates the list from `TEMPLATE_META` defaults, then files.
- Search API failures degrade to no chip; capture and manual filing never depend on search.

### Filing via tap (full flow)

Tapping a scrap closes the pocket and opens the **existing dormant global-add flow** in `components/add-item-modal.tsx` (the list-less mode with type picker and destination auto-suggest, currently unreachable — see the comment at the type picker). Sheet state gains `scrapId`: query pre-filled with scrap text, search auto-running, type pre-set from detection when available.

The details step's "save into" row gains a trailing **"a new little list"** option: creates a list from the current type's template defaults and files into it in the same save.

On save, `fileScrapAction` runs; toast "Filed into {list} ✨" with **Undo** (deferred-commit).

## Out of scope (v1)

- PWA share target (Phase 2 — will call `createScrapAction`).
- Filing into person details (comes with person↔list linking).
- Scraps in onboarding/demo seeding.
- Editing a scrap's text (delete and re-jot).

## Testing

- Unit (colocated `lib/*.test.ts`, project convention): detection confidence matcher; scrap store helpers (optimistic add, deferred delete/file, undo restore); new-list-from-template defaults.
- End-to-end via the project's `verify` skill (dev server + Clerk test signup): jot → scrap appears; reopen pocket → chip appears for a real movie title; chip one-tap file → undo; tap-through file into a brand-new list; nav badge counts.
