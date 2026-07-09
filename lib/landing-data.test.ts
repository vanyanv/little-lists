import { describe, expect, it } from "vitest";
import { PREVIEW_PERSON, SHOWCASE_PEOPLE_SCRAPS } from "./landing-data";

describe("landing sample copy", () => {
  it("keeps the showcase people scraps distinct from the person card's chips", () => {
    const chips = new Set(PREVIEW_PERSON.sections.map((s) => s.label.toLowerCase()));
    for (const scrap of SHOWCASE_PEOPLE_SCRAPS) {
      expect(chips.has(scrap.toLowerCase()), `"${scrap}" also appears on the person card`).toBe(false);
    }
  });
});
