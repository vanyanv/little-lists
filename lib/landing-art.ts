// Server-side art for the landing page's phone preview: the real posters and
// covers for the sample titles, fetched through the same search providers the
// app uses (TMDB, Open Library / Google Books). Every miss — no API key, rate
// limit, offline build — falls back to the item's bundled first-party art, so
// the preview always renders.

import type { Item, List } from "./types";
import { searchMovies } from "./search/movies";
import { searchBooks } from "./search/books";
import {
  PREVIEW_MOVIES,
  PREVIEW_BOOKS,
  SHOWCASE_MOVIES,
  SHOWCASE_BOOKS,
  DEMO_VIEW_MOVIES,
} from "./landing-data";
import type { SearchHit } from "./search/types";

/** Best real image for a sample item: prefer an exact title + year match. */
function pickImage(hits: SearchHit[], item: Item): string | undefined {
  const wantYear = item.subtitle ? Number(item.subtitle) : undefined;
  const titled = hits.filter(
    (h) => h.imageUrl && h.title.toLowerCase() === item.title.toLowerCase()
  );
  const exact = wantYear ? titled.find((h) => h.year === wantYear) : undefined;
  return (exact ?? titled[0] ?? hits.find((h) => h.imageUrl))?.imageUrl;
}

async function withRealArt(
  list: List,
  search: (q: string) => Promise<SearchHit[]>
): Promise<List> {
  const items = await Promise.all(
    list.items.map(async (item) => {
      try {
        const url = pickImage(await search(item.title), item);
        return url ? { ...item, imageUrl: url } : item;
      } catch {
        return item;
      }
    })
  );
  return { ...list, items };
}

/** The preview lists with live artwork; safe to call during prerender. */
export async function getLandingLists(): Promise<{
  movies: List;
  books: List;
  showcaseMovies: List;
  showcaseBooks: List;
  demoMovies: List;
}> {
  const [movies, books, showcaseMovies, showcaseBooks, demoMovies] = await Promise.all([
    withRealArt(PREVIEW_MOVIES, searchMovies),
    withRealArt(PREVIEW_BOOKS, searchBooks),
    withRealArt(SHOWCASE_MOVIES, searchMovies),
    withRealArt(SHOWCASE_BOOKS, searchBooks),
    withRealArt(DEMO_VIEW_MOVIES, searchMovies),
  ]);
  return { movies, books, showcaseMovies, showcaseBooks, demoMovies };
}
