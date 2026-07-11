import { describe, it, expect } from "vitest";
import { sanitizeAnalyticsProperties, isProductEventName } from "./analytics";

describe("sanitizeAnalyticsProperties", () => {
  it("keeps primitives and null", () => {
    expect(sanitizeAnalyticsProperties({ a: "x", b: 3, c: true, d: null })).toEqual({
      a: "x", b: 3, c: true, d: null,
    });
  });

  it("drops non-primitive values (objects, arrays, functions, undefined)", () => {
    const out = sanitizeAnalyticsProperties({
      keep: 1, obj: { nested: 1 }, arr: [1], fn: () => 1, undef: undefined,
    });
    expect(out).toEqual({ keep: 1 });
  });

  it("caps at 12 keys in sorted order", () => {
    const input: Record<string, number> = {};
    for (let i = 0; i < 20; i++) input[`k${String(i).padStart(2, "0")}`] = i;
    const out = sanitizeAnalyticsProperties(input);
    expect(Object.keys(out)).toHaveLength(12);
    expect(Object.keys(out)).toContain("k00");
    expect(Object.keys(out)).not.toContain("k19");
  });

  it("truncates string values to 120 chars", () => {
    const out = sanitizeAnalyticsProperties({ s: "a".repeat(200) });
    expect((out.s as string).length).toBe(120);
  });

  it("returns an empty object for non-object input", () => {
    expect(sanitizeAnalyticsProperties(null)).toEqual({});
    expect(sanitizeAnalyticsProperties("nope")).toEqual({});
    expect(sanitizeAnalyticsProperties(undefined)).toEqual({});
  });
});

describe("isProductEventName", () => {
  it("accepts a known name and rejects an unknown one", () => {
    expect(isProductEventName("list_created")).toBe(true);
    expect(isProductEventName("definitely_not_an_event")).toBe(false);
  });
});
