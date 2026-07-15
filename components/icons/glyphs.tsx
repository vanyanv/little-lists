import type { CSSProperties } from "react";
import { Check, Circle, Heart, Star, X, type LucideIcon } from "lucide-react";

/**
 * The single glyph registry — every icon name in the app resolves here.
 *
 * Decorative and pictorial glyphs render as real emoji (the platform's own
 * artwork, with the Noto Color Emoji fallback the root layout loads), so they
 * match the emoji users pick for lists, people, and items. Functional glyphs
 * render as Lucide icons because pills and rows tint them via currentColor,
 * which emoji can't do. LittleIcon, StickerBadge, CategoryIcon and
 * AnimatedSticker are the only consumers — nothing else touches art directly.
 */

/** The original decorative sticker names (kept as a named subset — `TEMPLATE_META.sticker` uses it). */
export type StickerName =
  | "flower"
  | "star"
  | "heart"
  | "sparkle"
  | "tape"
  | "film"
  | "book"
  | "leaf";

export type GlyphName =
  | StickerName
  // pictorial category glyphs
  | "headphones"
  | "fork"
  | "ramen-bowl"
  | "gift"
  | "tulip"
  | "pencil"
  | "clapperboard"
  | "lock"
  // functional glyphs — currentColor, inherit the surrounding text/pill color
  | "check"
  | "cross"
  | "circle"
  | "star-tiny"
  | "heart-tiny";

type FunctionalName = "check" | "cross" | "circle" | "star-tiny" | "heart-tiny";
type PictorialName = Exclude<GlyphName, FunctionalName>;

/** Glyphs that render in currentColor and belong in pills/rows, not as decoration. */
export const FUNCTIONAL_GLYPHS: ReadonlySet<GlyphName> = new Set([
  "check",
  "cross",
  "circle",
  "star-tiny",
  "heart-tiny",
]);

/** Real emoji artwork for every decorative/pictorial glyph. */
export const GLYPH_EMOJI: Record<PictorialName, string> = {
  flower: "🌼",
  star: "⭐",
  heart: "💗",
  sparkle: "✨",
  tape: "📋",
  film: "🎞️",
  book: "📚",
  leaf: "🍃",
  headphones: "🎧",
  fork: "🍴",
  "ramen-bowl": "🍜",
  gift: "🎁",
  tulip: "🌷",
  pencil: "✏️",
  clapperboard: "🎬",
  lock: "🔒",
};

interface FunctionalArt {
  Icon: LucideIcon;
  strokeWidth: number;
  /** rating/loved markers render solid, like the pills expect */
  filled?: boolean;
}

const FUNCTIONAL_ART: Record<FunctionalName, FunctionalArt> = {
  check: { Icon: Check, strokeWidth: 3.2 },
  cross: { Icon: X, strokeWidth: 3 },
  circle: { Icon: Circle, strokeWidth: 2.8 },
  "star-tiny": { Icon: Star, strokeWidth: 1.5, filled: true },
  "heart-tiny": { Icon: Heart, strokeWidth: 1.5, filled: true },
};

/** Full registry — emoji strings and Lucide components under one roof (tests guard coverage). */
export const GLYPH_ART: Record<GlyphName, string | LucideIcon> = {
  ...GLYPH_EMOJI,
  check: Check,
  cross: X,
  circle: Circle,
  "star-tiny": Star,
  "heart-tiny": Heart,
};

interface GlyphSvgProps {
  name: GlyphName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
}

/** Bare glyph renderer — the shared primitive under LittleIcon/AnimatedSticker/StickerBadge. */
export function GlyphSvg({ name, size = 24, className, style, rotate = 0 }: GlyphSvgProps) {
  const transform = rotate ? `rotate(${rotate}deg)` : undefined;

  if (name in FUNCTIONAL_ART) {
    const { Icon, strokeWidth, filled } = FUNCTIONAL_ART[name as FunctionalName];
    return (
      <Icon
        size={size}
        strokeWidth={strokeWidth}
        fill={filled ? "currentColor" : "none"}
        className={className}
        style={{ transform, ...style }}
        aria-hidden="true"
        focusable="false"
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-grid select-none place-items-center leading-none ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.86),
        transform,
        ...style,
      }}
    >
      {GLYPH_EMOJI[name as PictorialName]}
    </span>
  );
}
