import { describe, it, expect } from "vitest";
import { searchLittleWorld, type LocalHit } from "./local";
import type { List, Person, Scrap } from "../types";

function list(over: Partial<List> & Pick<List, "id" | "title">): List {
  return {
    emoji: "🎬",
    theme: "blush",
    noun: "little films saved",
    kind: "movie",
    template: "movie",
    pinned: false,
    items: [],
    ...over,
  };
}

function lists(): List[] {
  return [
    list({
      id: "l1",
      title: "Gift ideas",
      template: "gift",
      kind: "custom",
      items: [
        { id: "i1", type: "custom", title: "Wool socks", note: "cozy for winter", tags: ["warm"] },
        { id: "i2", type: "movie", title: "Past Lives", subtitle: "2023", imageUrl: "https://x/poster.jpg" },
      ],
    }),
    list({
      id: "l2",
      title: "Weeknight cooking",
      template: "food",
      kind: "food",
      items: [{ id: "i3", type: "food", title: "Ramen", tags: ["noodles", "cozy"] }],
    }),
  ];
}

function people(): Person[] {
  return [
    {
      id: "p1",
      name: "Maya",
      emoji: "🌷",
      theme: "blush",
      note: "old friend from school",
      sections: [
        {
          id: "likes",
          label: "Likes",
          emoji: "💛",
          kind: "chips",
          entries: [
            { id: "d1", title: "matcha lattes", tags: ["drink"] },
            { id: "d2", title: "hiking", note: "prefers early mornings", tags: [] },
          ],
        },
      ],
    },
  ];
}

function scraps(): Scrap[] {
  return [
    { id: "s1", text: "that ramen place downtown", detection: null, createdAt: "2026-07-01T00:00:00.000Z" },
    { id: "s2", text: "call the dentist", detection: null, createdAt: "2026-07-08T00:00:00.000Z" },
  ];
}

function data() {
  return { lists: lists(), people: people(), scraps: scraps() };
}

/** flatten a group's hits to their ids for terse assertions */
function idsOf(groupKey: LocalHit["kind"], groups: ReturnType<typeof searchLittleWorld>) {
  return groups.find((g) => g.key === groupKey)?.hits.map((h) => h.id) ?? [];
}

describe("searchLittleWorld", () => {
  it("returns no groups for an empty or whitespace query", () => {
    expect(searchLittleWorld("", data())).toEqual([]);
    expect(searchLittleWorld("   ", data())).toEqual([]);
  });

  it("matches list titles and template labels (preserves today's behavior)", () => {
    // "gift" matches the Gift ideas title
    expect(idsOf("list", searchLittleWorld("gift", data()))).toContain("l1");
    // template label match: the food list's label is "Food list"
    expect(idsOf("list", searchLittleWorld("food list", data()))).toContain("l2");
  });

  it("matches items by title, subtitle, note, and tags, carrying the parent list", () => {
    const byTitle = searchLittleWorld("wool", data());
    const hit = byTitle.find((g) => g.key === "item")?.hits[0] as Extract<LocalHit, { kind: "item" }>;
    expect(hit.item.id).toBe("i1");
    expect(hit.list.id).toBe("l1");

    expect(idsOf("item", searchLittleWorld("winter", data()))).toContain("i1"); // note
    expect(idsOf("item", searchLittleWorld("noodles", data()))).toContain("i3"); // tag
    expect(idsOf("item", searchLittleWorld("2023", data()))).toContain("i2"); // subtitle
  });

  it("matches people by name and short note", () => {
    expect(idsOf("person", searchLittleWorld("maya", data()))).toContain("p1");
    expect(idsOf("person", searchLittleWorld("school", data()))).toContain("p1"); // note
  });

  it("matches person details by title, note, and tags, carrying person + section", () => {
    const groups = searchLittleWorld("matcha", data());
    const hit = groups.find((g) => g.key === "detail")?.hits[0] as Extract<LocalHit, { kind: "detail" }>;
    expect(hit.detail.id).toBe("d1");
    expect(hit.person.id).toBe("p1");
    expect(hit.section.id).toBe("likes");

    expect(idsOf("detail", searchLittleWorld("mornings", data()))).toContain("d2"); // note
    expect(idsOf("detail", searchLittleWorld("drink", data()))).toContain("d1"); // tag
  });

  it("matches scraps by text", () => {
    expect(idsOf("scrap", searchLittleWorld("dentist", data()))).toContain("s2");
  });

  it("is case-insensitive", () => {
    expect(idsOf("person", searchLittleWorld("MAYA", data()))).toContain("p1");
  });

  it("orders groups: little worlds, little things, your people, little details, in your pocket", () => {
    // 'co' hits a list (cooking), an item (cozy), a scrap? build a query that spans groups
    const groups = searchLittleWorld("cozy", data());
    const keys = groups.map((g) => g.key);
    // groups present must appear in the canonical order
    const order = ["list", "item", "person", "detail", "scrap"];
    const positions = keys.map((k) => order.indexOf(k));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("labels groups in brand voice", () => {
    const groups = searchLittleWorld("cozy", data());
    const label = (k: string) => groups.find((g) => g.key === k)?.label;
    // build data guaranteed to hit every group
    const all = searchLittleWorld("a", data()); // 'a' appears widely
    const byKey = Object.fromEntries(all.map((g) => [g.key, g.label]));
    expect(byKey.list ?? label("list")).toBeDefined();
    expect(all.find((g) => g.key === "list")?.label).toBe("little worlds");
    expect(all.find((g) => g.key === "item")?.label).toBe("little things");
    expect(all.find((g) => g.key === "person")?.label).toBe("your people");
    expect(all.find((g) => g.key === "detail")?.label).toBe("little details");
    expect(all.find((g) => g.key === "scrap")?.label).toBe("in your pocket");
  });

  it("ranks prefix > word-start > substring within a group", () => {
    const ranked = [
      list({ id: "r3", title: "Unscramble me" }), // 'amble' mid-word (prev='r') -> substring rank 2
      list({ id: "r2", title: "Team amble" }), // 'amble' after space -> word-start rank 1
      list({ id: "r1", title: "Amble onward" }), // 'amble' at prefix -> rank 0
    ];
    const groups = searchLittleWorld("amble", { lists: ranked, people: [], scraps: [] });
    expect(idsOf("list", groups)).toEqual(["r1", "r2", "r3"]);
  });

  it("caps a group at 8 hits", () => {
    const many = Array.from({ length: 20 }, (_, i) => list({ id: `m${i}`, title: `Movie night ${i}` }));
    const groups = searchLittleWorld("movie", { lists: many, people: [], scraps: [] });
    expect(idsOf("list", groups).length).toBe(8);
  });

  it("omits groups with no matches", () => {
    const groups = searchLittleWorld("dentist", data());
    expect(groups.every((g) => g.hits.length > 0)).toBe(true);
    expect(groups.map((g) => g.key)).toEqual(["scrap"]);
  });
});
