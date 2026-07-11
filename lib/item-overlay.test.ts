import { describe, it, expect } from "vitest";
import { reconcileOverlay } from "./item-overlay";
import type { Item } from "./types";

function makeItem(overrides: Partial<Pick<Item, "title" | "note" | "tags">> = {}): Pick<Item, "title" | "note" | "tags"> {
  return { title: "abc", note: "a note", tags: ["x", "y"], ...overrides };
}

describe("reconcileOverlay", () => {
  it("drops a key once its overlay value equals the persisted item value", () => {
    const item = makeItem({ title: "abc" });
    const overlay = { title: "abc" };
    expect(reconcileOverlay(overlay, item)).toEqual({});
  });

  it("keeps a key when the overlay holds a newer value than the persisted item (same-field race)", () => {
    // flush persisted "abc"; user has already typed ahead to "abcd"
    const item = makeItem({ title: "abc" });
    const overlay = { title: "abcd" };
    expect(reconcileOverlay(overlay, item)).toEqual({ title: "abcd" });
  });

  it("does not drop one field's still-pending key when another field's edit lands (cross-field race)", () => {
    // title's flush landed and matches, but note is still mid-edit and unflushed
    const item = makeItem({ title: "abc", note: "old note" });
    const overlay = { title: "abc", note: "new note in progress" };
    expect(reconcileOverlay(overlay, item)).toEqual({ note: "new note in progress" });
  });

  it("treats undefined note and empty-string note as equal and drops the key", () => {
    const item = makeItem({ note: undefined });
    const overlay = { note: "" };
    expect(reconcileOverlay(overlay, item)).toEqual({});
  });

  it("tags: drops the key when arrays are equal in order and content", () => {
    const item = makeItem({ tags: ["a", "b"] });
    const overlay = { tags: ["a", "b"] };
    expect(reconcileOverlay(overlay, item)).toEqual({});
  });

  it("tags: keeps the key when arrays differ in order", () => {
    const item = makeItem({ tags: ["a", "b"] });
    const overlay = { tags: ["b", "a"] };
    expect(reconcileOverlay(overlay, item)).toEqual({ tags: ["b", "a"] });
  });

  it("tags: treats undefined and [] as not equal, keeping the key", () => {
    const item = makeItem({ tags: undefined });
    const overlay = { tags: [] as string[] };
    expect(reconcileOverlay(overlay, item)).toEqual({ tags: [] });
  });

  it("tags: drops the key when both overlay and item are undefined", () => {
    const item = makeItem({ tags: undefined });
    const overlay = { tags: undefined };
    expect(reconcileOverlay(overlay, item)).toEqual({});
  });

  it("returns the same object reference when nothing changes", () => {
    const item = makeItem({ title: "abc" });
    const overlay = { title: "abcd", note: "still typing" };
    const result = reconcileOverlay(overlay, item);
    expect(result).toBe(overlay);
  });

  it("returns a new object (not the same reference) when a key is dropped", () => {
    const item = makeItem({ title: "abc" });
    const overlay = { title: "abc" };
    const result = reconcileOverlay(overlay, item);
    expect(result).not.toBe(overlay);
  });

  it("handles an empty overlay by returning the same empty object", () => {
    const item = makeItem();
    const overlay = {};
    expect(reconcileOverlay(overlay, item)).toBe(overlay);
  });
});
