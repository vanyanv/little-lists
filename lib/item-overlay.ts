import type { Item } from "@/lib/types";

type ItemOverlay = Partial<Pick<Item, "title" | "note" | "tags">>;

/** Order-sensitive shallow array compare. Both undefined counts as equal. */
function sameTags(a: string[] | undefined, b: string[] | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * Returns the overlay with any key dropped whose value now matches the
 * persisted item (that edit has landed); keys with a still-newer pending
 * value are kept. Never wipes unrelated/newer edits.
 *
 * Returns the same object reference when nothing changed, so callers can
 * skip a re-render (e.g. `setOverlay((prev) => reconcileOverlay(prev, item))`).
 */
export function reconcileOverlay(overlay: ItemOverlay, item: Pick<Item, "title" | "note" | "tags">): ItemOverlay {
  const next = { ...overlay };
  let changed = false;
  if ("title" in next && next.title === item.title) {
    delete next.title;
    changed = true;
  }
  if ("note" in next && (next.note ?? "") === (item.note ?? "")) {
    delete next.note;
    changed = true;
  }
  if ("tags" in next && sameTags(next.tags, item.tags)) {
    delete next.tags;
    changed = true;
  }
  return changed ? next : overlay;
}
