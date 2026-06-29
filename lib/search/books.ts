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
