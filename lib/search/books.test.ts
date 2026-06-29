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
