import { describe, expect, it } from "vitest";
import {
  DEMO_VIEW_MOVIES,
  PREVIEW_MOVIES,
  PREVIEW_PERSON,
  SHOWCASE_MOVIES,
  SHOWCASE_PEOPLE_SCRAPS,
} from "./landing-data";

describe("landing sample copy", () => {
  it("keeps the showcase people scraps distinct from the person card's chips", () => {
    const chips = new Set(PREVIEW_PERSON.sections.map((s) => s.label.toLowerCase()));
    for (const scrap of SHOWCASE_PEOPLE_SCRAPS) {
      expect(chips.has(scrap.toLowerCase()), `"${scrap}" also appears on the person card`).toBe(false);
    }
  });

  it("keeps the view-demo movie posters distinct from the hero and showcase posters", () => {
    const elsewhere = new Set(
      [...PREVIEW_MOVIES.items, ...SHOWCASE_MOVIES.items].map((m) => m.title.toLowerCase())
    );
    for (const item of DEMO_VIEW_MOVIES.items) {
      expect(
        elsewhere.has(item.title.toLowerCase()),
        `"${item.title}" already appears in another landing section`
      ).toBe(false);
    }
  });
});
