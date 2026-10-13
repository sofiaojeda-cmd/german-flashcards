import Dexie, { type EntityTable } from "dexie";
import type { Card, CEFRLevel, DeckCard, ReviewRecord, UserSettings, UserProgress } from "@/types";

const CEFR_ASC: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1"];

/**
 * Every level up to and including `level`, inlined here so upgrades never have
 * to await a module import inside an IndexedDB transaction.
 */
function levelsUpTo(level: CEFRLevel | undefined): CEFRLevel[] {
  const chosen = level ?? "B1";
  const i = CEFR_ASC.indexOf(chosen);
  return i === -1 ? [chosen] : CEFR_ASC.slice(0, i + 1);
}

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
    //
    // Everything this runs is inline on purpose. Awaiting anything that is not
    // backed by IndexedDB inside an upgrade — a dynamic import, a fetch — lets
    // the transaction close before the writes land, and the migration silently
    // does nothing. An earlier version of this upgrade imported a helper and hit
    // exactly that; v5 below repairs the devices it left behind.
    this.version(3).upgrade((tx) =>
      tx
        .table("settings")
        .toCollection()
        .modify((s: Record<string, unknown>) => {
          if (Array.isArray(s.levels)) return;
          s.levels = levelsUpTo(s.level as CEFRLevel | undefined);
          delete s.level;
        })
    );

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

    // v5: repair settings that v3 was supposed to migrate and did not. Without
    // `levels` the deck silently falls back to B1 only, so these users were
    // getting none of the A1 and A2 content.
    this.version(5).upgrade((tx) =>
      tx
        .table("settings")
        .toCollection()
        .modify((s: Record<string, unknown>) => {
          if (Array.isArray(s.levels) && s.levels.length > 0) return;
          s.levels = levelsUpTo(s.level as CEFRLevel | undefined);
          delete s.level;
        })
    );
  }
}

// Module-level singleton — safe in Next.js because Dexie only runs in the browser
const db = new GermanFlashcardsDB();
export default db;
export type { StoredSettings, StoredProgress };
