/**
 * Settings helpers — read/write user preferences and progress.
 * All DB access is lazy-imported so this module is safe to import in SSR contexts.
 */

import type { CEFRLevel, Category } from "@/types";
import { recomputeActiveDeck, seedCards } from "./seed";

export type SettingsData = {
  levels: CEFRLevel[];
  topics: string[];
  livesInBerlin: boolean;
  dailyGoal: number;
  audioEnabled: boolean;
  xp: number;
  progressLevel: number;
  streakDays: number;
};

export async function getSettings(): Promise<SettingsData | null> {
  const { default: db } = await import("./schema");
  const [settings, progress] = await Promise.all([
    db.settings.get("user"),
    db.progress.get("user"),
  ]);
  if (!settings) return null;
  return {
    levels: settings.levels ?? ["B1"],
    topics: settings.topics ?? [],
    livesInBerlin: settings.livesInBerlin ?? false,
    dailyGoal: settings.dailyGoal ?? 20,
    audioEnabled: settings.audioEnabled ?? false,
    xp: progress?.xp ?? 0,
    progressLevel: progress?.level ?? 1,
    streakDays: progress?.streakDays ?? 0,
  };
}

export async function updateDailyGoal(goal: 10 | 20 | 30): Promise<void> {
  const { default: db } = await import("./schema");
  await db.settings.update("user", { dailyGoal: goal });
}

/**
 * Toggle a topic on or off in the active deck.
 * Throws if attempting to deactivate the last active topic.
 * Returns the updated topics array.
 */
export async function toggleTopic(
  topicId: string,
  active: boolean,
  currentTopics: string[]
): Promise<string[]> {
  if (!active && currentTopics.length <= 1) {
    throw new Error("at-least-one");
  }

  const newTopics = active
    ? [...new Set([...currentTopics, topicId])]
    : currentTopics.filter((t) => t !== topicId);

  const { default: db } = await import("./schema");
  const updates: Record<string, unknown> = { topics: newTopics };
  if (topicId === "berlin") updates.livesInBerlin = active;
  await db.settings.update("user", updates as Parameters<typeof db.settings.update>[1]);

  const stored = await db.settings.get("user");
  await recomputeActiveDeck({ topics: newTopics, levels: stored?.levels ?? ["B1"] });

  return newTopics;
}

/**
 * Set which CEFR levels belong in the deck.
 * Throws if the selection is empty — a deck needs at least one level.
 * Returns the stored selection, in CEFR order.
 */
export async function setLevels(levels: CEFRLevel[]): Promise<CEFRLevel[]> {
  if (levels.length === 0) {
    throw new Error("at-least-one");
  }

  const { sortLevels } = await import("@/lib/levels");
  const ordered = sortLevels(levels);

  const { default: db } = await import("./schema");
  await db.settings.update("user", { levels: ordered });

  const stored = await db.settings.get("user");
  await recomputeActiveDeck({ topics: stored?.topics ?? [], levels: ordered });

  return ordered;
}

/** Wipe all review progress without deleting cards or changing active flags. */
export async function resetAllProgress(): Promise<void> {
  const { default: db } = await import("./schema");
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  await db.reviewRecords.toCollection().modify((r) => {
    r.easeFactor = 2.5;
    r.interval = 0;
    r.repetitions = 0;
    r.dueDate = now;
    r.status = "new";
    delete r.lastReviewed;
  });

  await db.progress.put({
    id: "user",
    xp: 0,
    level: 1,
    streakDays: 0,
    todayReviewed: 0,
    todayDate: today,
  });
}

/**
 * One-time migration for users onboarded before the seed-all-cards refactor.
 * Seeds cards for any category that has zero deckCards in the DB, as active:false
 * so they don't appear in /review until the user enables them in Settings.
 * Idempotent — safe to call on every /settings visit.
 */
export async function backfillMissingTopics(): Promise<void> {
  const { default: db } = await import("./schema");
  let seeded = false;

  const res = await fetch("/api/cards/categories.json");
  if (!res.ok) return;
  const data = await res.json();
  const categories = data.categories as Category[];

  for (const cat of categories) {
    // Check if any cards for this topic have deckCard entries
    const cardsInTopic = await db.cards.where("topics").equals(cat.id).toArray();

    if (cardsInTopic.length > 0) {
      const cardIds = cardsInTopic.map((c) => c.id);
      const count = await db.deckCards.where("cardId").anyOf(cardIds).count();
      if (count > 0) continue; // Already seeded — nothing to do
    }

    // Topic is missing from DB entirely or has cards but no deckCards — seed it.
    // seedCards lands cards inactive; the recompute below decides membership.
    await seedCards({ topics: [cat.id] });
    seeded = true;
  }

  if (!seeded) return;

  const settings = await db.settings.get("user");
  if (settings) {
    await recomputeActiveDeck({
      topics: settings.topics ?? [],
      levels: settings.levels ?? ["B1"],
    });
  }
}
