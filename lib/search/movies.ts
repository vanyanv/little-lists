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
