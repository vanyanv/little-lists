import { describe, it, expect } from "vitest";
import { sortItems, isDuplicateTitle, isSortMode } from "./sort";
import type { Item, StatusId } from "./types";

// minimal item factory — only the fields sortItems reads
function item(p: Partial<Item> & { id: string; title: string }): Item {
  return { type: "custom", ...p } as Item;
}

const STATUS_ORDER: StatusId[] = ["want-to-watch", "watched", "favorite", "not-for-me"];

describe("sortItems", () => {
  it("recent keeps the incoming order", () => {
    const items = [item({ id: "a", title: "B" }), item({ id: "b", title: "A" })];
    expect(sortItems(items, "recent", STATUS_ORDER).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("title sorts case-insensitively A to Z", () => {
    const items = [item({ id: "a", title: "banana" }), item({ id: "b", title: "Apple" })];
    expect(sortItems(items, "title", STATUS_ORDER).map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("rating sorts high to low with unrated last", () => {
    const items = [
      item({ id: "a", title: "a", rating: 2 }),
      item({ id: "b", title: "b" }),
      item({ id: "c", title: "c", rating: 5 }),
    ];
    expect(sortItems(items, "rating", STATUS_ORDER).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("status groups by the template order, unknown/undefined last", () => {
    const items = [
      item({ id: "a", title: "a", status: "favorite" }),
      item({ id: "b", title: "b" }),
      item({ id: "c", title: "c", status: "want-to-watch" }),
    ];
    expect(sortItems(items, "status", STATUS_ORDER).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("custom sorts by position ascending, null positions last", () => {
    const items = [
      item({ id: "a", title: "a", position: 2 }),
      item({ id: "b", title: "b" }),
      item({ id: "c", title: "c", position: 0 }),
    ];
    expect(sortItems(items, "custom", STATUS_ORDER).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("pinned items float to the top in every mode, preserving mode order within groups", () => {
    const items = [
      item({ id: "a", title: "A" }),
      item({ id: "b", title: "B", pinned: true }),
      item({ id: "c", title: "C" }),
      item({ id: "d", title: "D", pinned: true }),
    ];
    // title mode: within pinned -> B,D ; within rest -> A,C
    expect(sortItems(items, "title", STATUS_ORDER).map((i) => i.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const items = [item({ id: "a", title: "B" }), item({ id: "b", title: "A" })];
    const copy = [...items];
    sortItems(items, "title", STATUS_ORDER);
    expect(items).toEqual(copy);
  });
});

describe("isDuplicateTitle", () => {
  const items = [{ title: "Dune" }, { title: "  The Bear " }];
  it("matches case-insensitively and trimmed", () => {
    expect(isDuplicateTitle("dune", items)).toBe(true);
    expect(isDuplicateTitle("the bear", items)).toBe(true);
  });
  it("does not match a different title", () => {
    expect(isDuplicateTitle("Dune Part Two", items)).toBe(false);
  });
  it("is false for an empty/whitespace title or empty list", () => {
    expect(isDuplicateTitle("   ", items)).toBe(false);
    expect(isDuplicateTitle("Dune", [])).toBe(false);
  });
});

describe("isSortMode", () => {
  it("accepts known modes and rejects others", () => {
    expect(isSortMode("custom")).toBe(true);
    expect(isSortMode("nonsense")).toBe(false);
    expect(isSortMode(undefined)).toBe(false);
  });
});
