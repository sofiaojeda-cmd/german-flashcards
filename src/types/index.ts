export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type Gender = "der" | "die" | "das";
export type PartOfSpeech =
  | "noun"
  | "noun (plural)"
  | "noun phrase"
  | "verb"
  | "verb (reflexive)"
  | "verb (modal)"
  | "adjective"
  | "adverb"
  | "conjunction"
  | "preposition"
  | "phrase"
  | "pronoun"
  | "article"
  | "numeral"
  | "interjection";

export type Card = {
  id: string;
  level: CEFRLevel;
  topics: string[];
  front: string;
  back: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  partOfSpeech?: PartOfSpeech;
  gender?: Gender;
};

export type Category = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  file: string;
};

export type VocabStatus = "new" | "learning" | "mastered" | "known";

/** SM-2 review state stored per card in IndexedDB */
export type ReviewRecord = {
  cardId: string;
  easeFactor: number;     // default 2.5, min 1.3
  interval: number;       // days until next review
  repetitions: number;    // consecutive correct reviews
  dueDate: number;        // Unix ms timestamp
  lastReviewed?: number;  // Unix ms timestamp
  /** Mastery state — drives vocabulary stats UI */
  status: VocabStatus;
};

/** Three-state rating used in the review UI */
export type ReviewQuality = "not-yet" | "still-learning" | "known";

/** Per-card active state — separates deck membership from SRS data */
export type DeckCard = {
  cardId: string;
  active: boolean;        // false = topic removed, history preserved
  addedAt: number;        // Unix ms timestamp
};

export type UserSettings = {
  level: CEFRLevel;
  topics: string[];       // category IDs
  dailyGoal: number;      // 10 | 20 | 30 | 50
  livesInBerlin: boolean;
  audioEnabled: boolean;
  onboardingComplete: boolean;
};

export type UserProgress = {
  xp: number;
  level: number;
  streakDays: number;
  lastStreakDate?: string; // ISO date string YYYY-MM-DD
  todayReviewed: number;   // resets each day
  todayDate?: string;      // ISO date string, used to detect day rollover
};
