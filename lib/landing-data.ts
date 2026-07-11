// Static, presentational sample data for the public landing page preview.
// Typed against the real domain models so the marketing preview stays honest
// to what the app actually renders. Never persisted, never fetched.

import type { List, Person } from "./types";
import { DEMO_NAMES } from "./demo-names";

export const PREVIEW_MOVIES: List = {
  id: "preview-movies",
  title: "Movies I Want to Watch",
  emoji: "🎬",
  theme: "blush",
  noun: "little films saved",
  kind: "movie",
  template: "movie",
  pinned: false,
  // first-party abstract cover art (public/posters/*) — drawn for this project,
  // so the preview can show real poster images without licensing anyone's key art
  items: [
    { id: "m1", type: "movie", title: "Past Lives", seed: "Past Lives", status: "want-to-watch", subtitle: "2023", imageUrl: "/posters/past-lives.svg" },
    { id: "m2", type: "movie", title: "Paddington", seed: "Paddington", status: "want-to-watch", subtitle: "2014", imageUrl: "/posters/paddington.svg" },
    { id: "m3", type: "movie", title: "Spirited Away", seed: "Spirited Away", status: "favorite", subtitle: "2001", imageUrl: "/posters/spirited-away.svg" },
    { id: "m4", type: "movie", title: "Lady Bird", seed: "Lady Bird", status: "watched", subtitle: "2017", imageUrl: "/posters/lady-bird.svg" },
    { id: "m5", type: "movie", title: "Amélie", seed: "Amélie", status: "favorite", subtitle: "2001" },
    { id: "m6", type: "movie", title: "Little Women", seed: "Little Women", status: "want-to-watch", subtitle: "2019" },
  ],
};

export const PREVIEW_BOOKS: List = {
  id: "preview-books",
  title: "Books I Want to Read",
  emoji: "📚",
  theme: "lavender",
  noun: "little stories waiting",
  kind: "book",
  template: "book",
  pinned: false,
  items: [
    { id: "b1", type: "book", title: "Piranesi", seed: "Piranesi", status: "want-to-read", imageUrl: "/posters/piranesi.svg" },
    { id: "b2", type: "book", title: "The House in the Cerulean Sea", seed: "Cerulean Sea", status: "reading", imageUrl: "/posters/cerulean-sea.svg" },
    { id: "b3", type: "book", title: "Howl's Moving Castle", seed: "Howl's Moving Castle", status: "favorite", imageUrl: "/posters/howls-castle.svg" },
  ],
};

export const PREVIEW_FOODS: List = {
  id: "preview-foods",
  title: "Foods I Hate",
  emoji: "🍴",
  theme: "clay",
  noun: "little tastes noted",
  kind: "food",
  template: "food",
  pinned: false,
  items: [
    { id: "f1", type: "food", title: "Cilantro", emoji: "🌿", status: "hate" },
    { id: "f2", type: "food", title: "Black licorice", emoji: "🍬", status: "hate" },
    { id: "f3", type: "food", title: "Mushrooms", emoji: "🍄", status: "never-again" },
  ],
};

export const PREVIEW_GIFTS: List = {
  id: "preview-gifts",
  title: "Gift Ideas",
  emoji: "🎁",
  theme: "sage",
  noun: "thoughtful little ideas",
  kind: "custom",
  template: "gift",
  pinned: false,
  items: [
    { id: "g1", type: "custom", title: "Film camera", emoji: "📷", status: "idea" },
    { id: "g2", type: "custom", title: "Ceramic mug", emoji: "☕", status: "idea" },
    { id: "g3", type: "custom", title: "Knit scarf", emoji: "🧣", status: "bought" },
  ],
};

// The use-cases showcase gets its own titles so no poster repeats what the
// hero's phone preview already shows. No bundled art on purpose: real covers
// arrive at build time via landing-art, and Cover's PlaceholderPoster carries
// any miss.
export const SHOWCASE_MOVIES: List = {
  id: "showcase-movies",
  title: "Movies to Watch",
  emoji: "🎬",
  theme: "blush",
  noun: "little films saved",
  kind: "movie",
  template: "movie",
  pinned: false,
  items: [
    { id: "sm1", type: "movie", title: "Coraline", seed: "Coraline", status: "want-to-watch", subtitle: "2009" },
    { id: "sm2", type: "movie", title: "La La Land", seed: "La La Land", status: "want-to-watch", subtitle: "2016" },
    { id: "sm3", type: "movie", title: "Pride & Prejudice", seed: "Pride & Prejudice", status: "favorite", subtitle: "2005" },
    { id: "sm4", type: "movie", title: "Ratatouille", seed: "Ratatouille", status: "want-to-watch", subtitle: "2007" },
  ],
};

export const SHOWCASE_BOOKS: List = {
  id: "showcase-books",
  title: "Books to Read",
  emoji: "📚",
  theme: "lavender",
  noun: "little stories waiting",
  kind: "book",
  template: "book",
  pinned: false,
  items: [
    { id: "sb1", type: "book", title: "The Midnight Library", seed: "The Midnight Library", status: "want-to-read" },
    { id: "sb2", type: "book", title: "Before the Coffee Gets Cold", seed: "Before the Coffee Gets Cold", status: "want-to-read" },
    { id: "sb3", type: "book", title: "Tomorrow, and Tomorrow, and Tomorrow", seed: "Tomorrow Tomorrow", status: "reading" },
  ],
};

// The "See it your way" demo list gets a third set of titles so its posters
// never repeat the hero preview or the showcase. No bundled art on purpose:
// real covers arrive at build time via landing-art, and Cover's
// PlaceholderPoster carries any miss.
export const DEMO_VIEW_MOVIES: List = {
  id: "demo-view-movies",
  title: "Movies to Watch",
  emoji: "🎬",
  theme: "blush",
  noun: "little films saved",
  kind: "movie",
  template: "movie",
  pinned: false,
  items: [
    { id: "dv1", type: "movie", title: "The Grand Budapest Hotel", seed: "The Grand Budapest Hotel", status: "want-to-watch", subtitle: "2014" },
    { id: "dv2", type: "movie", title: "My Neighbor Totoro", seed: "My Neighbor Totoro", status: "favorite", subtitle: "1988" },
    { id: "dv3", type: "movie", title: "Little Miss Sunshine", seed: "Little Miss Sunshine", status: "watched", subtitle: "2006" },
    { id: "dv4", type: "movie", title: "The Princess Bride", seed: "The Princess Bride", status: "want-to-watch", subtitle: "1987" },
  ],
};

// Jotted-note scraps for the showcase's people teaser — kept distinct from
// PREVIEW_PERSON.sections so the deeper PeopleMemory section below never
// repeats a line the teaser already used.
export const SHOWCASE_PEOPLE_SCRAPS = [
  "her coffee order: oat flat white",
  "her ring size, just in case",
  "mentioned wanting a book light",
  "that ramen place downtown",
];

export const SHOWCASE_GIFT_SCRAPS = ["book light", "coffee shop gift card", "cute bookmark"];

// Section ids double as CategoryIcon keys, exactly like the real person card —
// so each little detail gets its drawn glyph (clapperboard, book, fork…).
// Keep one consistent sample person across the landing story so recommendations,
// people notes, and gift ideas feel connected instead of randomly generated.
export const PREVIEW_PERSON: Person = {
  id: "preview-person",
  name: DEMO_NAMES[0],
  emoji: "🌼",
  theme: "butter",
  note: "someone you love to plan little things for",
  sections: [
    { id: "movies", label: "loves horror movies", emoji: "🎬", kind: "chips", entries: [{ id: "e1", title: "loves horror movies", tags: [] }] },
    { id: "books", label: "cozy books on rainy days", emoji: "📚", kind: "chips", entries: [{ id: "e2", title: "cozy books on rainy days", tags: [] }] },
    { id: "food", label: "Puerto Rican food", emoji: "🍽️", kind: "chips", entries: [{ id: "e3", title: "Puerto Rican food", tags: [] }] },
    { id: "dislikes", label: "no mushrooms, ever", emoji: "🍄", kind: "chips", entries: [{ id: "e4", title: "no mushrooms, ever", tags: [] }] },
    { id: "dates", label: "wants to see Huntington Gardens", emoji: "🌷", kind: "chips", entries: [{ id: "e5", title: "wants to see Huntington Gardens", tags: [] }] },
  ],
};
