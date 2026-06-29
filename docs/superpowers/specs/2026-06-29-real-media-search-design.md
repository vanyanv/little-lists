# Real movie / book / music search — design

**Date:** 2026-06-29
**Status:** Approved, ready for implementation plan

## Goal

When users add items to movie, book, or music lists, they search **real** titles
and save visual cards with posters / covers / album art. Adding a movie, book,
or album should feel magical, visual, and easier than typing it into Notes.

This is a **wiring** change, not a redesign. The Soft Collectible Scrapbook UI,
the Add Item bottom sheet, and the list detail design are all preserved. The Add
Item sheet already has the full search *experience* (cozy result cards,
`SoftDotLoader`, picked-highlight, no-results state, manual "Custom" entry, and
the "Saved to your little world ✨" toast). Today it searches a local mock
catalog (`lib/mock-data.ts`); we replace that with real API data and persist the
returned cover image + metadata.

### Out of scope (do not add)

Recommendations, AI, social feed, friends, comments.

## Current state (what already exists)

- `prisma/schema.prisma` `ListItem` already has `imageUrl String?` and
  `metadata Json @default("{}")` columns.
- `createItemAction` (`lib/actions.ts`) writes `metadata = { type, seed? }` but
  does **not** write `imageUrl` or pass through richer metadata.
- `mapItem` (`lib/server/serialize.ts`) reads `metadata.type/seed/rating` but
  **not** `row.imageUrl`. UI `Item` (`lib/types.ts`) has no `imageUrl` field.
- `components/add-item-modal.tsx` compose step filters `MOVIE_CATALOG` /
  `BOOK_CATALOG` from `lib/mock-data.ts` client-side and fakes a 520ms search.
- `components/poster-card.tsx` renders `PlaceholderPoster` (designed
  seed-based art) for every movie/book.
- `.env.local` already contains `TMDB_API` and `TMDB_API_READ_ACCESS_TOKEN`.

## Decisions

- **Music** is a full **list template** (parallel to Movie/Book lists), not just
  an item type.
- **Books**: Open Library is the primary source; Google Books is a fallback when
  Open Library returns no results or no cover (and is the source of book
  descriptions, which Open Library serves thinly).
- **Music**: iTunes / Apple Search API (keyless), `entity=album,musicTrack` —
  albums **and** songs, both displaying album artwork.
- Music list template defaults: emoji 🎧, theme `lavender`, sticker `sparkle`.

## Architecture

### 1. Search providers (server-only) — `lib/search/`

Each provider is a pure-ish async function `search(q: string): Promise<SearchHit[]>`
that fetches its API and normalizes to one shape:

```ts
interface SearchHit {
  sourceId: string;              // tmdbId | Open Library key | iTunes track/collection id
  type: "movie" | "book" | "music";
  title: string;
  subtitle: string;              // year | author | artist
  imageUrl?: string;             // poster / cover / artwork (absolute URL)
  year?: number;
  overview?: string;             // movie overview | book description
  meta: Record<string, unknown>; // posterPath, isbn, author, sourceId, kind: "album" | "song"
}
```

- **Movies** — TMDB `GET /3/search/movie?query=`, `Authorization: Bearer
  ${TMDB_API_READ_ACCESS_TOKEN}`. Poster:
  `https://image.tmdb.org/t/p/w342{poster_path}` (omit `imageUrl` when
  `poster_path` is null). `meta`: `{ tmdbId, year, overview, posterPath }`.
- **Books** — Open Library `GET /search.json?title=&limit=…` primary; cover
  `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg`. When Open Library
  yields no usable results (or no cover), fall back to Google Books
  `GET /books/v1/volumes?q=`. `meta`: `{ author, year, description, isbn,
  sourceId }`.
- **Music** — iTunes `GET https://itunes.apple.com/search?media=music&entity=album,musicTrack&term=`.
  Upscale `artworkUrl100` → `…/600x600bb.jpg` (string replace). `meta`:
  `{ artist, year, kind: "album" | "song", sourceId }`.

Each provider catches its own network/parse errors and returns `[]` rather than
throwing, so a single dead provider degrades to the no-results path.

### 2. Transport — Route Handler

`app/api/search/[kind]/route.ts`, `GET ?q=`, `kind ∈ {movie, book, music}`.
- Validates `kind` (400 on unknown) and trims `q` (empty → `200 []`).
- Dispatches to the matching provider, returns `SearchHit[]` as JSON.
- Keeps the TMDB token server-side (providers are `server-only`).
- Verify Next 16 route-handler conventions against
  `node_modules/next/dist/docs/` before writing (per AGENTS.md).

Client live-search: ~350ms debounce + `AbortController` to cancel stale
in-flight requests as the user keeps typing.

### 3. Data model wiring

- `lib/types.ts`:
  - `ItemType` += `"music"`; add `ITEM_TYPE_META.music`
    (`searchable: true`, square `aspect`).
  - `Item` += `imageUrl?: string`.
  - `StatusId` += `"want-to-listen" | "listened" | "on-repeat"`; add to
    `STATUS_META`.
  - `STATUSES_FOR.music = ["want-to-listen", "listened", "on-repeat",
    "favorite", "not-for-me"]`.
  - `ListTemplate` += `"music"`; add `TEMPLATE_META.music`
    (🎧, lavender, sparkle, `statusHeading: "how's it sound?"`,
    `addHeading: () => "Add a song or album to this little list."`,
    `searchable: true`).
- `components/create-list-sheet.tsx`: add `music` to `TEMPLATE_ORDER`.
- `prisma/schema.prisma`: add `music` to `enum TemplateType`; create migration
  (`ALTER TYPE "TemplateType" ADD VALUE 'music'`). `templateToUi/Db` need no
  special case (music maps 1:1).
- `lib/actions.ts`:
  - `CreateItemInput` += `imageUrl?: string` and `meta?: Record<string, unknown>`.
  - `createItemAction` persists `imageUrl` and merges `meta` into the stored
    `metadata` JSON alongside `{ type, seed }`.
- `lib/server/serialize.ts`: `mapItem` reads `row.imageUrl` → `item.imageUrl`.

### 4. Cover rendering

`components/poster-card.tsx` (and the Add Item details-step preview): when
`item.imageUrl` is present, render the real image with `object-cover` inside the
existing soft frame (ring + shadow unchanged) and an `onError` fallback to the
current `PlaceholderPoster`. Movie/book keep the 2:3 frame; music uses a square
frame. No change to layout, spacing, or theme.

### 5. Add Item flow — `components/add-item-modal.tsx`

Replace the `MOVIE_CATALOG`/`BOOK_CATALOG` client filter with a debounced fetch
to `/api/search/{kind}` keyed on the active `type` / list template. On pick,
carry the hit's `imageUrl` and `meta` into `save()` (→ `addItem`). The loader,
no-results state, manual "Custom" entry, picked-highlight, and toast all already
exist and are reused unchanged. Copy stays template-driven
("Search for a movie/book/song").

Once nothing imports `lib/mock-data.ts`, delete it.

## Error handling

- Provider errors → `[]` (logged server-side); the existing no-results + manual
  entry path covers the user.
- Stale-request races → `AbortController` per keystroke batch.
- Missing cover → omit `imageUrl`; rendering falls back to `PlaceholderPoster`.

## Testing

- Unit tests per provider normalizer against captured fixture JSON (no live
  network): asserts title/subtitle/imageUrl/meta mapping, including
  null-cover/no-result cases.
- Light route-handler test: unknown `kind` → 400, empty `q` → `[]`.
