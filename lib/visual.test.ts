import { describe, expect, it } from "vitest";
import { archiveSummary, nextViewMode } from "./visual";
import type { List, Person } from "./types";

const list = (items: number): List =>
  ({ id: "l", title: "t", emoji: "✨", theme: "blush", noun: "thing", kind: "custom", template: "custom", pinned: false, items: Array.from({ length: items }, (_, i) => ({ id: `i${i}`, type: "custom", title: "x" })) }) as unknown as List;
const person = (): Person => ({ id: "p", name: "n", emoji: "✨", theme: "blush", note: "", sections: [] }) as unknown as Person;

describe("archiveSummary", () => {
  it("pluralizes worlds and things", () => {
    expect(archiveSummary([list(2), list(3)], [])).toBe("2 little worlds · 5 little things");
  });
  it("uses singular forms", () => {
    expect(archiveSummary([list(1)], [person()])).toBe(
      "1 little world · 1 little thing · 1 person remembered"
    );
  });
  it("counts people with plural", () => {
    expect(archiveSummary([], [person(), person()])).toBe(
      "0 little worlds · 0 little things · 2 people remembered"
    );
  });
});

describe("nextViewMode", () => {
  it("cycles grid → list → cozy → grid", () => {
    expect(nextViewMode("grid")).toBe("list");
    expect(nextViewMode("list")).toBe("cozy");
    expect(nextViewMode("cozy")).toBe("grid");
  });
});
