import { describe, it, expect } from "vitest";
import { toCsv, buildExportJson, buildCsvSections } from "./export";

const sample = {
  profile: { name: "Sam", theme: "blush" },
  lists: [{ id: "l1", title: "Movies", emoji: "🎬", template: "movie", theme: "blush",
    description: "family favorites", pinned: true,
    items: [{ id: "i1", title: "Coraline", subtitle: "2009", note: "spooky, good", status: "want",
      rating: 5, type: "movie", emoji: "🍿", imageUrl: "https://img.example/coraline.jpg",
      tags: ["a"], personId: "p1", pinned: true }] }],
  people: [{ id: "p1", name: "Mom", emoji: "🌷", theme: "sage", note: "loves tea", specialDay: "05-12",
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
  it("quotes a lone carriage return", () => {
    expect(toCsv([{ a: "before\rafter" }], ["a"])).toBe('a\r\n"before\rafter"\r\n');
  });
  it("neutralizes spreadsheet formula injection with a leading single quote", () => {
    const csv = toCsv([{ a: "=SUM(A1)" }], ["a"]);
    expect(csv).toBe("a\r\n'=SUM(A1)\r\n");
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

  it("preserves every user-entered field, not just the originals", () => {
    const doc = buildExportJson({ ...sample, exportedAt: "2026-07-11T00:00:00Z" });
    const item = doc.lists[0].items[0];
    expect(item.subtitle).toBe("2009");
    expect(item.rating).toBe(5);
    expect(item.type).toBe("movie");
    expect(item.emoji).toBe("🍿");
    expect(item.imageUrl).toBe("https://img.example/coraline.jpg");
    expect(item.personId).toBe("p1");
    expect(item.pinned).toBe(true);

    const list = doc.lists[0];
    expect(list.theme).toBe("blush");
    expect(list.description).toBe("family favorites");
    expect(list.pinned).toBe(true);

    const person = doc.people[0];
    expect(person.theme).toBe("sage");
    expect(person.note).toBe("loves tea");
    expect(person.specialDay).toBe("05-12");
  });
});

describe("buildCsvSections", () => {
  it("returns five named sections and flattens list title onto items", () => {
    const secs = buildCsvSections({ ...sample, exportedAt: "2026-07-11T00:00:00Z" });
    expect(secs.map((s) => s.name)).toEqual(["lists", "items", "people", "details", "scraps"]);
    const items = secs.find((s) => s.name === "items")!.csv;
    expect(items).toContain("Movies"); // listTitle flattened onto the item row
  });

  it("includes the rating and a resolved personName column on items", () => {
    const secs = buildCsvSections({ ...sample, exportedAt: "2026-07-11T00:00:00Z" });
    const items = secs.find((s) => s.name === "items")!.csv;
    expect(items).toContain("rating");
    expect(items).toContain("personName");
    expect(items).toContain("Mom"); // resolved from personId via the people map
    expect(items).toContain("5"); // the rating value
  });
});
