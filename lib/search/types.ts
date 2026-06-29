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
