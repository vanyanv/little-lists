import { GlyphSvg, type GlyphName } from "./glyphs";

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

interface CategoryIconProps {
  id: string;
  size?: number;
  className?: string;
}

/** A category id rendered as its house glyph (unknown ids fall back to a sparkle). */
export function CategoryIcon({ id, size = 16, className }: CategoryIconProps) {
  return <GlyphSvg name={CATEGORY_GLYPH[id] ?? "sparkle"} size={size} className={className} />;
}
