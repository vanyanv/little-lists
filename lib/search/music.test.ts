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
