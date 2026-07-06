import { GlyphSvg, type GlyphName } from "./glyphs";
import { LittleIcon } from "./little-icon";

/**
 * Every category-ish id in the app → its drawn glyph. Ids overlap across
 * ItemType / ListTemplate / person sections / onboarding starters on purpose —
 * one flat record keeps them agreeing.
 */
export const CATEGORY_GLYPH: Record<string, GlyphName> = {
  movie: "clapperboard",
  movies: "clapperboard",
  book: "book",
  books: "book",
  music: "headphones",
  food: "fork",
  "foods-hate": "fork",
  place: "ramen-bowl",
  restaurants: "ramen-bowl",
  custom: "sparkle",
  obsessions: "sparkle",
  gift: "gift",
  gifts: "gift",
  date: "tulip",
  dates: "tulip",
  people: "flower",
  person: "flower",
  likes: "heart",
  dislikes: "cross",
  notes: "pencil",
};

export const CATEGORY_SIZE = { sm: 14, md: 18, lg: 22 } as const;
export type CategoryIconSize = keyof typeof CATEGORY_SIZE | number;

export function resolveCategorySize(size: CategoryIconSize): number {
  return typeof size === "number" ? size : CATEGORY_SIZE[size];
}

interface CategoryIconProps {
  id: string;
  size?: CategoryIconSize;
  /** plain = bare svg (default) · badge = soft paper tile · sticker = die-cut tilt */
  variant?: "plain" | "badge" | "sticker";
  className?: string;
  /** when set, the icon is announced (role="img"); otherwise it stays decorative */
  ariaLabel?: string;
}

/** A category id rendered as its house glyph (unknown ids fall back to a sparkle). */
export function CategoryIcon({
  id,
  size = "md",
  variant = "plain",
  className,
  ariaLabel,
}: CategoryIconProps) {
  const px = resolveCategorySize(size);
  const name: GlyphName = CATEGORY_GLYPH[id] ?? "sparkle";
  const icon =
    variant === "plain" ? (
      <GlyphSvg name={name} size={px} className={className} />
    ) : (
      <LittleIcon name={name} size={px} variant={variant} className={className} />
    );
  if (!ariaLabel) return icon;
  return (
    <span role="img" aria-label={ariaLabel} className="contents">
      {icon}
    </span>
  );
}
