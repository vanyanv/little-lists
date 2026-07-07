import { describe, it, expect } from "vitest";
import {
  STATUS_META,
  STATUSES_FOR,
  TEMPLATE_META,
  statusesForList,
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

describe("STATUSES_FOR.food", () => {
  it("includes the food template's positive statuses alongside the negatives", () => {
    // Regression: the food editor set had been trimmed to only negatives,
    // so a food item could never be marked love / maybe / need-to-try.
    for (const s of ["love", "maybe", "need-to-try"] as const) {
      expect(STATUSES_FOR.food, `positive status "${s}"`).toContain(s);
    }
    // and it should mirror the food template's full chip set
    expect([...STATUSES_FOR.food].sort()).toEqual(
      [...TEMPLATE_META.food.statuses].sort()
    );
  });
});
