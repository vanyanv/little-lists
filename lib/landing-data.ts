// Static, presentational sample data for the public landing page preview.
// Typed against the real domain models so the marketing preview stays honest
// to what the app actually renders. Never persisted, never fetched.

import type { List, Person } from "./types";

export const PREVIEW_MOVIES: List = {
  id: "preview-movies",
  title: "Movies I Want to Watch",
  emoji: "🎬",
  theme: "blush",
  noun: "little films saved",
  kind: "movie",
  template: "movie",
  items: [
    { id: "m1", type: "movie", title: "Past Lives", seed: "Past Lives", status: "want-to-watch" },
    { id: "m2", type: "movie", title: "Paddington", seed: "Paddington", status: "want-to-watch" },
    { id: "m3", type: "movie", title: "Spirited Away", seed: "Spirited Away", status: "favorite" },
    { id: "m4", type: "movie", title: "Lady Bird", seed: "Lady Bird", status: "watched" },
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
  items: [
    { id: "g1", type: "custom", title: "Film camera", emoji: "📷", status: "idea" },
    { id: "g2", type: "custom", title: "Ceramic mug", emoji: "☕", status: "idea" },
    { id: "g3", type: "custom", title: "Knit scarf", emoji: "🧣", status: "bought" },
  ],
};

export const PREVIEW_PERSON: Person = {
  id: "preview-person",
  name: "Sam",
  emoji: "🌼",
  theme: "butter",
  note: "someone you love to plan little things for",
  sections: [
    { id: "coffee", label: "oat milk latte", emoji: "☕", kind: "chips", entries: [{ id: "e1", title: "oat milk latte", tags: [] }] },
    { id: "reading", label: "loves cozy mysteries", emoji: "📚", kind: "chips", entries: [{ id: "e2", title: "loves cozy mysteries", tags: [] }] },
    { id: "allergy", label: "allergic to peanuts", emoji: "🥜", kind: "chips", entries: [{ id: "e3", title: "allergic to peanuts", tags: [] }] },
    { id: "flowers", label: "favorite flower: tulips", emoji: "🌷", kind: "chips", entries: [{ id: "e4", title: "favorite flower: tulips", tags: [] }] },
    { id: "dates", label: "always up for a hike", emoji: "🥾", kind: "chips", entries: [{ id: "e5", title: "always up for a hike", tags: [] }] },
  ],
};
