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
