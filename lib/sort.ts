import type { Item, StatusId } from "./types";

export type SortMode = "recent" | "title" | "rating" | "status" | "custom";

export const SORT_MODES: { id: SortMode; label: string }[] = [
  { id: "recent", label: "Recently added" },
  { id: "title", label: "Title A to Z" },
  { id: "rating", label: "Highest rated" },
  { id: "status", label: "By status" },
  { id: "custom", label: "Custom order" },
];

export function isSortMode(v: string | undefined | null): v is SortMode {
  return (
    v === "recent" || v === "title" || v === "rating" || v === "status" || v === "custom"
  );
}

function sortByMode(items: Item[], mode: SortMode, statusOrder: StatusId[]): Item[] {
  switch (mode) {
    case "recent":
      // already delivered newest-first; keep as-is
      return items;
    case "title":
      return [...items].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      );
    case "rating":
      return [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "status": {
      const rank = (s?: string) => {
        const i = s ? statusOrder.indexOf(s as StatusId) : -1;
        return i === -1 ? statusOrder.length : i;
      };
      return [...items].sort((a, b) => rank(a.status) - rank(b.status));
    }
    case "custom":
      return [...items].sort(
        (a, b) =>
          (a.position ?? Number.POSITIVE_INFINITY) - (b.position ?? Number.POSITIVE_INFINITY)
      );
  }
}

/**
 * Order a list's items by the chosen mode, then float pinned items to the top.
 * Array.prototype.sort is stable, so the mode order is preserved within the
 * pinned and unpinned groups. Never mutates the input.
 */
export function sortItems(items: Item[], mode: SortMode, statusOrder: StatusId[]): Item[] {
  const base = sortByMode(items, mode, statusOrder);
  return [...base].sort(
    (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
  );
}

/** True when `title` (trimmed, case-insensitive) already exists among `items`. */
export function isDuplicateTitle(title: string, items: Pick<Item, "title">[]): boolean {
  const norm = title.trim().toLowerCase();
  if (!norm) return false;
  return items.some((i) => i.title.trim().toLowerCase() === norm);
}
