import type { ReactNode } from "react";
import { hashString } from "@/lib/visual";
import { STICKER_HALO } from "@/components/icons/little-icon";

interface PlaceholderPosterProps {
  seed: string;
  /** the item's own emoji, or its category's — the placeholder's "key art" */
  emoji: string;
  /** small accent shown in the corner (emoji or glyph) */
  badge?: ReactNode;
  aspect?: "poster" | "square" | "wide";
  rounded?: string;
  className?: string;
}

const ASPECT: Record<NonNullable<PlaceholderPosterProps["aspect"]>, string> = {
  poster: "aspect-[2/3]",
  square: "aspect-square",
  wide: "aspect-[4/3]",
};

/** A designed, offline "cover": warm tinted paper with the item's emoji as a die-cut sticker. */
export function PlaceholderPoster({
  seed,
  emoji,
  badge,
  aspect = "poster",
  rounded = "rounded-xl",
  className = "",
}: PlaceholderPosterProps) {
  const h = hashString(seed);
  const hue = h % 360;
  const tilt = (h % 13) - 6; // stable lazy tilt, -6°..+6°
  return (
    <div
      className={`paper-grain relative overflow-hidden ${ASPECT[aspect]} ${rounded} ${className}`}
      style={{
        background: `linear-gradient(155deg, oklch(0.945 0.02 ${hue}), oklch(0.885 0.036 ${(hue + 30) % 360}))`,
        containerType: "inline-size",
      }}
    >
      <span className="absolute inset-0 grid place-items-center">
        <span
          aria-hidden
          className="select-none leading-none"
          style={{
            fontSize: "clamp(1.25rem, 34cqw, 4.5rem)",
            transform: `rotate(${tilt}deg)`,
            filter: STICKER_HALO,
          }}
        >
          {emoji}
        </span>
      </span>
      {/* poster frame / matte */}
      <span className={`pointer-events-none absolute inset-0 ${rounded} ring-1 ring-inset ring-line/40`} />
      {badge && (
        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-paper/85 text-[0.95rem] shadow-soft backdrop-blur-[1px]">
          {badge}
        </span>
      )}
    </div>
  );
}
