import { describe, it, expect } from "vitest";
import {
  NEW_LIST_TEMPLATES,
  STATUS_META,
  TEMPLATE_META,
  captureStatusFor,
  statusesForList,
  templateRailOrder,
  type ListTemplate,
} from "./types";

const TEMPLATES = Object.keys(TEMPLATE_META) as ListTemplate[];

describe("statusesForList", () => {
  it("returns the same set a list's filter chips are built from, for every template", () => {
    // The list page builds its filter chips by iterating statusesForList(list).
    // The item editor must offer that exact set, or changing an item's status
    // can strand it outside every chip except All.
    for (const template of TEMPLATES) {
      const chipStatuses = statusesForList({ template });
      expect(chipStatuses, `template "${template}"`).toEqual(
        TEMPLATE_META[template].statuses
      );
      // every chip status must have display metadata
      for (const s of chipStatuses) {
        expect(STATUS_META[s], `status "${s}" for template "${template}"`).toBeDefined();
      }
    }
  });
});

describe("TEMPLATE_META.personField", () => {
  it("is set only on the gift template, which keeps its extraField as the fallback copy", () => {
    for (const template of TEMPLATES) {
      const meta = TEMPLATE_META[template];
      if (template === "gift") {
        expect(meta.personField, "gift").toBe(true);
        // the person picker reuses extraField for its label + note placeholder
        expect(meta.extraField).toBeDefined();
      } else {
        expect(meta.personField, `template "${template}"`).toBeUndefined();
      }
    }
  });

  it("leaves the date template's Where field as plain free text", () => {
    expect(TEMPLATE_META.date.personField).toBeUndefined();
    expect(TEMPLATE_META.date.extraField?.label).toBe("Where?");
  });
});

describe("templateRailOrder", () => {
  it("never offers the retired people template when starting fresh", () => {
    expect(NEW_LIST_TEMPLATES).not.toContain("people");
    for (const current of NEW_LIST_TEMPLATES) {
      expect(templateRailOrder(current)).toEqual(NEW_LIST_TEMPLATES);
    }
  });

  it("still lets a grandfathered people_notes list render/select its own template", () => {
    const order = templateRailOrder("people");
    expect(order).toEqual([...NEW_LIST_TEMPLATES, "people"]);
    expect(order).toContain("people");
  });

  it("gives every rail template a TEMPLATE_META entry", () => {
    for (const current of [...NEW_LIST_TEMPLATES, "people"] as ListTemplate[]) {
      for (const t of templateRailOrder(current)) {
        expect(TEMPLATE_META[t], `template "${t}"`).toBeDefined();
      }
    }
  });
});

describe("TEMPLATE_META.food.statuses", () => {
  it("includes the food template's positive statuses alongside the negatives", () => {
    // Regression: the food status set had been trimmed to only negatives,
    // so a food item could never be marked love / maybe / need-to-try.
    const { statuses } = TEMPLATE_META.food;
    for (const s of ["love", "maybe", "need-to-try"] as const) {
      expect(statuses, `positive status "${s}"`).toContain(s);
    }
    // the negatives that share the set are still there
    for (const s of ["hate", "never-again"] as const) {
      expect(statuses, `negative status "${s}"`).toContain(s);
    }
  });
});

describe("captureStatusFor", () => {
  it("uses the first status where it is already capture-shaped", () => {
    expect(captureStatusFor("movie")).toBe("want-to-watch");
    expect(captureStatusFor("book")).toBe("want-to-read");
    expect(captureStatusFor("place")).toBe("want-to-go");
    expect(captureStatusFor("gift")).toBe("idea");
  });

  it("overrides food to need-to-try (first status is 'love')", () => {
    expect(captureStatusFor("food")).toBe("need-to-try");
  });

  it("returns undefined for custom lists (no honest default)", () => {
    expect(captureStatusFor("custom")).toBeUndefined();
  });
});
