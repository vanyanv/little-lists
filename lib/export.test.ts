import { describe, it, expect } from "vitest";
import { toCsv, buildExportJson, buildCsvSections } from "./export";

const sample = {
  profile: { name: "Sam", theme: "blush" },
  lists: [{ id: "l1", title: "Movies", emoji: "🎬", template: "movie",
    items: [{ id: "i1", title: "Coraline", note: "spooky, good", status: "want", tags: ["a"] }] }],
  people: [{ id: "p1", name: "Mom", emoji: "🌷",
    details: [{ id: "d1", section: "loves", title: "tea", note: null, tags: [] }] }],
  scraps: [{ id: "s1", text: "book rec: Tomorrow x3" }],
};

describe("toCsv", () => {
  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    const csv = toCsv([{ a: 'he said "hi", ok', b: "line1\nline2" }], ["a", "b"]);
    expect(csv).toBe('a,b\r\n"he said ""hi"", ok","line1\nline2"\r\n');
  });
  it("renders a header even with no rows", () => {
    expect(toCsv([], ["a", "b"])).toBe("a,b\r\n");
  });
  it("stringifies arrays as a semicolon-joined field (no quoting needed — no comma)", () => {
    expect(toCsv([{ tags: ["x", "y"] }], ["tags"])).toBe("tags\r\nx; y\r\n");
  });
});

describe("buildExportJson", () => {
  it("nests items under lists and details under people, with an exportedAt", () => {
    const doc = buildExportJson({ ...sample, exportedAt: "2026-07-11T00:00:00Z" });
    expect(doc.exportedAt).toBe("2026-07-11T00:00:00Z");
    expect(doc.lists[0].items[0].title).toBe("Coraline");
    expect(doc.people[0].details[0].title).toBe("tea");
    expect(doc.scraps[0].text).toBe("book rec: Tomorrow x3");
  });
});

describe("buildCsvSections", () => {
  it("returns five named sections and flattens list title onto items", () => {
    const secs = buildCsvSections({ ...sample, exportedAt: "2026-07-11T00:00:00Z" });
    expect(secs.map((s) => s.name)).toEqual(["lists", "items", "people", "details", "scraps"]);
    const items = secs.find((s) => s.name === "items")!.csv;
    expect(items).toContain("Movies"); // listTitle flattened onto the item row
  });
});
