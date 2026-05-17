import db from "./schema";
import type { Card, Category, UserSettings } from "@/types";

const API_BASE = "/api/cards";

async function fetchCardFile(filename: string): Promise<Card[]> {
  const res = await fetch(`${API_BASE}/${filename}`);
  if (!res.ok) return [];
  return res.json();
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories.json`);
  if (!res.ok) throw new Error("Failed to load categories.json");
  const data = await res.json();
  // categories.json shape: { categories: Category[] }
  return data.categories as Category[];
}

/** Load and merge base + extra cards for a single category. */
async function loadCategoryCards(categoryId: string, baseFile: string): Promise<Card[]> {
  const [base, extra] = await Promise.all([
    fetchCardFile(baseFile),
    // Extra file is inferred; berlin has none — 404 returns []
    fetchCardFile(`b1-${categoryId}-extra.json`),
  ]);
  return [...base, ...extra];
}

export type SeedOptions = {
  /** Category IDs to seed. Pass undefined to seed all categories. */
  topics?: string[];
  /** Whether seeded deckCards are active. Defaults to true.
   *  Pass false when backfilling dormant topics that the user hasn't picked yet. */
  active?: boolean;
};

/**
 * Seeds card data into IndexedDB on first launch (or when topics are added).
 * Idempotent — safe to call multiple times; existing records are not overwritten.
 *
 * For v1 level filtering: all 470 cards are B1. We seed all and apply a
 * "above your level" notice in the UI rather than excluding cards.
 */
export async function seedCards(options: SeedOptions = {}): Promise<{ seeded: number }> {
  const categories = await fetchCategories();

  const targetCategories = options.topics
    ? categories.filter((c) => options.topics!.includes(c.id))
    : categories;

  // Fetch all card files in parallel
  const cardArrays = await Promise.all(
    targetCategories.map((cat) => loadCategoryCards(cat.id, cat.file))
  );

  const allCards = cardArrays.flat();

  // Deduplicate by id (extra files shouldn't overlap but guard anyway)
  const uniqueCards = Array.from(new Map(allCards.map((c) => [c.id, c])).values());

  // Only insert cards not already in the DB
  const existingIds = new Set(
    await db.cards.where("id").anyOf(uniqueCards.map((c) => c.id)).primaryKeys()
  );
  const newCards = uniqueCards.filter((c) => !existingIds.has(c.id));

  if (newCards.length === 0) return { seeded: 0 };

  const now = Date.now();

  await db.transaction("rw", db.cards, db.deckCards, db.reviewRecords, async () => {
    // Insert card definitions
    await db.cards.bulkAdd(newCards);

    // Mark all new cards as active (or inactive for backfill seeding)
    await db.deckCards.bulkAdd(
      newCards.map((c) => ({ cardId: c.id, active: options.active ?? true, addedAt: now }))
    );

    // Create initial SM-2 state — dueDate = now so cards appear immediately
    await db.reviewRecords.bulkAdd(
      newCards.map((c) => ({
        cardId: c.id,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        dueDate: now,
        status: "new" as const,
      }))
    );
  });

  return { seeded: newCards.length };
}

/**
 * Deactivates cards belonging to removed topics without deleting review history.
 * Called when the user removes a topic in Settings.
 */
export async function deactivateTopicCards(topicId: string): Promise<void> {
  const cards = await db.cards.where("topics").equals(topicId).toArray();
  const cardIds = cards.map((c) => c.id);
  await db.deckCards
    .where("cardId")
    .anyOf(cardIds)
    .modify({ active: false });
}

/**
 * Reactivates cards for a topic that was re-added in Settings.
 * For cards not yet in the DB (new topic), calls seedCards instead.
 */
export async function activateTopicCards(topicId: string): Promise<void> {
  const cards = await db.cards.where("topics").equals(topicId).toArray();

  if (cards.length === 0) {
    // Topic has never been seeded — seed it now
    await seedCards({ topics: [topicId] });
    return;
  }

  const cardIds = cards.map((c) => c.id);
  await db.deckCards
    .where("cardId")
    .anyOf(cardIds)
    .modify({ active: true });
}

/** Initialize default settings and progress if they don't exist. */
export async function initUserData(settings: UserSettings): Promise<void> {
  await db.transaction("rw", db.settings, db.progress, async () => {
    const existing = await db.settings.get("user");
    if (!existing) {
      await db.settings.put({ id: "user", ...settings });
    }

    const existingProgress = await db.progress.get("user");
    if (!existingProgress) {
      await db.progress.put({
        id: "user",
        xp: 0,
        level: 1,
        streakDays: 0,
        todayReviewed: 0,
      });
    }
  });
}

/** Convenience: wipe and re-seed everything (used by Settings → Reset Progress). */
export async function resetAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.cards, db.deckCards, db.reviewRecords, db.settings, db.progress],
    async () => {
      await Promise.all([
        db.cards.clear(),
        db.deckCards.clear(),
        db.reviewRecords.clear(),
        db.settings.clear(),
        db.progress.clear(),
      ]);
    }
  );
}
