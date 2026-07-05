// Little Lists — onboarding starter catalog + first-steps checklist.
// Client-safe (no server imports): the flow renders these cards, and
// completeOnboardingAction turns the chosen ids into real rows.

import type { List, ListTemplate, Person, StatusId } from "./types";

export interface StarterDemoItem {
  title: string;
  status: StatusId;
  emoji?: string;
}

export interface StarterOption {
  id: string;
  title: string;
  emoji: string;
  template: ListTemplate;
  /** seeded only when the "add a few example ideas" toggle is on */
  demoItems: StarterDemoItem[];
}

export const STARTER_OPTIONS: StarterOption[] = [
  {
    id: "movies",
    title: "Movies I Want to Watch",
    emoji: "🎬",
    template: "movie",
    demoItems: [
      { title: "Coraline", status: "want-to-watch" },
      { title: "Past Lives", status: "want-to-watch" },
      { title: "Pride & Prejudice", status: "want-to-watch" },
    ],
  },
  {
    id: "books",
    title: "Books I Want to Read",
    emoji: "📚",
    template: "book",
    demoItems: [
      { title: "The Secret History", status: "want-to-read" },
      { title: "Before the Coffee Gets Cold", status: "want-to-read" },
      { title: "Piranesi", status: "want-to-read" },
    ],
  },
  {
    id: "foods-hate",
    title: "Foods I Hate",
    emoji: "🚫",
    template: "food",
    demoItems: [
      { title: "Mushrooms", status: "hate", emoji: "🍄" },
      { title: "Olives", status: "hate", emoji: "🫒" },
      { title: "Blue cheese", status: "never-again", emoji: "🧀" },
    ],
  },
  {
    id: "restaurants",
    title: "Restaurants to Try",
    emoji: "🍜",
    template: "place",
    demoItems: [
      { title: "That tiny ramen bar", status: "want-to-go", emoji: "🍜" },
      { title: "The taco truck everyone mentions", status: "want-to-go", emoji: "🌮" },
      { title: "Matcha café downtown", status: "want-to-go", emoji: "🍵" },
    ],
  },
  {
    id: "dates",
    title: "Date Ideas",
    emoji: "🌷",
    template: "date",
    demoItems: [
      { title: "Botanical garden morning", status: "want-to-do", emoji: "🌿" },
      { title: "Bookstore café", status: "want-to-do", emoji: "📚" },
      { title: "Scary movie night", status: "want-to-do", emoji: "🍿" },
    ],
  },
  {
    id: "gifts",
    title: "Gift Ideas",
    emoji: "🎁",
    template: "gift",
    demoItems: [
      { title: "Cute bookmark", status: "idea", emoji: "🔖" },
      { title: "Coffee shop gift card", status: "idea", emoji: "☕" },
      { title: "Book light", status: "idea", emoji: "💡" },
    ],
  },
  {
    id: "obsessions",
    title: "Current Obsessions",
    emoji: "✨",
    template: "custom",
    demoItems: [
      { title: "Matcha lattes", status: "love", emoji: "🍵" },
      { title: "Tiny journals", status: "love", emoji: "📓" },
      { title: "Lo-fi playlists", status: "love", emoji: "🎧" },
    ],
  },
];

/**
 * Rendered in the starter grid alongside STARTER_OPTIONS, but it creates a
 * Person (not a List) — the flow tracks it as its own `includePerson` flag.
 */
export const PERSON_STARTER = {
  id: "person",
  title: "Little things about someone",
  emoji: "🌼",
} as const;

export const MIN_STARTERS = 2;
export const MAX_STARTERS = 4;

/** sessionStorage handoff: onboarding sets it, Home reads-and-clears to toast */
export const ONBOARDING_TOAST_KEY = "ll:onboarding-toast";

/** localStorage flag for the "starter ideas added" banner dismissal */
export const DEMO_BANNER_DISMISSED_KEY = "ll:demo-banner-dismissed";

/** The demo person, kept in step with the landing page's PREVIEW_PERSON. */
export const DEMO_PERSON = {
  name: "Sam",
  emoji: "🌼",
  theme: "butter",
  note: "someone you love to plan little things for",
  /** sectionId matches PERSON_SECTIONS ids in lib/people.ts */
  details: [
    { sectionId: "likes", title: "cozy mysteries" },
    { sectionId: "likes", title: "farmers markets" },
    { sectionId: "dislikes", title: "cilantro" },
    { sectionId: "dislikes", title: "crowded places" },
    { sectionId: "food", title: "oat milk lattes" },
    { sectionId: "movies", title: "Spirited Away" },
    { sectionId: "movies", title: "Paddington" },
    { sectionId: "gifts", title: "ceramic mug" },
    { sectionId: "gifts", title: "knit scarf" },
    { sectionId: "dates", title: "a little hike" },
    { sectionId: "dates", title: "bookstore café" },
    { sectionId: "notes", title: "allergic to peanuts 🥜" },
  ],
} as const;

export interface ChecklistItem {
  id: "first-list" | "first-item" | "first-person-detail";
  label: string;
  done: boolean;
}

/**
 * First-steps checklist, derived purely from what the user already has —
 * no event tracking. Shown on Home until every item is done or dismissed.
 */
export function deriveChecklist(lists: List[], people: Person[]): ChecklistItem[] {
  return [
    {
      id: "first-list",
      label: "Start a little list",
      done: lists.length > 0,
    },
    {
      id: "first-item",
      label: "Add your first little thing",
      done: lists.some((l) => l.items.length > 0),
    },
    {
      id: "first-person-detail",
      label: "Save a little detail about someone",
      done: people.some((p) => p.sections.some((s) => s.entries.length > 0)),
    },
  ];
}
