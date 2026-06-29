// Mock search catalog (powers the add-item sheet's movie/book search).
// Real catalog data is intentionally out of scope for now — no TMDB / Books API.

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
