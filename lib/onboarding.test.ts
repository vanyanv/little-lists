import { describe, it, expect } from "vitest";
import { STARTER_OPTIONS, DEMO_PERSON, deriveChecklist, MIN_STARTERS } from "./onboarding";
import { TEMPLATE_META } from "./types";
import { PERSON_SECTIONS } from "./people";
import type { List, Person } from "./types";

describe("STARTER_OPTIONS", () => {
  it("only uses templates that exist in TEMPLATE_META", () => {
    for (const opt of STARTER_OPTIONS) {
      expect(TEMPLATE_META[opt.template], `starter "${opt.id}"`).toBeDefined();
    }
  });

  it("only uses demo statuses valid for the starter's template", () => {
    for (const opt of STARTER_OPTIONS) {
      const allowed = TEMPLATE_META[opt.template].statuses;
      for (const item of opt.demoItems) {
        expect(allowed, `"${item.title}" in starter "${opt.id}"`).toContain(item.status);
      }
    }
  });

  it("has unique ids", () => {
    const ids = STARTER_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("DEMO_PERSON", () => {
  it("only uses section ids that exist in PERSON_SECTIONS", () => {
    const known = new Set(PERSON_SECTIONS.map((s) => s.id));
    for (const detail of DEMO_PERSON.details) {
      expect(known.has(detail.sectionId), `section "${detail.sectionId}"`).toBe(true);
    }
  });
});

function list(items: List["items"]): List {
  return {
    id: "l1",
    title: "Movies",
    emoji: "🎬",
    theme: "blush",
    noun: "little films saved",
    kind: "movie",
    template: "movie",
    items,
  };
}

function person(entries: { id: string; title: string; tags: string[] }[]): Person {
  return {
    id: "p1",
    name: "Sam",
    emoji: "🌼",
    theme: "butter",
    note: "",
    sections: [{ id: "likes", label: "Likes", emoji: "💛", kind: "chips", entries }],
  };
}

describe("deriveChecklist", () => {
  it("marks nothing done for a brand-new user", () => {
    expect(deriveChecklist([], []).map((c) => c.done)).toEqual([false, false, false]);
  });

  it("marks only the list step done when lists are empty of items", () => {
    expect(deriveChecklist([list([])], []).map((c) => c.done)).toEqual([true, false, false]);
  });

  it("marks the item step done once any list has an item", () => {
    const withItem = list([{ id: "i1", type: "movie", title: "Coraline" }]);
    expect(deriveChecklist([withItem], []).map((c) => c.done)).toEqual([true, true, false]);
  });

  it("requires a person to have at least one entry, not just exist", () => {
    expect(deriveChecklist([], [person([])]).map((c) => c.done)).toEqual([false, false, false]);
    expect(
      deriveChecklist([], [person([{ id: "e1", title: "matcha", tags: [] }])]).map((c) => c.done)
    ).toEqual([false, false, true]);
  });

  it("does not count example-tagged items toward the first-item step", () => {
    const seeded = list([{ id: "i1", type: "movie", title: "Coraline", tags: ["example"] }]);
    // list exists (done), but its only item is a seeded example (not done)
    expect(deriveChecklist([seeded], []).map((c) => c.done)).toEqual([true, false, false]);
  });

  it("counts a real item alongside example items", () => {
    const mixed = list([
      { id: "i1", type: "movie", title: "Coraline", tags: ["example"] },
      { id: "i2", type: "movie", title: "Past Lives" },
    ]);
    expect(deriveChecklist([mixed], []).map((c) => c.done)).toEqual([true, true, false]);
  });

  it("does not count example-tagged person entries toward the detail step", () => {
    expect(
      deriveChecklist([], [person([{ id: "e1", title: "farmers markets", tags: ["example"] }])]).map(
        (c) => c.done
      )
    ).toEqual([false, false, false]);
  });
});

describe("MIN_STARTERS", () => {
  it("lets a user begin with a single pick", () => {
    expect(MIN_STARTERS).toBe(1);
  });
});
