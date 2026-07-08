import { describe, expect, it } from "vitest";
import type { List } from "./types";
import type { SearchHit } from "./search/types";
import { bestListForKind, pickDetection, scrapAge, titleMatches } from "./scraps";

function hit(title: string, kind: SearchHit["type"] = "movie"): SearchHit {
  return { sourceId: `id-${title}`, type: kind, title, subtitle: "2023", imageUrl: "https://x/y.jpg", meta: { sourceId: `id-${title}` } };
}

function list(kind: List["kind"], id = `l-${kind}`): List {
  return { id, title: `${kind} list`, emoji: "✨", theme: "blush", noun: "things", kind, template: kind === "custom" ? "custom" : kind, pinned: false, items: [] };
}

describe("titleMatches", () => {
  it("matches exact titles ignoring case and punctuation", () => {
    expect(titleMatches("past lives", "Past Lives")).toBe(true);
    expect(titleMatches("Amelie!", "Amélie")).toBe(false); // diacritics differ — that's fine, right-or-absent
    expect(titleMatches("the bear", "The Bear.")).toBe(true);
  });
  it("matches when the scrap is a word-boundary prefix of the hit", () => {
    expect(titleMatches("past lives", "Past Lives (2023)")).toBe(true);
    expect(titleMatches("past", "Pasta Grannies")).toBe(false);
  });
  it("rejects unrelated titles and empty input", () => {
    expect(titleMatches("that ramen place dana said", "Ramen Heads")).toBe(false);
    expect(titleMatches("", "Anything")).toBe(false);
  });
});

describe("pickDetection", () => {
  it("returns the first confident match in provider order", () => {
    const d = pickDetection("past lives", [
      { kind: "movie", hits: [hit("Past Lives")] },
      { kind: "book", hits: [hit("Past Lives: A Novel", "book")] },
    ]);
    expect(d).toMatchObject({ kind: "movie", title: "Past Lives", sourceId: "id-Past Lives" });
  });
  it("only considers the top hit per provider", () => {
    const d = pickDetection("past lives", [
      { kind: "movie", hits: [hit("Unrelated"), hit("Past Lives")] },
    ]);
    expect(d).toEqual({ none: true });
  });
  it("returns none when nothing matches", () => {
    expect(pickDetection("buy socks", [{ kind: "movie", hits: [hit("Sock Puppets")] }])).toEqual({ none: true });
  });
});

describe("bestListForKind", () => {
  it("picks the first list of that kind (store order = pinned, then freshest)", () => {
    const lists = [list("book", "b1"), list("movie", "m1"), list("movie", "m2")];
    expect(bestListForKind(lists, "movie")?.id).toBe("m1");
  });
  it("returns undefined when no list of that kind exists", () => {
    expect(bestListForKind([list("book")], "movie")).toBeUndefined();
  });
});

describe("scrapAge", () => {
  const now = new Date("2026-07-08T12:00:00Z");
  it("labels fresh, minutes, hours, and days", () => {
    expect(scrapAge("2026-07-08T11:59:40Z", now)).toBe("just now");
    expect(scrapAge("2026-07-08T11:45:00Z", now)).toBe("15m ago");
    expect(scrapAge("2026-07-08T09:00:00Z", now)).toBe("3h ago");
    expect(scrapAge("2026-07-07T09:00:00Z", now)).toBe("yesterday");
    expect(scrapAge("2026-07-04T09:00:00Z", now)).toBe("4 days ago");
  });
});
