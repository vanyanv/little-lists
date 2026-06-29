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
