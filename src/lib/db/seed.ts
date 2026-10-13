import db from "./schema";
import type { Card, CEFRLevel, Category, UserSettings } from "@/types";

const API_BASE = "/api/cards";

async function fetchCardFile(filename: string): Promise<Card[]> {
  const res = await fetch(`${API_BASE}/${filename}`);
  // A 404 is the one acceptable miss: a declared file that hasn't shipped yet.
  // Anything else is a real failure and must not be swallowed — a silent []
  // seeds an empty deck and drops the user on a dashboard with nothing to review.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Failed to load ${filename} (HTTP ${res.status})`);
  return res.json();
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories.json`);
  if (!res.ok) throw new Error("Failed to load categories.json");
  const data = await res.json();
  // categories.json shape: { categories: Category[] }
  return data.categories as Category[];
}

/** Every card file a category declares, across all its levels. */
function filesFor(cat: Category): string[] {
  return Object.values(cat.files ?? {}).flat();
}

/** The CEFR levels that have at least one card file today. */
export async function availableLevels(): Promise<CEFRLevel[]> {
  const categories = await fetchCategories();
  const { CEFR_ORDER } = await import("@/lib/levels");
  const found = new Set<string>();
  for (const cat of categories) {
    for (const [level, files] of Object.entries(cat.files ?? {})) {
      if (files && files.length > 0) found.add(level);
    }
  }
  return CEFR_ORDER.filter((l) => found.has(l));
}

export type SeedOptions = {
  /** Category IDs to seed. Omit to seed every category. */
  topics?: string[];
};

/**
 * Seed card data into IndexedDB. Seeds every level a category declares, so that
 * changing topics or levels later is lossless — nothing has to be re-fetched and
 * no review history is lost.
 *
 * Idempotent: cards already in the DB are left alone.
 *
 * Deck membership is NOT decided here. New cards land inactive and
 * recomputeActiveDeck() derives `active` from the user's settings, so every
 * caller must run it afterwards.
 */
export async function seedCards(options: SeedOptions = {}): Promise<{ seeded: number }> {
  const categories = await fetchCategories();

  const targetCategories = options.topics
    ? categories.filter((c) => options.topics!.includes(c.id))
    : categories;

  const cardArrays = await Promise.all(
    targetCategories.map((cat) => Promise.all(filesFor(cat).map(fetchCardFile)))
  );

  // Deduplicate by id (files shouldn't overlap but guard anyway)
  const uniqueCards = Array.from(
    new Map(cardArrays.flat(2).map((c) => [c.id, c])).values()
  );

  const existingIds = new Set(
    await db.cards.where("id").anyOf(uniqueCards.map((c) => c.id)).primaryKeys()
  );
  const newCards = uniqueCards.filter((c) => !existingIds.has(c.id));

  if (newCards.length === 0) return { seeded: 0 };

  const now = Date.now();

  await db.transaction("rw", db.cards, db.deckCards, db.reviewRecords, async () => {
    await db.cards.bulkAdd(newCards);

    await db.deckCards.bulkAdd(
      newCards.map((c) => ({ cardId: c.id, active: false, addedAt: now }))
    );

    // Initial SM-2 state — dueDate = now so cards appear as soon as they're active
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
 * Bump whenever the shipped card data changes in a way existing devices need.
 * syncCardDefinitions() runs once per device per bump.
 */
export const CARD_CONTENT_VERSION = 2;

/**
 * Re-write card definitions on this device from the shipped JSON, and give any
 * card that is new here its deck entry and SRS state.
 *
 * seedCards() deliberately skips cards it has already seen, which protects
 * review history but also means a content fix never reaches anyone who already
 * opened the app. This closes that gap: only the `cards` table is overwritten.
 * Deck membership lives in deckCards and progress lives in reviewRecords, and
 * neither is rewritten for a card that already exists, so corrections and new
 * cards arrive without costing anyone their streak.
 */
export async function syncCardDefinitions(): Promise<{ updated: number; added: number }> {
  const categories = await fetchCategories();
  const cardArrays = await Promise.all(
    categories.map((cat) => Promise.all(filesFor(cat).map(fetchCardFile)))
  );
  const incoming = Array.from(
    new Map(cardArrays.flat(2).map((c) => [c.id, c])).values()
  );
  if (incoming.length === 0) return { updated: 0, added: 0 };

  const now = Date.now();
  let added = 0;

  await db.transaction("rw", db.cards, db.deckCards, db.reviewRecords, async () => {
    const knownCards = new Set(await db.cards.toCollection().primaryKeys());
    const knownDeck = new Set(await db.deckCards.toCollection().primaryKeys());
    const knownRecords = new Set(await db.reviewRecords.toCollection().primaryKeys());

    added = incoming.filter((c) => !knownCards.has(c.id)).length;

    await db.cards.bulkPut(incoming);

    const newDeckCards = incoming
      .filter((c) => !knownDeck.has(c.id))
      .map((c) => ({ cardId: c.id, active: false, addedAt: now }));
    if (newDeckCards.length > 0) await db.deckCards.bulkAdd(newDeckCards);

    const newRecords = incoming
      .filter((c) => !knownRecords.has(c.id))
      .map((c) => ({
        cardId: c.id,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        dueDate: now,
        status: "new" as const,
      }));
    if (newRecords.length > 0) await db.reviewRecords.bulkAdd(newRecords);
  });

  return { updated: incoming.length - added, added };
}

/**
 * Derive `active` for every deck card from the current selection:
 *
 *   active = the card carries one of the chosen topics
 *            AND its CEFR level is one of the chosen levels
 *
 * This replaces the old activateTopicCards/deactivateTopicCards pair, which
 * applied deltas on top of whatever was already stored. A pass that only ever
 * deactivated could shrink the deck to nothing with no path back. Deriving the
 * whole flag from settings every time makes that failure impossible.
 *
 * Review history is never touched — only deck membership.
 */
export async function recomputeActiveDeck(selection: {
  topics: string[];
  levels: CEFRLevel[];
}): Promise<{ active: number }> {
  const topics = new Set(selection.topics);
  const levels = new Set<CEFRLevel>(selection.levels);

  const cards = await db.cards.toArray();
  const wanted = new Set(
    cards
      .filter((c) => c.topics.some((t) => topics.has(t)) && levels.has(c.level))
      .map((c) => c.id)
  );

  await db.deckCards.toCollection().modify((d) => {
    d.active = wanted.has(d.cardId);
  });

  // IndexedDB can't index booleans — count in JS
  const active = (await db.deckCards.toArray()).filter((d) => d.active).length;
  return { active };
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
