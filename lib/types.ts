// Little Lists — shared types

import type { StickerName } from "@/components/sticker";

export type ThemeColor =
  | "blush"
  | "butter"
  | "sage"
  | "sky"
  | "lavender"
  | "clay";

export const THEME_COLORS: ThemeColor[] = [
  "blush",
  "butter",
  "sage",
  "sky",
  "lavender",
  "clay",
];

export type ItemType = "movie" | "book" | "music" | "food" | "place" | "custom";

/** how a list is browsed; persisted per-list, falls back to its template default */
export type ViewMode = "grid" | "list" | "cozy";

/** the starting point a list was made from — drives view, statuses, copy, sticker */
export type ListTemplate =
  | "movie"
  | "book"
  | "music"
  | "food"
  | "place"
  | "gift"
  | "date"
  | "people"
  | "custom";

export type StatusId =
  | "want-to-watch"
  | "watched"
  | "favorite"
  | "not-for-me"
  | "want-to-read"
  | "reading"
  | "finished"
  | "dnf"
  // music
  | "want-to-listen"
  | "listened"
  | "on-repeat"
  | "love"
  | "hate"
  | "maybe"
  | "need-to-try"
  | "never-again"
  // place
  | "want-to-go"
  | "been-there"
  | "not-again"
  // gift
  | "idea"
  | "bought"
  // date
  | "want-to-do"
  | "planned"
  | "done"
  // people-notes categories (reuse the pill mechanics, neutral tone)
  | "cat-likes"
  | "cat-dislikes"
  | "cat-food"
  | "cat-movies"
  | "cat-gifts"
  | "cat-dates"
  | "cat-notes";

export type StatusTone = "good" | "bad" | "love" | "neutral";

export const STATUS_META: Record<StatusId, { label: string; tone: StatusTone }> = {
  "want-to-watch": { label: "Want to watch", tone: "neutral" },
  watched: { label: "Watched", tone: "good" },
  favorite: { label: "Favorite", tone: "love" },
  "not-for-me": { label: "Not for me", tone: "bad" },
  "want-to-read": { label: "Want to read", tone: "neutral" },
  reading: { label: "Reading", tone: "good" },
  finished: { label: "Finished", tone: "good" },
  dnf: { label: "Didn't finish", tone: "bad" },
  "want-to-listen": { label: "Want to listen", tone: "neutral" },
  listened: { label: "Listened", tone: "good" },
  "on-repeat": { label: "On repeat", tone: "love" },
  love: { label: "Love", tone: "love" },
  hate: { label: "Hate", tone: "bad" },
  maybe: { label: "Maybe", tone: "neutral" },
  "need-to-try": { label: "Need to try", tone: "neutral" },
  "never-again": { label: "Never again", tone: "bad" },
  // place
  "want-to-go": { label: "Want to go", tone: "neutral" },
  "been-there": { label: "Been there", tone: "good" },
  "not-again": { label: "Not again", tone: "bad" },
  // gift
  idea: { label: "Idea", tone: "neutral" },
  bought: { label: "Bought", tone: "good" },
  // date
  "want-to-do": { label: "Want to do", tone: "neutral" },
  planned: { label: "Planned", tone: "neutral" },
  done: { label: "Done", tone: "good" },
  // people-notes categories
  "cat-likes": { label: "Likes", tone: "neutral" },
  "cat-dislikes": { label: "Dislikes", tone: "neutral" },
  "cat-food": { label: "Food", tone: "neutral" },
  "cat-movies": { label: "Movies", tone: "neutral" },
  "cat-gifts": { label: "Gifts", tone: "neutral" },
  "cat-dates": { label: "Date ideas", tone: "neutral" },
  "cat-notes": { label: "Notes", tone: "neutral" },
};

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  /** year for movies, author for books, a place's vibe, etc. */
  subtitle?: string;
  /** real poster/cover/album-art URL from search; falls back to the designed placeholder when absent */
  imageUrl?: string;
  note?: string;
  status?: StatusId;
  rating?: number; // 1..5, optional
  tags?: string[];
  emoji?: string; // food / place / custom
  /** stable seed for the designed placeholder cover; defaults to title */
  seed?: string;
  /** newly added this session — used for the gentle pop-in */
  fresh?: boolean;
}

/** cached enrichment guess for a pocket scrap */
export interface ScrapDetection {
  kind: "movie" | "book" | "music";
  title: string;
  /** year (movie/music) or author (book) */
  subtitle: string;
  imageUrl?: string;
  sourceId: string;
  /** provider fields carried into ListItem.metadata on filing */
  meta: Record<string, unknown>;
}

/** a quick capture waiting in the pocket to be filed into a list */
export interface Scrap {
  id: string;
  text: string;
  /** null = not yet checked; { none: true } = checked, no confident match */
  detection: ScrapDetection | { none: true } | null;
  /** ISO timestamp, for the soft age label */
  createdAt: string;
}

export interface List {
  id: string;
  title: string;
  emoji: string;
  theme: ThemeColor;
  /** the cute noun, e.g. "little films saved" — count is prepended live */
  noun: string;
  /** the item kind this list mostly holds, decides poster-vs-note rendering */
  kind: ItemType;
  /** the starting point this list was made from — drives statuses, copy, defaults */
  template: ListTemplate;
  /** the user's chosen browsing view; falls back to the template default */
  defaultView?: ViewMode;
  /** pinned lists sort to the top of Home and take the hero slot */
  pinned: boolean;
  items: Item[];
}

export type PersonSectionKind = "chips" | "notes";

/** one remembered detail about a person, persisted as a PersonDetail row */
export interface PersonDetailEntry {
  id: string;
  title: string;
  note?: string;
  tags: string[];
}

export interface PersonSection {
  id: string;
  label: string;
  emoji: string;
  kind: PersonSectionKind;
  entries: PersonDetailEntry[];
}

export interface Person {
  id: string;
  name: string;
  emoji: string;
  theme: ThemeColor;
  note: string;
  /** an optional day worth remembering, stored as "MM-DD" (no year) */
  specialDay?: string;
  sections: PersonSection[];
}

export interface Profile {
  name: string;
  handle: string;
  avatarEmoji: string;
  bio: string;
  theme: ThemeColor;
  tags: string[];
  featuredListIds: string[];
  isPublic: boolean;
  /** onboarding seeded example content — drives the "make them yours" banner */
  demoSeeded: boolean;
  /** the Home first-steps checklist was hidden (or shouldn't be shown) */
  checklistDismissed: boolean;
}

export const ITEM_TYPE_META: Record<
  ItemType,
  { label: string; emoji: string; searchable: boolean; aspect: "poster" | "cover" | "square" | "note" }
> = {
  movie: { label: "Movie", emoji: "🎬", searchable: true, aspect: "poster" },
  book: { label: "Book", emoji: "📚", searchable: true, aspect: "cover" },
  music: { label: "Music", emoji: "🎧", searchable: true, aspect: "square" },
  food: { label: "Food", emoji: "🍴", searchable: false, aspect: "note" },
  place: { label: "Place", emoji: "📍", searchable: false, aspect: "note" },
  custom: { label: "Custom", emoji: "✨", searchable: false, aspect: "note" },
};

export interface TemplateMeta {
  /** chip label on list cards and in the template picker */
  label: string;
  /** suggested emoji when this template is chosen */
  emoji: string;
  /** suggested theme color when this template is chosen */
  theme: ThemeColor;
  /** item rendering shape (poster for movie/book, note for the rest) */
  kind: ItemType;
  /** default browsing view for a fresh list of this template */
  defaultView: ViewMode;
  /** one-line description shown under the template rail when this template is picked */
  descriptor: string;
  /** status/category set; first entry is the default */
  statuses: StatusId[];
  /** default cute noun for the count label */
  noun: string;
  /** singular form of `noun` for count === 1 */
  nounSingular: string;
  /** corner scrapbook sticker */
  sticker: StickerName;
  /** movie/book search a catalog; everything else picks an emoji */
  searchable: boolean;
  /** warm heading above the status/category chips in Add Item */
  statusHeading: string;
  /** one optional adaptive field, saved into Item.subtitle */
  extraField?: { label: string; placeholder: string };
  /** contextual Add Item heading */
  addHeading: (listTitle: string) => string;
}

/** the single source of truth per template */
export const TEMPLATE_META: Record<ListTemplate, TemplateMeta> = {
  movie: {
    label: "Movie list",
    emoji: "🎬",
    theme: "blush",
    kind: "movie",
    defaultView: "grid",
    descriptor: "Search real films, collect the posters.",
    statuses: ["want-to-watch", "watched", "favorite", "not-for-me"],
    noun: "little films saved",
    nounSingular: "little film saved",
    sticker: "film",
    searchable: true,
    statusHeading: "how do you feel about it?",
    addHeading: (t) => `Add a movie to ${t}.`,
  },
  book: {
    label: "Book list",
    emoji: "📚",
    theme: "sage",
    kind: "book",
    defaultView: "grid",
    descriptor: "Search real books, keep the covers.",
    statuses: ["want-to-read", "reading", "finished", "dnf", "favorite"],
    noun: "cozy reads waiting",
    nounSingular: "cozy read waiting",
    sticker: "book",
    searchable: true,
    statusHeading: "where are you with it?",
    addHeading: (t) => `Add a book to ${t}.`,
  },
  music: {
    label: "Music list",
    emoji: "🎧",
    theme: "lavender",
    kind: "music",
    defaultView: "grid",
    descriptor: "Search albums and artists, save the art.",
    statuses: ["want-to-listen", "listened", "on-repeat", "favorite", "not-for-me"],
    noun: "tunes on repeat",
    nounSingular: "tune on repeat",
    sticker: "sparkle",
    searchable: true,
    statusHeading: "how's it sound?",
    addHeading: (t) => `Add a song or album to ${t}.`,
  },
  food: {
    label: "Food list",
    emoji: "🍴",
    theme: "clay",
    kind: "food",
    defaultView: "cozy",
    descriptor: "Dishes, snacks, strong opinions.",
    statuses: ["love", "hate", "maybe", "never-again", "need-to-try"],
    noun: "little tastes noted",
    nounSingular: "little taste noted",
    sticker: "leaf",
    searchable: false,
    statusHeading: "how do you feel about it?",
    addHeading: (t) => `Add something to ${t}.`,
  },
  place: {
    label: "Place list",
    emoji: "📍",
    theme: "sky",
    kind: "place",
    defaultView: "cozy",
    descriptor: "Spots to wander into, near or far.",
    statuses: ["want-to-go", "been-there", "favorite", "not-again"],
    noun: "spots to wander",
    nounSingular: "spot to wander",
    sticker: "star",
    searchable: false,
    statusHeading: "have you been?",
    extraField: { label: "Where is it?", placeholder: "neighborhood, city, somewhere new…" },
    addHeading: (t) => `Add a place to ${t}.`,
  },
  gift: {
    label: "Gift ideas",
    emoji: "🎁",
    theme: "blush",
    kind: "custom",
    defaultView: "cozy",
    descriptor: "Ideas for someone, before you forget. Adds a who's-it-for.",
    statuses: ["idea", "bought", "maybe", "favorite"],
    noun: "thoughtful little ideas",
    nounSingular: "thoughtful little idea",
    sticker: "heart",
    searchable: false,
    statusHeading: "where's it at?",
    extraField: { label: "Who's it for?", placeholder: "Mom, a friend, future me…" },
    addHeading: (t) => `Add a gift idea to ${t}.`,
  },
  date: {
    label: "Date ideas",
    emoji: "🌷",
    theme: "lavender",
    kind: "custom",
    defaultView: "cozy",
    descriptor: "Little plans worth looking forward to.",
    statuses: ["want-to-do", "planned", "done", "favorite"],
    noun: "sweet little plans",
    nounSingular: "sweet little plan",
    sticker: "flower",
    searchable: false,
    statusHeading: "what's the plan?",
    extraField: { label: "Where?", placeholder: "home, the city, somewhere new…" },
    addHeading: (t) => `Add a date idea to ${t}.`,
  },
  people: {
    label: "People notes",
    emoji: "🌼",
    theme: "butter",
    kind: "custom",
    defaultView: "cozy",
    descriptor: "The details that make someone feel seen.",
    statuses: ["cat-likes", "cat-dislikes", "cat-food", "cat-movies", "cat-gifts", "cat-dates", "cat-notes"],
    noun: "little details remembered",
    nounSingular: "little detail remembered",
    sticker: "flower",
    searchable: false,
    statusHeading: "which little corner?",
    addHeading: (t) => `Add a little detail to ${t}.`,
  },
  custom: {
    label: "Custom list",
    emoji: "✨",
    theme: "lavender",
    kind: "custom",
    defaultView: "cozy",
    descriptor: "Any shape you like. Start from a blank page.",
    statuses: ["love", "maybe", "favorite", "need-to-try"],
    noun: "little things",
    nounSingular: "little thing",
    sticker: "sparkle",
    searchable: false,
    statusHeading: "how do you feel about it?",
    addHeading: () => "Add something worth remembering.",
  },
};

/** the status/category set a list offers, derived from its template */
export function statusesForList(list: Pick<List, "template">): StatusId[] {
  return TEMPLATE_META[list.template].statuses;
}
