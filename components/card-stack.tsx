import type { Item, ItemType } from "@/lib/types";
import { Cover } from "./cover";
import { LittleIcon } from "./icons/little-icon";

const ROT = [-7, -1, 5, 10];

/** Overlapping preview of a list's first few little things (the collectible peek). */
export function CardStack({
  items,
  kind,
  size = "md",
}: {
  items: Item[];
  kind: ItemType;
  size?: "sm" | "md" | "lg";
}) {
  const max = size === "lg" ? 3 : 4;
  const shown = items.slice(0, max);
  // movies/books stack 2:3 covers, music stacks square album art — all through
  // Cover, so real artwork shows when an item has it (placeholder otherwise)
  const isPoster = kind === "movie" || kind === "book" || kind === "music";
  const w = size === "lg" ? 52 : size === "sm" ? 38 : 46;

  if (shown.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-xl border border-dashed border-[var(--t-edge)] text-[var(--t-ink)]"
        style={{ width: w, height: kind === "movie" || kind === "book" ? w * 1.5 : w, opacity: 0.7 }}
      >
        <span className="text-lg">＋</span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {shown.map((item, i) =>
        isPoster ? (
          <div
            key={item.id}
            className="shrink-0"
            style={{
              width: w,
              marginLeft: i === 0 ? 0 : -w * 0.45,
              transform: `rotate(${ROT[i] ?? 0}deg)`,
              zIndex: i,
            }}
          >
            <Cover
              item={item}
              sizes={`${w}px`}
              className="shadow-soft ring-2 ring-paper"
              rounded="rounded-lg"
            />
          </div>
        ) : (
          <span
            key={item.id}
            className="grid shrink-0 place-items-center rounded-xl bg-paper shadow-soft ring-2 ring-[var(--t-bg)]"
            style={{
              width: w,
              height: w,
              fontSize: w * 0.42,
              marginLeft: i === 0 ? 0 : -w * 0.32,
              transform: `rotate(${ROT[i] ?? 0}deg)`,
              zIndex: i,
            }}
          >
            {item.emoji ?? <LittleIcon name="sparkle" size={w * 0.42} />}
          </span>
        )
      )}
    </div>
  );
}
