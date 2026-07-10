import { describe, it, expect } from "vitest";
import {
  moveDetailBetweenSections,
  filterItemsByStatus,
  deriveListMeta,
  renamePersonInItems,
  linkedItemsByPerson,
} from "./store-helpers";
import type { List, Person, Item } from "./types";

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

describe("renamePersonInItems", () => {
  function lists(): List[] {
    const base = { emoji: "🎁", theme: "blush" as const, noun: "", kind: "custom" as const, template: "gift" as const, pinned: false };
    return [
      {
        id: "l1", title: "Gifts", ...base,
        items: [
          { id: "i1", type: "custom", title: "socks", subtitle: "Mae", personId: "p1" },
          { id: "i2", type: "custom", title: "book", subtitle: "office", personId: undefined },
        ],
      },
      {
        id: "l2", title: "More gifts", ...base,
        items: [{ id: "i3", type: "custom", title: "mug", subtitle: "Mae", personId: "p1" }],
      },
    ];
  }

  it("refreshes the subtitle on every item linked to the renamed person, across lists", () => {
    const out = renamePersonInItems(lists(), "p1", "Maya");
    expect(out[0].items[0].subtitle).toBe("Maya");
    expect(out[1].items[0].subtitle).toBe("Maya");
  });

  it("leaves unlinked items and their subtitles untouched", () => {
    const out = renamePersonInItems(lists(), "p1", "Maya");
    expect(out[0].items[1].subtitle).toBe("office");
  });

  it("keeps referential identity for lists with no matching item", () => {
    const input = lists();
    input[0].items = [{ id: "i2", type: "custom", title: "book", subtitle: "office" }];
    const out = renamePersonInItems(input, "p1", "Maya");
    expect(out[0]).toBe(input[0]); // untouched list keeps its identity
    expect(out[1]).not.toBe(input[1]); // the list that changed is a fresh object
  });
});

describe("deriveListMeta", () => {
  it("derives noun and kind from the template", () => {
    expect(deriveListMeta("food")).toEqual({ noun: "little tastes noted", kind: "food" });
    expect(deriveListMeta("movie")).toEqual({ noun: "little films saved", kind: "movie" });
  });
});

describe("linkedItemsByPerson", () => {
  function lists(): List[] {
    const base = { emoji: "🎁", theme: "blush" as const, noun: "", kind: "custom" as const, template: "gift" as const, pinned: false };
    return [
      {
        id: "l1", title: "Gifts", ...base,
        items: [
          { id: "i1", type: "custom", title: "socks", personId: "p1" },
          { id: "i2", type: "custom", title: "book", personId: undefined },
        ],
      },
      {
        id: "l2", title: "Date ideas", ...base,
        items: [{ id: "i3", type: "custom", title: "picnic", personId: "p1" }],
      },
      {
        id: "l3", title: "Unrelated list", ...base,
        items: [{ id: "i4", type: "custom", title: "widget", personId: "p2" }],
      },
    ];
  }

  it("groups linked items by list, in list order, omitting lists with none", () => {
    const out = linkedItemsByPerson(lists(), "p1");
    expect(out.map((g) => g.list.id)).toEqual(["l1", "l2"]);
    expect(out[0].items.map((i) => i.id)).toEqual(["i1"]);
    expect(out[1].items.map((i) => i.id)).toEqual(["i3"]);
  });

  it("returns an empty array when the person has no linked items", () => {
    expect(linkedItemsByPerson(lists(), "p-nobody")).toEqual([]);
  });
});
