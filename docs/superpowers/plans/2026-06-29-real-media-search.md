# Real Media Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users search real movies (TMDB), books (Open Library + Google Books fallback), and music (iTunes) from the Add Item sheet and save visual cards with real posters/covers/album art.

**Architecture:** Server-only provider functions normalize each API to one `SearchHit` shape, exposed through a single `GET /api/search/[kind]` Route Handler. The existing Add Item sheet swaps its mock-catalog filter for a debounced fetch to that route and threads the chosen `imageUrl` + metadata through the already-existing `addItem` → `createItemAction` save path. A new "Music" list template mirrors Movie/Book.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), React 19, TypeScript, Prisma 7 + Neon (Postgres), Vitest (new, for provider unit tests), Tailwind v4, motion.

## Global Constraints

- Next.js is **16.2.9** — read `node_modules/next/dist/docs/` before writing framework code; dynamic route `params` is a **`Promise`** (`const { kind } = await params`). (AGENTS.md)
- Do **not** redesign. Preserve the Soft Collectible Scrapbook UI, the Add Item bottom sheet, and the list detail design.
- Do **not** add: recommendations, AI, social feed, friends, comments.
- TMDB credentials already exist in `.env.local`: `TMDB_API_READ_ACCESS_TOKEN` (use as `Authorization: Bearer …`). Keep all API tokens server-side.
- Save toast copy is exactly: `Saved to your little world ✨` (already implemented — do not change).
- Provider normalizers must NOT `import "server-only"` (keeps them unit-testable). The dispatch barrel (`lib/search/index.ts`) and the route handler carry server-only-ness.
- Each provider catches its own fetch/parse errors and returns `[]` (never throws to the route).
- Item types live in the `ListItem.metadata` JSON, not a DB column — adding the `music` *item type* needs **no** migration. Adding the `music` *list template* needs an enum migration.

---

### Task 1: Vitest setup + search types + movie (TMDB) provider

**Files:**
- Create: `vitest.config.ts`
- Create: `test/server-only-stub.ts`
- Create: `lib/search/types.ts`
- Create: `lib/search/movies.ts`
- Create: `lib/search/movies.test.ts`
- Modify: `package.json` (add `vitest` devDependency + `test` script)

**Interfaces:**
- Produces: `interface SearchHit` (in `lib/search/types.ts`); `normalizeMovies(json: unknown): SearchHit[]`; `searchMovies(q: string): Promise<SearchHit[]>` (both in `lib/search/movies.ts`).

- [ ] **Step 1: Add Vitest + test script**

```bash
cd ~/little-lists
npm install -D vitest
```

Then in `package.json`, add to `"scripts"` (keep existing scripts):

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 2: Create the empty server-only stub** (so route tests can import server-only modules)

`test/server-only-stub.ts`:

```ts
// Test stub: real "server-only" throws when imported outside RSC; tests don't need that guard.
export {};
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": resolve(__dirname, "test/server-only-stub.ts"),
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create the shared `SearchHit` type**

`lib/search/types.ts`:

```ts
/** One normalized search result across every provider (movie/book/music). */
export interface SearchHit {
  /** provider-native id: tmdbId | Open Library work key | iTunes track/collection id */
  sourceId: string;
  type: "movie" | "book" | "music";
  title: string;
  /** year (movie/music) or author (book) — the small line under the title */
  subtitle: string;
  /** absolute poster/cover/artwork URL; omitted when the provider has none */
  imageUrl?: string;
  year?: number;
  /** movie overview or book description */
  overview?: string;
  /** extra fields persisted into ListItem.metadata: posterPath, isbn, author, kind, sourceId, … */
  meta: Record<string, unknown>;
}
```

- [ ] **Step 5: Write the failing test for `normalizeMovies`**

`lib/search/movies.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeMovies } from "./movies";

const TMDB_FIXTURE = {
  page: 1,
  results: [
    {
      id: 12345,
      title: "Past Lives",
      release_date: "2023-06-23",
      overview: "Two childhood friends reunite decades later.",
      poster_path: "/k7eYdW2fa0kJ1234.jpg",
    },
    {
      id: 678,
      title: "No Poster Movie",
      release_date: "",
      overview: "",
      poster_path: null,
    },
  ],
  total_results: 2,
};

describe("normalizeMovies", () => {
  it("maps a TMDB result to a SearchHit with an absolute poster URL", () => {
    const [hit] = normalizeMovies(TMDB_FIXTURE);
    expect(hit).toEqual({
      sourceId: "12345",
      type: "movie",
      title: "Past Lives",
      subtitle: "2023",
      imageUrl: "https://image.tmdb.org/t/p/w342/k7eYdW2fa0kJ1234.jpg",
      year: 2023,
      overview: "Two childhood friends reunite decades later.",
      meta: {
        tmdbId: 12345,
        year: 2023,
        overview: "Two childhood friends reunite decades later.",
        posterPath: "/k7eYdW2fa0kJ1234.jpg",
      },
    });
  });

  it("omits imageUrl and year when TMDB has no poster/date", () => {
    const hit = normalizeMovies(TMDB_FIXTURE)[1];
    expect(hit.imageUrl).toBeUndefined();
    expect(hit.year).toBeUndefined();
    expect(hit.subtitle).toBe("");
  });

  it("returns [] for a malformed payload", () => {
    expect(normalizeMovies({})).toEqual([]);
    expect(normalizeMovies(null)).toEqual([]);
  });
});
```

- [ ] **Step 6: Run the test, verify it fails**

Run: `npx vitest run lib/search/movies.test.ts`
Expected: FAIL — `normalizeMovies` is not exported / file missing.

- [ ] **Step 7: Implement `lib/search/movies.ts`**

```ts
import type { SearchHit } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3/search/movie";
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string | null;
  overview?: string | null;
  poster_path?: string | null;
}

function yearOf(date?: string | null): number | undefined {
  const y = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isFinite(y) && y > 0 ? y : undefined;
}

export function normalizeMovies(json: unknown): SearchHit[] {
  const results = (json as { results?: TmdbMovie[] } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results.map((m) => {
    const year = yearOf(m.release_date);
    const overview = m.overview || undefined;
    return {
      sourceId: String(m.id),
      type: "movie" as const,
      title: m.title,
      subtitle: year ? String(year) : "",
      imageUrl: m.poster_path ? `${POSTER_BASE}${m.poster_path}` : undefined,
      year,
      overview,
      meta: {
        tmdbId: m.id,
        year,
        overview,
        posterPath: m.poster_path ?? undefined,
      },
    };
  });
}

export async function searchMovies(q: string): Promise<SearchHit[]> {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) return [];
  try {
    const url = `${TMDB_BASE}?query=${encodeURIComponent(q)}&include_adult=false`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) return [];
    return normalizeMovies(await res.json());
  } catch {
    return [];
  }
}
```

- [ ] **Step 8: Run the test, verify it passes**

Run: `npx vitest run lib/search/movies.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts test/server-only-stub.ts lib/search/types.ts lib/search/movies.ts lib/search/movies.test.ts package.json package-lock.json
git commit -m "feat(search): add Vitest, SearchHit type, and TMDB movie provider"
```

---

### Task 2: Book provider (Open Library + Google Books fallback)

**Files:**
- Create: `lib/search/books.ts`
- Create: `lib/search/books.test.ts`

**Interfaces:**
- Consumes: `SearchHit` from `lib/search/types.ts`.
- Produces: `normalizeOpenLibrary(json: unknown): SearchHit[]`; `normalizeGoogleBooks(json: unknown): SearchHit[]`; `searchBooks(q: string): Promise<SearchHit[]>` (Open Library first, Google Books when Open Library yields nothing usable).

- [ ] **Step 1: Write the failing tests**

`lib/search/books.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeOpenLibrary, normalizeGoogleBooks } from "./books";

const OL_FIXTURE = {
  numFound: 2,
  docs: [
    {
      key: "/works/OL123W",
      title: "Normal People",
      author_name: ["Sally Rooney"],
      first_publish_year: 2018,
      cover_i: 8902837,
      isbn: ["9781984822178", "0571334652"],
    },
    {
      key: "/works/OL999W",
      title: "Coverless Book",
      author_name: ["Anon"],
    },
  ],
};

const GBOOKS_FIXTURE = {
  items: [
    {
      id: "abc123",
      volumeInfo: {
        title: "Normal People",
        authors: ["Sally Rooney"],
        publishedDate: "2018-08-28",
        description: "Connell and Marianne grow up in the same town.",
        imageLinks: { thumbnail: "http://books.google.com/books/content?id=abc123&zoom=1" },
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9781984822178" }],
      },
    },
  ],
};

describe("normalizeOpenLibrary", () => {
  it("maps an Open Library doc with author, year, and cover", () => {
    const [hit] = normalizeOpenLibrary(OL_FIXTURE);
    expect(hit).toEqual({
      sourceId: "/works/OL123W",
      type: "book",
      title: "Normal People",
      subtitle: "Sally Rooney",
      imageUrl: "https://covers.openlibrary.org/b/id/8902837-M.jpg",
      year: 2018,
      overview: undefined,
      meta: {
        author: "Sally Rooney",
        year: 2018,
        isbn: "9781984822178",
        sourceId: "/works/OL123W",
      },
    });
  });

  it("omits imageUrl when the doc has no cover_i", () => {
    expect(normalizeOpenLibrary(OL_FIXTURE)[1].imageUrl).toBeUndefined();
  });

  it("returns [] for a malformed payload", () => {
    expect(normalizeOpenLibrary(null)).toEqual([]);
  });
});

describe("normalizeGoogleBooks", () => {
  it("maps a Google Books volume with https cover and description", () => {
    const [hit] = normalizeGoogleBooks(GBOOKS_FIXTURE);
    expect(hit.imageUrl).toBe("https://books.google.com/books/content?id=abc123&zoom=1");
    expect(hit.subtitle).toBe("Sally Rooney");
    expect(hit.year).toBe(2018);
    expect(hit.overview).toBe("Connell and Marianne grow up in the same town.");
    expect(hit.meta).toMatchObject({
      author: "Sally Rooney",
      year: 2018,
      isbn: "9781984822178",
      sourceId: "abc123",
      description: "Connell and Marianne grow up in the same town.",
    });
  });

  it("returns [] for a malformed payload", () => {
    expect(normalizeGoogleBooks({})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run lib/search/books.test.ts`
Expected: FAIL — module not found / functions not exported.

- [ ] **Step 3: Implement `lib/search/books.ts`**

```ts
import type { SearchHit } from "./types";

const OL_BASE = "https://openlibrary.org/search.json";
const OL_COVER = "https://covers.openlibrary.org/b/id";
const GBOOKS_BASE = "https://www.googleapis.com/books/v1/volumes";

interface OlDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
}

export function normalizeOpenLibrary(json: unknown): SearchHit[] {
  const docs = (json as { docs?: OlDoc[] } | null)?.docs;
  if (!Array.isArray(docs)) return [];
  return docs.map((d) => {
    const author = d.author_name?.[0];
    const year = typeof d.first_publish_year === "number" ? d.first_publish_year : undefined;
    const isbn = d.isbn?.[0];
    return {
      sourceId: d.key,
      type: "book" as const,
      title: d.title,
      subtitle: author ?? "",
      imageUrl: d.cover_i ? `${OL_COVER}/${d.cover_i}-M.jpg` : undefined,
      year,
      overview: undefined,
      meta: { author, year, isbn, sourceId: d.key },
    };
  });
}

interface GVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

export function normalizeGoogleBooks(json: unknown): SearchHit[] {
  const items = (json as { items?: GVolume[] } | null)?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((v) => v.volumeInfo?.title)
    .map((v) => {
      const info = v.volumeInfo!;
      const author = info.authors?.[0];
      const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) || undefined : undefined;
      const raw = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
      const imageUrl = raw ? raw.replace(/^http:\/\//, "https://") : undefined;
      const isbn = info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier
        ?? info.industryIdentifiers?.[0]?.identifier;
      const description = info.description || undefined;
      return {
        sourceId: v.id,
        type: "book" as const,
        title: info.title!,
        subtitle: author ?? "",
        imageUrl,
        year,
        overview: description,
        meta: { author, year, isbn, description, sourceId: v.id },
      };
    });
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function searchBooks(q: string): Promise<SearchHit[]> {
  const olUrl = `${OL_BASE}?title=${encodeURIComponent(q)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i,isbn`;
  const ol = normalizeOpenLibrary(await fetchJson(olUrl));
  // Fall back to Google Books when Open Library finds nothing, or nothing with a cover.
  if (ol.length > 0 && ol.some((h) => h.imageUrl)) return ol;
  const gUrl = `${GBOOKS_BASE}?q=${encodeURIComponent(q)}&maxResults=12&printType=books`;
  const google = normalizeGoogleBooks(await fetchJson(gUrl));
  return google.length > 0 ? google : ol;
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run lib/search/books.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/search/books.ts lib/search/books.test.ts
git commit -m "feat(search): add Open Library + Google Books fallback provider"
```

---

### Task 3: Music provider (iTunes)

**Files:**
- Create: `lib/search/music.ts`
- Create: `lib/search/music.test.ts`

**Interfaces:**
- Consumes: `SearchHit`.
- Produces: `normalizeItunes(json: unknown): SearchHit[]`; `searchMusic(q: string): Promise<SearchHit[]>`. Albums map to `meta.kind === "album"`, songs to `meta.kind === "song"`; both carry album artwork.

- [ ] **Step 1: Write the failing tests**

`lib/search/music.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeItunes } from "./music";

const ITUNES_FIXTURE = {
  resultCount: 3,
  results: [
    {
      wrapperType: "collection",
      collectionType: "Album",
      collectionId: 111,
      collectionName: "folklore",
      artistName: "Taylor Swift",
      releaseDate: "2020-07-24T07:00:00Z",
      artworkUrl100: "https://is1.mzstatic.com/image/thumb/abc/100x100bb.jpg",
    },
    {
      wrapperType: "track",
      kind: "song",
      trackId: 222,
      trackName: "cardigan",
      collectionName: "folklore",
      artistName: "Taylor Swift",
      releaseDate: "2020-07-24T07:00:00Z",
      artworkUrl100: "https://is1.mzstatic.com/image/thumb/abc/100x100bb.jpg",
    },
    { wrapperType: "artist", artistName: "Taylor Swift" },
  ],
};

describe("normalizeItunes", () => {
  it("maps an album to a SearchHit with upscaled artwork", () => {
    const [hit] = normalizeItunes(ITUNES_FIXTURE);
    expect(hit).toEqual({
      sourceId: "111",
      type: "music",
      title: "folklore",
      subtitle: "Taylor Swift",
      imageUrl: "https://is1.mzstatic.com/image/thumb/abc/600x600bb.jpg",
      year: 2020,
      overview: undefined,
      meta: { artist: "Taylor Swift", year: 2020, kind: "album", sourceId: "111" },
    });
  });

  it("maps a track to a song hit using the track name", () => {
    const song = normalizeItunes(ITUNES_FIXTURE)[1];
    expect(song.title).toBe("cardigan");
    expect(song.sourceId).toBe("222");
    expect(song.meta.kind).toBe("song");
  });

  it("drops non album/track rows (e.g. artist)", () => {
    expect(normalizeItunes(ITUNES_FIXTURE)).toHaveLength(2);
  });

  it("returns [] for a malformed payload", () => {
    expect(normalizeItunes(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run lib/search/music.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/search/music.ts`**

```ts
import type { SearchHit } from "./types";

const ITUNES_BASE = "https://itunes.apple.com/search";

interface ItunesRow {
  wrapperType?: string;
  collectionType?: string;
  kind?: string;
  collectionId?: number;
  trackId?: number;
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  artworkUrl100?: string;
}

function isSong(r: ItunesRow): boolean {
  return r.wrapperType === "track" || r.kind === "song";
}
function isAlbum(r: ItunesRow): boolean {
  return r.wrapperType === "collection" || r.collectionType === "Album";
}

export function normalizeItunes(json: unknown): SearchHit[] {
  const results = (json as { results?: ItunesRow[] } | null)?.results;
  if (!Array.isArray(results)) return [];
  const hits: SearchHit[] = [];
  for (const r of results) {
    const song = isSong(r);
    if (!song && !isAlbum(r)) continue;
    const id = song ? r.trackId : r.collectionId;
    const title = song ? r.trackName : r.collectionName;
    if (id == null || !title) continue;
    const year = r.releaseDate ? Number(r.releaseDate.slice(0, 4)) || undefined : undefined;
    const imageUrl = r.artworkUrl100?.replace("100x100bb", "600x600bb");
    hits.push({
      sourceId: String(id),
      type: "music",
      title,
      subtitle: r.artistName ?? "",
      imageUrl,
      year,
      overview: undefined,
      meta: { artist: r.artistName, year, kind: song ? "song" : "album", sourceId: String(id) },
    });
  }
  return hits;
}

export async function searchMusic(q: string): Promise<SearchHit[]> {
  try {
    const url = `${ITUNES_BASE}?media=music&entity=album,musicTrack&limit=12&term=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return normalizeItunes(await res.json());
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run lib/search/music.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/search/music.ts lib/search/music.test.ts
git commit -m "feat(search): add iTunes music provider (albums + songs)"
```

---

### Task 4: Dispatch barrel + `/api/search/[kind]` Route Handler

**Files:**
- Create: `lib/search/index.ts`
- Create: `app/api/search/[kind]/route.ts`
- Create: `app/api/search/[kind]/route.test.ts`

**Interfaces:**
- Consumes: `searchMovies`, `searchBooks`, `searchMusic`, `SearchHit`.
- Produces: `searchByKind(kind: string, q: string): Promise<SearchHit[] | null>` (null = unknown kind) from `lib/search/index.ts`; the `GET` route handler returning `SearchHit[]` JSON.

- [ ] **Step 1: Write the failing route tests**

`app/api/search/[kind]/route.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { GET } from "./route";

function call(kind: string, q: string) {
  return GET(new Request(`http://t/api/search/${kind}?q=${encodeURIComponent(q)}`), {
    params: Promise.resolve({ kind }),
  });
}

describe("GET /api/search/[kind]", () => {
  it("returns 400 for an unknown kind", async () => {
    const res = await call("widgets", "hello");
    expect(res.status).toBe(400);
  });

  it("returns 200 and [] for an empty query without hitting a provider", async () => {
    const res = await call("movie", "   ");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run "app/api/search/[kind]/route.test.ts"`
Expected: FAIL — `./route` has no export `GET`.

- [ ] **Step 3: Implement the dispatch barrel `lib/search/index.ts`**

```ts
import "server-only";
import type { SearchHit } from "./types";
import { searchMovies } from "./movies";
import { searchBooks } from "./books";
import { searchMusic } from "./music";

export type SearchKind = "movie" | "book" | "music";

const PROVIDERS: Record<SearchKind, (q: string) => Promise<SearchHit[]>> = {
  movie: searchMovies,
  book: searchBooks,
  music: searchMusic,
};

export function isSearchKind(kind: string): kind is SearchKind {
  return kind === "movie" || kind === "book" || kind === "music";
}

/** Returns hits for a kind, or null when the kind is unknown. */
export async function searchByKind(kind: string, q: string): Promise<SearchHit[] | null> {
  if (!isSearchKind(kind)) return null;
  const term = q.trim();
  if (!term) return [];
  return PROVIDERS[kind](term);
}

export type { SearchHit } from "./types";
```

- [ ] **Step 4: Implement the Route Handler `app/api/search/[kind]/route.ts`**

```ts
import { searchByKind } from "@/lib/search";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = await searchByKind(kind, q);
  if (hits === null) {
    return Response.json({ error: "unknown search kind" }, { status: 400 });
  }
  return Response.json(hits);
}
```

- [ ] **Step 5: Run the route tests, verify they pass**

Run: `npx vitest run "app/api/search/[kind]/route.test.ts"`
Expected: PASS (2 tests). (The empty-query test must NOT make a network call — `searchByKind` short-circuits before the provider.)

- [ ] **Step 6: Run the full suite + type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all provider + route tests PASS; tsc reports no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/search/index.ts "app/api/search/[kind]/route.ts" "app/api/search/[kind]/route.test.ts"
git commit -m "feat(search): add dispatch barrel and /api/search/[kind] route handler"
```

---

### Task 5: Music list template, music item type, and `imageUrl` field

**Files:**
- Modify: `lib/types.ts` (ItemType, Item, StatusId, STATUS_META, STATUSES_FOR, ITEM_TYPE_META, ListTemplate, TEMPLATE_META)
- Modify: `components/create-list-sheet.tsx:20` (`TEMPLATE_ORDER`)
- Modify: `prisma/schema.prisma:9-18` (`enum TemplateType`)
- Create: migration via `prisma migrate dev`

**Interfaces:**
- Consumes: existing `StickerName`, `ThemeColor`.
- Produces: `ItemType` now includes `"music"`; `Item.imageUrl?: string`; `ListTemplate` includes `"music"`; `TEMPLATE_META.music`; statuses `want-to-listen | listened | on-repeat`. Music `aspect` is `"square"`.

- [ ] **Step 1: Extend `ItemType`, `Item`, and statuses in `lib/types.ts`**

Change the `ItemType` union (line ~22):

```ts
export type ItemType = "movie" | "book" | "music" | "food" | "place" | "custom";
```

Add the three music statuses to the `StatusId` union (after the `dnf` line, before `love`):

```ts
  // music
  | "want-to-listen"
  | "listened"
  | "on-repeat"
```

Add their `STATUS_META` entries (alongside the others):

```ts
  "want-to-listen": { label: "Want to listen", tone: "neutral" },
  listened: { label: "Listened", tone: "good" },
  "on-repeat": { label: "On repeat", tone: "love" },
```

Add a `music` row to `STATUSES_FOR`:

```ts
  music: ["want-to-listen", "listened", "on-repeat", "favorite", "not-for-me"],
```

Add `imageUrl` to the `Item` interface (after `subtitle`):

```ts
  /** real poster/cover/album-art URL from search; falls back to the designed placeholder when absent */
  imageUrl?: string;
```

Add a `music` row to `ITEM_TYPE_META`:

```ts
  music: { label: "Music", emoji: "🎧", searchable: true, aspect: "square" },
```

Widen the `ITEM_TYPE_META` aspect type so `"square"` is allowed:

```ts
  { label: string; emoji: string; searchable: boolean; aspect: "poster" | "cover" | "square" | "note" }
```

- [ ] **Step 2: Add the `music` list template**

In `ListTemplate` union (line ~28) add `"music"`:

```ts
  | "music"
```

Add a `TEMPLATE_META.music` entry (mirror the `movie` shape):

```ts
  music: {
    label: "Music list",
    emoji: "🎧",
    theme: "lavender",
    kind: "music",
    defaultView: "grid",
    statuses: ["want-to-listen", "listened", "on-repeat", "favorite", "not-for-me"],
    noun: "tunes on repeat",
    sticker: "sparkle",
    searchable: true,
    statusHeading: "how's it sound?",
    addHeading: () => "Add a song or album to this little list.",
  },
```

- [ ] **Step 3: Add `music` to the create-list template rail**

In `components/create-list-sheet.tsx`, add `"music"` to the `TEMPLATE_ORDER` array (place it right after `"book"`):

```ts
const TEMPLATE_ORDER: ListTemplate[] = [
  // …existing entries, with "music" inserted after "book"…
];
```

- [ ] **Step 4: Add `music` to the Prisma enum**

In `prisma/schema.prisma`, `enum TemplateType` — add `music` (after `book`):

```prisma
enum TemplateType {
  movie
  book
  music
  food
  place
  gift
  date
  people_notes
  custom
}
```

- [ ] **Step 5: Generate the migration**

Run: `npx prisma migrate dev --name add_music_template`
Expected: creates `prisma/migrations/<ts>_add_music_template/migration.sql` containing `ALTER TYPE "TemplateType" ADD VALUE 'music';`, applies cleanly to Neon, and regenerates the client.
If it errors that the enum value can't be added in a transaction, open the generated `migration.sql`, confirm it's the single `ALTER TYPE … ADD VALUE` statement, and re-run `npx prisma migrate dev`.

- [ ] **Step 6: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors. (Confirms every `Record<ItemType, …>` / `Record<ListTemplate, …>` table — `STATUSES_FOR`, `ITEM_TYPE_META`, `TEMPLATE_META` — got its new `music` key, and every `Record<StatusId, …>` got the three new statuses.)

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts components/create-list-sheet.tsx prisma/schema.prisma prisma/migrations
git commit -m "feat(lists): add Music list template, music item type, and Item.imageUrl"
```

---

### Task 6: Persist `imageUrl` + rich metadata through the save path

**Files:**
- Modify: `lib/actions.ts:57-66` (`CreateItemInput`), `lib/actions.ts:68-98` (`createItemAction`)
- Modify: `lib/server/serialize.ts:43-57` (`mapItem`)

**Interfaces:**
- Consumes: existing `CreateItemInput` shape, `mapItem`.
- Produces: `CreateItemInput` gains `imageUrl?: string` and `meta?: Record<string, unknown>`; `createItemAction` persists `imageUrl` and merges `meta` into `ListItem.metadata`; `mapItem` returns `imageUrl` on the UI `Item`.

- [ ] **Step 1: Extend `CreateItemInput`**

In `lib/actions.ts`, add to the `CreateItemInput` interface:

```ts
  imageUrl?: string;
  /** extra provider fields persisted into metadata JSON (year, overview, author, isbn, sourceId, …) */
  meta?: Record<string, unknown>;
```

- [ ] **Step 2: Persist `imageUrl` and merge `meta` in `createItemAction`**

Replace the `metadata` construction and the `prisma.listItem.create` data block:

```ts
  const metadata = {
    type: input.type,
    ...(input.seed ? { seed: input.seed } : {}),
    ...(input.meta ?? {}),
  } satisfies Prisma.InputJsonObject;

  const row = await prisma.listItem.create({
    data: {
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
    },
  });
```

- [ ] **Step 3: Read `imageUrl` in `mapItem`**

In `lib/server/serialize.ts`, add to the object returned by `mapItem` (after `subtitle`):

```ts
    imageUrl: row.imageUrl ?? undefined,
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`Prisma.InputJsonObject` accepts the spread; `imageUrl` exists on the `ListItem` model.)

- [ ] **Step 5: Commit**

```bash
git add lib/actions.ts lib/server/serialize.ts
git commit -m "feat(items): persist imageUrl and provider metadata on item create"
```

---

### Task 7: Real-cover rendering component

**Files:**
- Create: `components/cover.tsx`
- Modify: `components/poster-card.tsx` (use `Cover`)
- Modify: `components/add-item-modal.tsx` (details-step preview, ~line 363-372, use `Cover`)

**Interfaces:**
- Consumes: `Item` (now with `imageUrl`), `ITEM_TYPE_META`, `PlaceholderPoster`.
- Produces: `<Cover item={item} badge? rounded? className? />` — renders the real `imageUrl` (`object-cover`, aspect from item type) and falls back to `PlaceholderPoster` when there's no URL or the image errors.

- [ ] **Step 1: Create `components/cover.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Item } from "@/lib/types";
import { ITEM_TYPE_META } from "@/lib/types";
import { PlaceholderPoster } from "./placeholder-poster";

const ASPECT_CLASS: Record<"poster" | "square", string> = {
  poster: "aspect-[2/3]",
  square: "aspect-square",
};

/** A real poster/cover/album-art image, falling back to the designed placeholder. */
export function Cover({
  item,
  badge,
  rounded = "rounded-xl",
  className = "",
}: {
  item: Item;
  badge?: string;
  rounded?: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const seed = item.seed || item.title;
  const shape = ITEM_TYPE_META[item.type].aspect === "square" ? "square" : "poster";

  if (!item.imageUrl || errored) {
    return (
      <PlaceholderPoster
        seed={seed}
        title={item.title}
        badge={badge}
        aspect={shape}
        rounded={rounded}
        className={className}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${ASPECT_CLASS[shape]} ${rounded} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt={item.title}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
      <span className={`pointer-events-none absolute inset-0 ${rounded} ring-1 ring-inset ring-black/10`} />
      {badge && (
        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-paper/85 text-[0.95rem] shadow-soft backdrop-blur-[1px]">
          {badge}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Use `Cover` in `components/poster-card.tsx`**

Replace the `PlaceholderPoster` import + usage. New file body:

```tsx
import type { Item } from "@/lib/types";
import { Cover } from "./cover";
import { StatusPill } from "./status-pill";

/** Letterboxd-style poster/cover summary for movies, books, and music. */
export function PosterCard({ item }: { item: Item }) {
  return (
    <div className="text-left">
      <Cover
        item={item}
        badge={item.status === "favorite" ? "💗" : undefined}
        className="shadow-soft ring-1 ring-black/5"
      />
      <div className="mt-2.5 px-0.5">
        <div className="flex items-start gap-1">
          <h3 className="line-clamp-2 flex-1 font-display text-[0.98rem] font-semibold leading-tight text-ink">
            {item.title}
          </h3>
          {item.note && <span className="mt-0.5 text-[0.8rem] opacity-60" aria-label="has a note">📝</span>}
        </div>
        {item.subtitle && (
          <p className="mt-0.5 text-[0.8rem] font-medium text-brown">{item.subtitle}</p>
        )}
        {item.status && (
          <div className="mt-1.5">
            <StatusPill status={item.status} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Use `Cover` in the Add Item details preview**

In `components/add-item-modal.tsx`, add `import { Cover } from "./cover";` near the other component imports. In `DetailsStep`, replace the `isPoster` poster block (the `<PlaceholderPoster seed={seed} … />` inside the `w-20` wrapper) with `Cover`, building a minimal item for preview:

```tsx
        {isPoster ? (
          <div className="w-20 shrink-0">
            <Cover
              item={{ id: "preview", type, title, subtitle, seed, imageUrl }}
              className="shadow-soft ring-1 ring-black/5"
            />
          </div>
        ) : (
```

(`imageUrl` is threaded into `DetailsStep` in Task 8; until then the preview falls back to the placeholder, which is correct.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: at this point `imageUrl` is not yet a prop of `DetailsStep`, so this WILL error on the preview block. That's expected — Task 8 adds the prop. To keep this task independently green, temporarily pass `imageUrl={undefined}` literally:

```tsx
            item={{ id: "preview", type, title, subtitle, seed, imageUrl: undefined }}
```

Re-run `npx tsc --noEmit` → no errors. (Task 8 swaps `undefined` for the real `imageUrl` state.)

- [ ] **Step 5: Build to confirm the image element passes lint**

Run: `npm run build`
Expected: build succeeds (the `no-img-element` rule is disabled inline).

- [ ] **Step 6: Commit**

```bash
git add components/cover.tsx components/poster-card.tsx components/add-item-modal.tsx
git commit -m "feat(ui): render real covers with placeholder fallback"
```

---

### Task 8: Wire the Add Item sheet to real search

**Files:**
- Modify: `components/add-item-modal.tsx` (search effect/results, pick handler, save, DetailsStep preview)
- Delete: `lib/mock-data.ts`

**Interfaces:**
- Consumes: `GET /api/search/[kind]` returning `SearchHit[]`; `Cover`; `addItem` (now accepts `imageUrl` + `meta`).
- Produces: live debounced search wired to the real route; chosen `imageUrl` + `meta` saved through `addItem`.

- [ ] **Step 1: Replace mock-catalog state with fetched results**

In `AddItemFlow`, remove the `MOVIE_CATALOG`/`BOOK_CATALOG` import and the `catalog`/`results` `useMemo`. Add a `SearchHit` result state and a kind derived from the item type, plus per-hit selection by `sourceId`:

```tsx
import type { SearchHit } from "@/lib/search/types";
// …
  const [results, setResults] = useState<SearchHit[]>([]);
  const searchKind = type === "movie" || type === "book" || type === "music" ? type : null;
  // carry the picked hit's cover + metadata into save()
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [pickedMeta, setPickedMeta] = useState<Record<string, unknown> | undefined>(undefined);
```

Note: `searchable` already comes from `ITEM_TYPE_META[type].searchable`; with Task 5, `music` is searchable.

- [ ] **Step 2: Replace the fake search effect with a debounced fetch**

Replace the existing `useEffect` that fakes searching (the `setTimeout(() => setSearching(false), 520)` block) with:

```tsx
  useEffect(() => {
    if (!searchKind) return;
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/${searchKind}?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        const hits: SearchHit[] = res.ok ? await res.json() : [];
        setResults(hits);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query, searchKind]);
```

- [ ] **Step 3: Update the results list to use `SearchHit` + real covers**

In the results `.map`, key/select by `r.sourceId`, show the cover via `Cover`, and use `r.subtitle`. Replace the inner `<PlaceholderPoster …>` thumbnail with:

```tsx
                          <div className="w-11 shrink-0">
                            <Cover
                              item={{ id: r.sourceId, type, title: r.title, subtitle: r.subtitle, seed: r.title, imageUrl: r.imageUrl }}
                              rounded="rounded-md"
                              className="ring-1 ring-black/5"
                            />
                          </div>
```

Change `picked === r.seed` → `picked === r.sourceId` and the `key={r.seed}` → `key={r.sourceId}`.

- [ ] **Step 4: Update `pickResult` to capture cover + metadata**

```tsx
  const pickResult = (r: SearchHit) => {
    setPicked(r.sourceId);
    setTitle(r.title);
    setSubtitle(r.subtitle);
    setSeed(r.title);
    setImageUrl(r.imageUrl);
    setPickedMeta(r.meta);
    setStatus(statuses[0]);
    setTimeout(() => setStep("details"), 260);
  };
```

For manual entry (`continueManual`), clear the carried cover/meta so a typed item saves as a placeholder:

```tsx
  const continueManual = () => {
    if (!title.trim()) return;
    setSeed(title);
    setImageUrl(undefined);
    setPickedMeta(undefined);
    setStatus(statuses[0]);
    setStep("details");
  };
```

- [ ] **Step 5: Pass cover + meta into `addItem` in `save()`**

In the `addItem(listId, { … })` call, add:

```tsx
        imageUrl,
        meta: pickedMeta,
```

- [ ] **Step 6: Thread `imageUrl` into `DetailsStep` and use the real value**

Add `imageUrl?: string;` to the `DetailsStep` props type, pass `imageUrl={imageUrl}` where `<DetailsStep … />` is rendered, destructure it, and in the preview block from Task 7 replace `imageUrl: undefined` with `imageUrl`:

```tsx
            item={{ id: "preview", type, title, subtitle, seed, imageUrl }}
```

- [ ] **Step 7: Delete the mock catalog**

```bash
git rm lib/mock-data.ts
```

Run: `grep -rn "mock-data\|MOVIE_CATALOG\|BOOK_CATALOG" --include=*.ts --include=*.tsx .`
Expected: no matches (no remaining importers).

- [ ] **Step 8: Type-check, test, and build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: no type errors, all unit tests PASS, build succeeds.

- [ ] **Step 9: Manual smoke test**

Run: `npm run dev`, sign in, then:
- Create a **Movie** list → Add → type "past lives" → real TMDB posters appear; pick one → details preview shows the real poster → Save → toast "Saved to your little world ✨" → card shows the real poster.
- Repeat in a **Book** list (e.g. "normal people") and a new **Music** list (e.g. "folklore") — album art appears.
- Type gibberish → no-results copy → confirm manual "Custom" path still saves with a placeholder cover.

- [ ] **Step 10: Commit**

```bash
git add components/add-item-modal.tsx
git rm lib/mock-data.ts
git commit -m "feat(add-item): wire sheet to real movie/book/music search"
```

---

## Self-Review

**Spec coverage:**
- Movie search via TMDB (title/year/poster/overview/tmdbId) → Task 1 + persisted meta Task 6. ✓
- Book search via Open Library + Google Books fallback (title/author/year/cover/description/isbn/sourceId) → Task 2 + Task 6. ✓
- Music (albums + songs, iTunes, cover art) → Task 3; Music list template → Task 5. ✓
- Save to `ListItem`, poster in `imageUrl`, metadata JSON → Task 6. ✓
- "Search for a movie/book/song" copy → driven by existing `tmeta`/`meta`; music `addHeading` in Task 5; sheet copy unchanged. ✓
- Loading / no-results / manual entry / highlight / cozy thumbnail cards / save toast → already exist, reused in Task 8 (no-results + manual entry are existing branches). ✓
- Selecting a result highlights it → existing `picked` mechanic, re-keyed to `sourceId` in Task 8. ✓
- Preserve UI / no redesign → only data wiring + one `Cover` component matching existing frame. ✓
- Out-of-scope items (recs/AI/social/friends/comments) → none added. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `SearchHit` shape identical across Tasks 1–4 and consumed unchanged in Tasks 7–8. `searchByKind` returns `SearchHit[] | null` (null = unknown kind), matched by the route's 400 branch. `ITEM_TYPE_META.aspect` widened to include `"square"` (Task 5) before `Cover` reads it (Task 7). `imageUrl`/`meta` added to `CreateItemInput` (Task 6) before the sheet passes them (Task 8). `Item.imageUrl` added (Task 5) before `Cover`/`mapItem` use it (Tasks 6–7). ✓

**Note on intermediate type-checks:** Task 7 Step 4 deliberately uses `imageUrl: undefined` to stay independently green; Task 8 Step 6 swaps in the real state. This is called out in both tasks.
