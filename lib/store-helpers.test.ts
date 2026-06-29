import { describe, it, expect } from "vitest";
import {
  moveDetailBetweenSections,
  filterItemsByStatus,
  deriveListMeta,
} from "./store-helpers";
import type { Person, Item } from "./types";

function people(): Person[] {
  return [
    {
      id: "p1",
      name: "Mae",
      emoji: "🌷",
      theme: "blush",
      note: "",
      sections: [
        { id: "likes", label: "Likes", emoji: "💛", kind: "chips", entries: [
          { id: "d1", title: "matcha", tags: [] },
          { id: "d2", title: "long walks", tags: [] },
        ] },
        { id: "dislikes", label: "Dislikes", emoji: "🙅", kind: "chips", entries: [] },
        { id: "notes", label: "Notes", emoji: "📝", kind: "notes", entries: [] },
      ],
    },
  ];
}

describe("moveDetailBetweenSections", () => {
  it("moves an entry to another section and applies the patch", () => {
    const out = moveDetailBetweenSections(people(), "p1", "likes", "dislikes", "d1", { title: "cilantro" });
    const p = out[0];
    expect(p.sections.find((s) => s.id === "likes")!.entries.map((e) => e.id)).toEqual(["d2"]);
    const moved = p.sections.find((s) => s.id === "dislikes")!.entries;
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({ id: "d1", title: "cilantro" });
  });

  it("edits in place when from and to are the same section", () => {
    const out = moveDetailBetweenSections(people(), "p1", "likes", "likes", "d1", { title: "iced matcha" });
    const likes = out[0].sections.find((s) => s.id === "likes")!.entries;
    expect(likes.map((e) => e.id)).toEqual(["d1", "d2"]); // order preserved
    expect(likes[0].title).toBe("iced matcha");
  });

  it("returns the input unchanged when the detail is not found", () => {
    const input = people();
    expect(moveDetailBetweenSections(input, "p1", "likes", "dislikes", "nope", {})).toEqual(input);
  });
});

describe("filterItemsByStatus", () => {
  const items: Item[] = [
    { id: "i1", type: "movie", title: "A", status: "watched" },
    { id: "i2", type: "music", title: "B", status: "want-to-listen" }, // orphan after movie→ template
  ];
  it("returns everything under 'all'", () => {
    expect(filterItemsByStatus(items, "all")).toHaveLength(2);
  });
  it("returns only matching items under a status filter", () => {
    expect(filterItemsByStatus(items, "watched").map((i) => i.id)).toEqual(["i1"]);
  });
  it("returns nothing for a status no item has (out-of-template status hidden from that filter)", () => {
    expect(filterItemsByStatus(items, "want-to-watch")).toEqual([]);
  });
});

describe("deriveListMeta", () => {
  it("derives noun and kind from the template", () => {
    expect(deriveListMeta("food")).toEqual({ noun: "little tastes noted", kind: "food" });
    expect(deriveListMeta("movie")).toEqual({ noun: "little films saved", kind: "movie" });
  });
});
