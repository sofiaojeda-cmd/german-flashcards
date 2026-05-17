import Dexie, { type EntityTable } from "dexie";
import type { Card, DeckCard, ReviewRecord, UserSettings, UserProgress } from "@/types";

// Single-row tables use a fixed primary key "user"
type StoredSettings = UserSettings & { id: "user" };
type StoredProgress = UserProgress & { id: "user" };

class GermanFlashcardsDB extends Dexie {
  cards!: EntityTable<Card, "id">;
  deckCards!: EntityTable<DeckCard, "cardId">;
  reviewRecords!: EntityTable<ReviewRecord, "cardId">;
  settings!: EntityTable<StoredSettings, "id">;
  progress!: EntityTable<StoredProgress, "id">;

  constructor() {
    super("GermanFlashcards");

    this.version(1).stores({
      // *topics = multi-entry index so we can query by individual topic string
      cards: "id, level, *topics, gender, partOfSpeech",
      deckCards: "cardId, active, addedAt",
      reviewRecords: "cardId, dueDate, lastReviewed",
      settings: "id",
      progress: "id",
    });

    // v2: index status for vocab stats queries
    this.version(2).stores({
      reviewRecords: "cardId, dueDate, lastReviewed, status",
    });
  }
}

// Module-level singleton — safe in Next.js because Dexie only runs in the browser
const db = new GermanFlashcardsDB();
export default db;
export type { StoredSettings, StoredProgress };
