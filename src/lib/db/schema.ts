import Dexie, { type EntityTable } from "dexie";
import type { Card, CEFRLevel, DeckCard, ReviewRecord, UserSettings, UserProgress } from "@/types";

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

    // v3: settings.level (one CEFR level) becomes settings.levels (a selection).
    // Existing users keep their level and gain everything below it.
    this.version(3).upgrade(async (tx) => {
      const { cumulativeLevels } = await import("@/lib/levels");
      await tx
        .table("settings")
        .toCollection()
        .modify((s: Record<string, unknown>) => {
          if (Array.isArray(s.levels)) return;
          const old = s.level as CEFRLevel | undefined;
          s.levels = cumulativeLevels(old ?? "B1");
          delete s.level;
        });
    });

    // v4: astrology stops being a category of its own and folds into
    // self-improvement. Cards already in the DB are never re-fetched (seedCards
    // is idempotent), so their topics have to be rewritten here, and the stored
    // topic selection along with them or the cards would land in no deck at all.
    this.version(4).upgrade(async (tx) => {
      const retag = (topics: string[] | undefined) =>
        Array.from(
          new Set((topics ?? []).map((t) => (t === "astrology" ? "self-improvement" : t)))
        );

      await tx
        .table("cards")
        .toCollection()
        .modify((c: { topics?: string[] }) => {
          if (c.topics?.includes("astrology")) c.topics = retag(c.topics);
        });

      await tx
        .table("settings")
        .toCollection()
        .modify((s: { topics?: string[] }) => {
          if (s.topics?.includes("astrology")) s.topics = retag(s.topics);
        });
    });
  }
}

// Module-level singleton — safe in Next.js because Dexie only runs in the browser
const db = new GermanFlashcardsDB();
export default db;
export type { StoredSettings, StoredProgress };
