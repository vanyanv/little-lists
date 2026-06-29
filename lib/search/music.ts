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
