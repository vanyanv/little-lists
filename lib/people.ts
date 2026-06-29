import type { PersonSectionKind } from "./types";

/**
 * The fixed little corners we remember a person by. `db` mirrors the
 * PersonDetailSection enum values in schema.prisma (kept as plain strings so
 * this module stays safe to import from client components — the server casts
 * them to the enum). `id` matches the UI section ids the components already use.
 */
export interface PersonSectionDef {
  id: string;
  label: string;
  emoji: string;
  kind: PersonSectionKind;
  /** PersonDetailSection enum value in the database */
  db: "likes" | "dislikes" | "food" | "movies" | "books" | "gifts" | "date_ideas" | "notes";
}

export const PERSON_SECTIONS: PersonSectionDef[] = [
  { id: "likes", label: "Likes", emoji: "💛", kind: "chips", db: "likes" },
  { id: "dislikes", label: "Dislikes", emoji: "🙅", kind: "chips", db: "dislikes" },
  { id: "food", label: "Food", emoji: "🍴", kind: "chips", db: "food" },
  { id: "movies", label: "Movies to watch together", emoji: "🎬", kind: "chips", db: "movies" },
  { id: "books", label: "Books they mentioned", emoji: "📚", kind: "chips", db: "books" },
  { id: "gifts", label: "Gift ideas", emoji: "🎁", kind: "chips", db: "gifts" },
  { id: "dates", label: "Date ideas", emoji: "🌷", kind: "chips", db: "date_ideas" },
  { id: "notes", label: "Notes", emoji: "📝", kind: "notes", db: "notes" },
];

/** db enum value → UI section id (e.g. "date_ideas" → "dates") */
export const DB_SECTION_TO_ID: Record<PersonSectionDef["db"], string> = Object.fromEntries(
  PERSON_SECTIONS.map((s) => [s.db, s.id])
) as Record<PersonSectionDef["db"], string>;

/** UI section id → db enum value (e.g. "dates" → "date_ideas") */
export const ID_TO_DB_SECTION: Record<string, PersonSectionDef["db"]> = Object.fromEntries(
  PERSON_SECTIONS.map((s) => [s.id, s.db])
);
