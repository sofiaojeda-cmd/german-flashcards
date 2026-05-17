import type { Card, ReviewRecord } from "@/types";

export type VocabRow = { card: Card; record: ReviewRecord };

/**
 * Returns all active deck cards that the user has engaged with
 * (status = learning | mastered | known), hydrated with static card content.
 * "new" cards are intentionally excluded — this represents the user's collection,
 * not the full universe of 470 cards.
 */
export async function getVocabularyList(): Promise<VocabRow[]> {
  const { default: db } = await import("@/lib/db/schema");

  // Boolean fields can't be IndexedDB index keys — filter in JS
  const activeDeckCards = (await db.deckCards.toArray()).filter((d) => d.active);
  const activeIds = activeDeckCards.map((d) => d.cardId);

  const records = await db.reviewRecords
    .where("cardId")
    .anyOf(activeIds)
    .toArray();

  const engaged = records.filter(
    (r) => r.status === "learning" || r.status === "mastered" || r.status === "known"
  );

  const rows = await Promise.all(
    engaged.map(async (record) => {
      const card = await db.cards.get(record.cardId);
      return card ? { card, record } : null;
    })
  );

  return rows.filter((r): r is VocabRow => r !== null);
}
