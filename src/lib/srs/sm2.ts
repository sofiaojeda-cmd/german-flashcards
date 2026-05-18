import type { ReviewRecord, ReviewQuality } from "@/types";

// ── Fisher-Yates shuffle ─────────────────────────────────────────

/** Seeded PRNG (mulberry32) — pass to fisherYatesShuffle for deterministic tests. */
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * In-place Fisher-Yates shuffle. Returns a new array; input is not mutated.
 * Pass a seeded PRNG (from mulberry32) for reproducible results in tests.
 */
export function fisherYatesShuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const EASE_DEFAULT = 2.5;
const MS_PER_DAY = 86_400_000;

/**
 * Apply one review to a record and return the updated record.
 * Does not mutate the input — always returns a new object.
 *
 *   not-yet        → interval 0 (due immediately, replays this session), status learning
 *   still-learning → interval 1 day, status learning
 *   known          → interval 7 days, status known (excluded from future queue)
 */
export function applyReview(
  record: ReviewRecord,
  quality: ReviewQuality,
  now = Date.now()
): ReviewRecord {
  if (quality === "not-yet") {
    return {
      ...record,
      interval: 0,
      repetitions: 0,
      dueDate: now,
      lastReviewed: now,
      status: "learning",
    };
  }

  if (quality === "still-learning") {
    return {
      ...record,
      interval: 1,
      repetitions: record.repetitions + 1,
      dueDate: now + MS_PER_DAY,
      lastReviewed: now,
      status: "learning",
    };
  }

  // "known" — moves card out of the active queue
  return {
    ...record,
    interval: 7,
    repetitions: record.repetitions + 1,
    dueDate: now + 7 * MS_PER_DAY,
    lastReviewed: now,
    status: "known",
  };
}

/** Build a fresh ReviewRecord for a newly added card (due immediately). */
export function freshRecord(cardId: string, now = Date.now()): ReviewRecord {
  return {
    cardId,
    easeFactor: EASE_DEFAULT,
    interval: 0,
    repetitions: 0,
    dueDate: now,
    status: "new",
    lastReviewed: undefined,
  };
}

/**
 * Mark a card as explicitly known — removes it from the active review queue
 * for ~1 year. Called from the "I already know this" button in the review UI.
 */
export async function markAsKnown(cardId: string, now = Date.now()): Promise<void> {
  const { default: db } = await import("@/lib/db/schema");
  await db.reviewRecords.update(cardId, {
    status: "known",
    interval: 365,
    repetitions: 99,
    dueDate: now + 365 * MS_PER_DAY,
    lastReviewed: now,
  });
}

/**
 * Move a card to "known" status — same effect as "I already knew this" in review.
 * Keeps the card out of the queue for ~1 year.
 */
export async function markCardKnown(cardId: string, now = Date.now()): Promise<void> {
  return markAsKnown(cardId, now);
}

/**
 * Reset a card back to "learning" — recovery path when a card was accidentally
 * marked known. Adds it back to the due queue immediately.
 */
export async function resetCardToLearning(cardId: string, now = Date.now()): Promise<void> {
  const { default: db } = await import("@/lib/db/schema");
  await db.reviewRecords.update(cardId, {
    status: "learning",
    interval: 0,
    repetitions: 0,
    dueDate: now,
    lastReviewed: now,
  });
}

/**
 * Return vocab stats for the user's active deck.
 */
export async function getVocabStats(): Promise<{
  total: number;
  new: number;
  learning: number;
  mastered: number;
  known: number;
}> {
  const { default: db } = await import("@/lib/db/schema");

  // Only count active deck cards
  // IndexedDB can't index booleans — filter active status in JS
  const activeDeckCards = (await db.deckCards.toArray()).filter((d) => d.active);
  const activeIds = new Set(activeDeckCards.map((d) => d.cardId));

  const records = await db.reviewRecords
    .where("cardId")
    .anyOf([...activeIds])
    .toArray();

  const counts = { new: 0, learning: 0, mastered: 0, known: 0 };
  for (const r of records) {
    const s = r.status ?? "new";
    if (s in counts) counts[s as keyof typeof counts]++;
  }

  return { total: records.length, ...counts };
}

/**
 * Return due ReviewRecords joined with their Card data.
 * Only includes active deck cards. Excludes "known" cards.
 * Results are shuffled (Fisher-Yates) before the limit is applied so sessions
 * draw a diverse mix across topics rather than insertion-order batches.
 *
 * Pass a seeded prng (from mulberry32) in tests for deterministic results.
 */
export async function getDueCards(limit?: number, prng?: () => number) {
  const { default: db } = await import("@/lib/db/schema");

  const now = Date.now();

  const due = await db.reviewRecords
    .where("dueDate")
    .belowOrEqual(now)
    .sortBy("dueDate");

  // Exclude explicitly known cards, then shuffle so the limit draws across topics
  const filtered = due.filter((r) => r.status !== "known");
  const shuffled = fisherYatesShuffle(filtered, prng);
  const limited = limit !== undefined ? shuffled.slice(0, limit) : shuffled;

  const results = await Promise.all(
    limited.map(async (record: ReviewRecord) => {
      const [deckCard, card] = await Promise.all([
        db.deckCards.get(record.cardId),
        db.cards.get(record.cardId),
      ]);
      if (!deckCard?.active || !card) return null;
      return { card, record };
    })
  );

  return results.filter(
    (r): r is { card: NonNullable<typeof results[0]>["card"]; record: ReviewRecord } =>
      r !== null
  );
}
