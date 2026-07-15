// lib/import.test.ts
import { describe, expect, it } from "vitest";
import { parsePastedList, pickBestHit, IMPORT_MAX_LINES } from "./import";
import type { SearchHit } from "./search/types";

const hit = (title: string, sourceId = title): SearchHit => ({
  sourceId,
  type: "movie",
  title,
  subtitle: "2020",
  meta: {},
});

describe("parsePastedList", () => {
  it("splits lines, trims, drops empties", () => {
    expect(parsePastedList("Dune\n\n  Heat  \n").lines).toEqual(["Dune", "Heat"]);
  });

  it("strips bullets, numbering, and checkbox markers", () => {
    const text = "- Dune\n* Heat\n• Arrival\n1. Tenet\n2) Alien\n[ ] Coco\n[x] Ponyo\n☐ Brave";
    expect(parsePastedList(text).lines).toEqual([
      "Dune", "Heat", "Arrival", "Tenet", "Alien", "Coco", "Ponyo", "Brave",
    ]);
  });

  it("strips stacked markers (bullet + checkbox) in one pass", () => {
    expect(parsePastedList("- [ ] Dune\n* [x] Heat").lines).toEqual(["Dune", "Heat"]);
  });

  it("preserves real titles that begin with a parenthesized number", () => {
    expect(parsePastedList("(500) Days of Summer").lines).toEqual(["(500) Days of Summer"]);
  });

  it("dedupes case-insensitively within the paste", () => {
    expect(parsePastedList("Dune\ndune\nDUNE\nHeat").lines).toEqual(["Dune", "Heat"]);
  });

  it("caps at IMPORT_MAX_LINES and reports truncation", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Movie ${i}`).join("\n");
    const result = parsePastedList(text);
    expect(result.lines).toHaveLength(IMPORT_MAX_LINES);
    expect(result.truncated).toBe(true);
    expect(parsePastedList("One\nTwo").truncated).toBe(false);
  });

  it("clips overlong lines to 200 chars", () => {
    const long = "x".repeat(300);
    expect(parsePastedList(long).lines[0]).toHaveLength(200);
  });
});

describe("pickBestHit", () => {
  it("prefers the exact normalized title over provider order", () => {
    const hits = [hit("Dune: Part Two"), hit("Dune")];
    expect(pickBestHit("dune", hits)?.title).toBe("Dune");
  });

  it("falls back to a hit whose title starts with the line", () => {
    const hits = [hit("The Dune Enigma"), hit("Dune: Part Two")];
    expect(pickBestHit("dune:", hits)?.title).toBe("Dune: Part Two");
  });

  it("falls back to the provider's first hit when nothing is close", () => {
    const hits = [hit("Something Else"), hit("Another Thing")];
    expect(pickBestHit("zzz", hits)?.title).toBe("Something Else");
  });

  it("returns undefined for no hits", () => {
    expect(pickBestHit("dune", [])).toBeUndefined();
  });

  it("folds diacritics so 'amelie' exact-matches 'Amélie'", () => {
    const hits = [hit("Amelie or The Time to Love"), hit("Amélie")];
    expect(pickBestHit("amelie", hits)?.title).toBe("Amélie");
  });

  it("picks the least-decorated title containing the line", () => {
    const hits = [hit("The Great Gatsby: The Authorized Text Edition"), hit("The Great Gatsby")];
    expect(pickBestHit("gatsby", hits)?.title).toBe("The Great Gatsby");
  });

  it("never auto-matches a study guide the user didn't ask for", () => {
    const hits = [hit('A Study Guide for Haruki Murakami\'s "Kafka on the Shore"')];
    expect(pickBestHit("Kafka on the Shore", hits)).toBeUndefined();
  });

  it("skips derivative titles but still matches the real work behind them", () => {
    const hits = [hit("SparkNotes: The Great Gatsby"), hit("The Great Gatsby")];
    expect(pickBestHit("the great gatsby", hits)?.title).toBe("The Great Gatsby");
  });

  it("allows derivative titles when the user literally pasted one", () => {
    const guide = hit('A Study Guide for Haruki Murakami\'s "Kafka on the Shore"');
    expect(pickBestHit("study guide kafka on the shore", [guide])).toBe(guide);
  });
});
