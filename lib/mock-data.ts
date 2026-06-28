import type { Item, List, Person, Profile } from "./types";

// ── Lists ──────────────────────────────────────────────────────
export const MOCK_LISTS: List[] = [
  {
    id: "movies",
    title: "Movies I Want to Watch",
    emoji: "🎬",
    theme: "blush",
    noun: "little films saved",
    kind: "movie",
    template: "movie",
    items: [
      { id: "m1", type: "movie", title: "Coraline", subtitle: "2009", status: "want-to-watch", note: "save for a spooky-cozy night 🕯️", tags: ["spooky"] },
      { id: "m2", type: "movie", title: "Pride & Prejudice", subtitle: "2005", status: "favorite", rating: 5, note: "the hand flex. that's it." },
      { id: "m3", type: "movie", title: "The Notebook", subtitle: "2004", status: "want-to-watch" },
      { id: "m4", type: "movie", title: "Past Lives", subtitle: "2023", status: "watched", rating: 5, note: "cried on the sidewalk after." },
      { id: "m5", type: "movie", title: "La La Land", subtitle: "2016", status: "watched", rating: 4 },
      { id: "m6", type: "movie", title: "In the Mood for Love", subtitle: "2000", status: "want-to-watch", tags: ["slow", "beautiful"] },
    ],
  },
  {
    id: "books",
    title: "Books I Want to Read",
    emoji: "📚",
    theme: "sage",
    noun: "cozy reads waiting",
    kind: "book",
    template: "book",
    items: [
      { id: "b1", type: "book", title: "Normal People", subtitle: "Sally Rooney", status: "reading", note: "halfway and already wrecked." },
      { id: "b2", type: "book", title: "The Song of Achilles", subtitle: "Madeline Miller", status: "want-to-read", tags: ["will cry"] },
      { id: "b3", type: "book", title: "Tomorrow, and Tomorrow, and Tomorrow", subtitle: "Gabrielle Zevin", status: "finished", rating: 5 },
      { id: "b4", type: "book", title: "Alone With You in the Ether", subtitle: "Olivie Blake", status: "want-to-read" },
      { id: "b5", type: "book", title: "Cleopatra and Frankenstein", subtitle: "Coco Mellors", status: "want-to-read", note: "recommended by Maddie 🌷" },
    ],
  },
  {
    id: "foods",
    title: "Foods I Hate",
    emoji: "🚫",
    theme: "clay",
    noun: "absolutely nots",
    kind: "food",
    template: "food",
    items: [
      { id: "f1", type: "food", title: "Mushrooms", emoji: "🍄", status: "hate", note: "it's a texture thing. truly." },
      { id: "f2", type: "food", title: "Olives", emoji: "🫒", status: "hate" },
      { id: "f3", type: "food", title: "Cilantro", emoji: "🌿", status: "never-again", note: "tastes like soap, sorry." },
      { id: "f4", type: "food", title: "Seafood", emoji: "🦐", status: "never-again" },
      { id: "f5", type: "food", title: "Blue cheese", emoji: "🧀", status: "hate" },
    ],
  },
  {
    id: "restaurants",
    title: "Restaurants to Try",
    emoji: "🍜",
    theme: "butter",
    noun: "spots to wander into",
    kind: "place",
    template: "place",
    items: [
      { id: "p1", type: "place", title: "The Puerto Rican spot", emoji: "🇵🇷", subtitle: "downtown", status: "want-to-go", note: "Maddie swears by the mofongo." },
      { id: "p2", type: "place", title: "Bookstore café", emoji: "📖", subtitle: "Sunday mornings", status: "want-to-go" },
      { id: "p3", type: "place", title: "Huntington Gardens café", emoji: "🌿", subtitle: "tea room", status: "favorite", rating: 5 },
      { id: "p4", type: "place", title: "Late-night ramen", emoji: "🍜", subtitle: "open till 2am", status: "been-there" },
      { id: "p5", type: "place", title: "Cozy wine bar", emoji: "🍷", subtitle: "candlelit", status: "want-to-go" },
    ],
  },
  {
    id: "dates",
    title: "Date Ideas",
    emoji: "🌷",
    theme: "lavender",
    noun: "date ideas tucked away",
    kind: "custom",
    template: "date",
    items: [
      { id: "d1", type: "custom", title: "Huntington Gardens stroll", emoji: "🌿", subtitle: "the gardens", status: "want-to-do", note: "go early, before it's warm." },
      { id: "d2", type: "custom", title: "Bookstore café afternoon", emoji: "📖", status: "want-to-do" },
      { id: "d3", type: "custom", title: "Make pasta from scratch", emoji: "🍝", status: "done" },
      { id: "d4", type: "custom", title: "Sunset drive + a shared playlist", emoji: "🎶", status: "favorite" },
      { id: "d5", type: "custom", title: "Tiny art museum, then snacks", emoji: "🖼️", status: "planned" },
    ],
  },
  {
    id: "gifts",
    title: "Gift Ideas",
    emoji: "🎁",
    theme: "sky",
    noun: "tiny gift clues",
    kind: "custom",
    template: "gift",
    items: [
      { id: "g1", type: "custom", title: "A really cute bookmark", emoji: "🔖", subtitle: "For Maddie", status: "idea", tags: ["Maddie"], note: "she keeps losing hers." },
      { id: "g2", type: "custom", title: "A warm book light", emoji: "💡", subtitle: "For Maddie", status: "idea", tags: ["Maddie"] },
      { id: "g3", type: "custom", title: "Ceremonial matcha set", emoji: "🍵", subtitle: "For Mom", status: "bought", tags: ["Mom"] },
      { id: "g4", type: "custom", title: "Vinyl cleaning kit", emoji: "🎧", subtitle: "For Chris", status: "maybe", tags: ["Chris"] },
      { id: "g5", type: "custom", title: "Pressed-flower frame", emoji: "🌸", status: "idea" },
    ],
  },
  {
    id: "obsessions",
    title: "Current Obsessions",
    emoji: "✨",
    theme: "blush",
    noun: "little things lately",
    kind: "custom",
    template: "custom",
    items: [
      { id: "o1", type: "custom", title: "Matcha, in everything", emoji: "🍵", status: "love" },
      { id: "o2", type: "custom", title: "Coastal-grandma playlists", emoji: "🎧", status: "love" },
      { id: "o3", type: "custom", title: "Cozy horror movies", emoji: "👻", status: "favorite" },
      { id: "o4", type: "custom", title: "Cinnamon oat lattes", emoji: "☕" },
    ],
  },
  {
    id: "maddie-likes",
    title: "Things Maddie Likes",
    emoji: "🌼",
    theme: "butter",
    noun: "little details remembered",
    kind: "custom",
    template: "people",
    items: [
      { id: "ml1", type: "custom", title: "Horror movies, the cozy kind", emoji: "👻", status: "cat-likes" },
      { id: "ml2", type: "custom", title: "Mushrooms", emoji: "🍄", status: "cat-dislikes", note: "texture thing, not allergic." },
      { id: "ml3", type: "custom", title: "Puerto Rican food", emoji: "🍴", status: "cat-food" },
      { id: "ml4", type: "custom", title: "Coraline", emoji: "🎬", status: "cat-movies" },
      { id: "ml5", type: "custom", title: "A really cute bookmark", emoji: "🔖", status: "cat-gifts" },
      { id: "ml6", type: "custom", title: "Bookstore café afternoon", emoji: "📖", status: "cat-dates" },
      { id: "ml7", type: "custom", title: "Give Pepper a treat 🐾", emoji: "📝", status: "cat-notes" },
    ],
  },
  {
    id: "apartment",
    title: "Apartment Ideas",
    emoji: "🛋️",
    theme: "sage",
    noun: "little things for home",
    kind: "custom",
    template: "custom",
    items: [
      { id: "ap1", type: "custom", title: "A warm reading nook", emoji: "🛋️", status: "love" },
      { id: "ap2", type: "custom", title: "Tiny herb garden on the sill", emoji: "🌿", status: "need-to-try" },
      { id: "ap3", type: "custom", title: "Paper lantern string lights", emoji: "🏮", status: "favorite" },
      { id: "ap4", type: "custom", title: "A squishy oversized armchair", emoji: "🪑", status: "maybe" },
    ],
  },
];

// ── Mock search catalog (powers the add-item sheet) ─────────────
export interface SearchResult {
  title: string;
  subtitle: string; // year or author
  seed: string;
}

export const MOVIE_CATALOG: SearchResult[] = [
  { title: "Coraline", subtitle: "2009", seed: "coraline" },
  { title: "Pride & Prejudice", subtitle: "2005", seed: "pride" },
  { title: "The Notebook", subtitle: "2004", seed: "notebook" },
  { title: "Past Lives", subtitle: "2023", seed: "pastlives" },
  { title: "La La Land", subtitle: "2016", seed: "lalaland" },
  { title: "In the Mood for Love", subtitle: "2000", seed: "mood" },
  { title: "Little Women", subtitle: "2019", seed: "littlewomen" },
  { title: "Spirited Away", subtitle: "2001", seed: "spirited" },
  { title: "Call Me by Your Name", subtitle: "2017", seed: "cmbyn" },
  { title: "Everything Everywhere All at Once", subtitle: "2022", seed: "eeaao" },
];

export const BOOK_CATALOG: SearchResult[] = [
  { title: "Normal People", subtitle: "Sally Rooney", seed: "normalpeople" },
  { title: "The Song of Achilles", subtitle: "Madeline Miller", seed: "achilles" },
  { title: "Tomorrow, and Tomorrow, and Tomorrow", subtitle: "Gabrielle Zevin", seed: "tomorrow" },
  { title: "Alone With You in the Ether", subtitle: "Olivie Blake", seed: "ether" },
  { title: "Cleopatra and Frankenstein", subtitle: "Coco Mellors", seed: "cleo" },
  { title: "Circe", subtitle: "Madeline Miller", seed: "circe" },
  { title: "Beach Read", subtitle: "Emily Henry", seed: "beachread" },
  { title: "A Little Life", subtitle: "Hanya Yanagihara", seed: "littlelife" },
];

// ── People ─────────────────────────────────────────────────────
export const MOCK_PEOPLE: Person[] = [
  {
    id: "maddie",
    name: "Maddie",
    emoji: "🌷",
    theme: "blush",
    note: "horror movies, cozy books, Puerto Rican food.",
    sections: [
      { id: "likes", label: "Likes", emoji: "💛", kind: "chips", entries: ["horror movies", "cozy bookstores", "quiet nights in"] },
      { id: "dislikes", label: "Dislikes", emoji: "🙅", kind: "chips", entries: ["mushrooms", "loud bars"] },
      { id: "food", label: "Food", emoji: "🍴", kind: "chips", entries: ["Puerto Rican food", "matcha", "anything cinnamon"] },
      { id: "movies", label: "Movies to watch together", emoji: "🎬", kind: "chips", entries: ["Coraline", "Pride & Prejudice"] },
      { id: "books", label: "Books they mentioned", emoji: "📚", kind: "chips", entries: ["The Song of Achilles", "Normal People"] },
      { id: "gifts", label: "Gift ideas", emoji: "🎁", kind: "chips", entries: ["a really cute bookmark", "a warm book light"] },
      { id: "dates", label: "Date ideas", emoji: "🌷", kind: "chips", entries: ["Huntington Gardens", "bookstore café"] },
      { id: "notes", label: "Notes", emoji: "📝", kind: "notes", entries: ["Give Pepper a treat 🐾", "Picky about mushrooms, not allergic, just no."] },
    ],
  },
  {
    id: "chris",
    name: "Chris",
    emoji: "🍔",
    theme: "butter",
    note: "smash burgers, sci-fi, terrible puns.",
    sections: [
      { id: "likes", label: "Likes", emoji: "💛", kind: "chips", entries: ["smash burgers", "sci-fi films", "vinyl crates"] },
      { id: "dislikes", label: "Dislikes", emoji: "🙅", kind: "chips", entries: ["cilantro", "mushy texture"] },
      { id: "food", label: "Food", emoji: "🍴", kind: "chips", entries: ["double cheeseburgers", "spicy ramen"] },
      { id: "movies", label: "Movies to watch together", emoji: "🎬", kind: "chips", entries: ["Dune", "Past Lives"] },
      { id: "gifts", label: "Gift ideas", emoji: "🎁", kind: "chips", entries: ["vinyl cleaning kit", "a weird hot sauce"] },
      { id: "notes", label: "Notes", emoji: "📝", kind: "notes", entries: ["Birthday in March 🎂", "Will quote the movie the whole time."] },
    ],
  },
  {
    id: "mom",
    name: "Mom",
    emoji: "☕",
    theme: "sage",
    note: "strong coffee, her garden, long calls.",
    sections: [
      { id: "likes", label: "Likes", emoji: "💛", kind: "chips", entries: ["morning coffee", "her tomato garden", "gospel radio"] },
      { id: "dislikes", label: "Dislikes", emoji: "🙅", kind: "chips", entries: ["when I don't call back"] },
      { id: "food", label: "Food", emoji: "🍴", kind: "chips", entries: ["flan", "very strong coffee"] },
      { id: "gifts", label: "Gift ideas", emoji: "🎁", kind: "chips", entries: ["a pretty ceramic mug", "heirloom seed packets"] },
      { id: "notes", label: "Notes", emoji: "📝", kind: "notes", entries: ["Loves a handwritten card more than anything ✉️"] },
    ],
  },
  {
    id: "best-friend",
    name: "Best Friend",
    emoji: "🎧",
    theme: "lavender",
    note: "indie shows, late drives, oversharing.",
    sections: [
      { id: "likes", label: "Likes", emoji: "💛", kind: "chips", entries: ["indie shows", "late-night drives", "thrifting"] },
      { id: "food", label: "Food", emoji: "🍴", kind: "chips", entries: ["late-night tacos", "boba, always"] },
      { id: "movies", label: "Movies to watch together", emoji: "🎬", kind: "chips", entries: ["La La Land", "Everything Everywhere"] },
      { id: "gifts", label: "Gift ideas", emoji: "🎁", kind: "chips", entries: ["concert tickets", "a good tote bag"] },
      { id: "dates", label: "Hang ideas", emoji: "🌷", kind: "chips", entries: ["record store crawl", "drive with no destination"] },
      { id: "notes", label: "Notes", emoji: "📝", kind: "notes", entries: ["Knows every lyric. Let them sing 🎤"] },
    ],
  },
];

// ── Profile ────────────────────────────────────────────────────
export const MOCK_PROFILE: Profile = {
  name: "Maddie",
  handle: "@maddie",
  avatarEmoji: "🌷",
  bio: "horror movies, cozy books, no mushrooms ever.",
  theme: "blush",
  tags: ["horror movies", "cozy reads", "no mushrooms", "Puerto Rican food", "bookstore dates"],
  featuredListIds: ["movies", "books", "obsessions"],
  isPublic: true,
};

export function findList(lists: List[], id: string): List | undefined {
  return lists.find((l) => l.id === id);
}

export function findPerson(people: Person[], id: string): Person | undefined {
  return people.find((p) => p.id === id);
}

export function emptyItem(): Item[] {
  return [];
}
