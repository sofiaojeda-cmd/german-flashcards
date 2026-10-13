import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyReview, freshRecord, fisherYatesShuffle, mulberry32, getDueCards } from "./sm2";
import type { Card, DeckCard, ReviewRecord } from "@/types";

// ── Fake Dexie handle for getDueCards ────────────────────────────
// getDueCards lazy-imports the schema module, so mocking the specifier is
// enough and keeps these tests free of an IndexedDB shim.
const dbState = vi.hoisted(() => ({
  deckCards: [] as DeckCard[],
  reviewRecords: [] as ReviewRecord[],
  cards: [] as Card[],
}));

vi.mock("@/lib/db/schema", () => ({
  default: {
    deckCards: {
      toArray: async () => dbState.deckCards,
    },
    reviewRecords: {
      where: () => ({
        belowOrEqual: (cutoff: number) => ({
          sortBy: async () =>
            dbState.reviewRecords
              .filter((r) => r.dueDate <= cutoff)
              .sort((a, b) => a.dueDate - b.dueDate),
        }),
      }),
    },
    cards: {
      bulkGet: async (ids: string[]) =>
        ids.map((id) => dbState.cards.find((c) => c.id === id)),
    },
  },
}));

const MS_PER_DAY = 86_400_000;
const NOW = 1_700_000_000_000; // fixed timestamp for deterministic tests

function baseRecord(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    cardId: "test-card",
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: NOW,
    status: "new",
    ...overrides,
  };
}

// ── fisherYatesShuffle ───────────────────────────────────────────

describe("fisherYatesShuffle", () => {
  it("does not mutate the input array", () => {
    const items = [1, 2, 3, 4, 5];
    const original = [...items];
    fisherYatesShuffle(items, mulberry32(1));
    expect(items).toEqual(original);
  });

  it("preserves all elements", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = fisherYatesShuffle(items, mulberry32(7));
    expect([...shuffled].sort((a, b) => a - b)).toEqual([...items].sort((a, b) => a - b));
  });

  it("is reproducible with the same seed", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result1 = fisherYatesShuffle(items, mulberry32(42));
    const result2 = fisherYatesShuffle(items, mulberry32(42));
    expect(result1).toEqual(result2);
  });

  it("produces a different order with a different seed", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const r1 = fisherYatesShuffle(items, mulberry32(1));
    const r2 = fisherYatesShuffle(items, mulberry32(999));
    expect(r1).not.toEqual(r2);
  });

  it("produces a different order from the original", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const shuffled = fisherYatesShuffle(items, mulberry32(42));
    expect(shuffled).not.toEqual(items);
  });
});

// ── freshRecord ──────────────────────────────────────────────────

describe("freshRecord", () => {
  it("produces a record due immediately with defaults", () => {
    const r = freshRecord("abc", NOW);
    expect(r.cardId).toBe("abc");
    expect(r.easeFactor).toBe(2.5);
    expect(r.interval).toBe(0);
    expect(r.repetitions).toBe(0);
    expect(r.dueDate).toBe(NOW);
    expect(r.status).toBe("new");
    expect(r.lastReviewed).toBeUndefined();
  });
});

// ── applyReview — not-yet ────────────────────────────────────────

describe('applyReview: "not-yet"', () => {
  it("resets interval to 0 and sets dueDate to now", () => {
    const r = applyReview(baseRecord({ repetitions: 3, interval: 6, status: "learning" }), "not-yet", NOW);
    expect(r.interval).toBe(0);
    expect(r.dueDate).toBe(NOW);
    expect(r.repetitions).toBe(0);
  });

  it("sets status to learning regardless of prior status", () => {
    expect(applyReview(baseRecord({ status: "new" }), "not-yet", NOW).status).toBe("learning");
    expect(applyReview(baseRecord({ status: "mastered" }), "not-yet", NOW).status).toBe("learning");
    expect(applyReview(baseRecord({ status: "known" }), "not-yet", NOW).status).toBe("learning");
  });

  it("sets lastReviewed to now", () => {
    const r = applyReview(baseRecord(), "not-yet", NOW);
    expect(r.lastReviewed).toBe(NOW);
  });
});

// ── applyReview — still-learning ────────────────────────────────

describe('applyReview: "still-learning"', () => {
  it("sets interval to 1 day and dueDate to now + 1 day", () => {
    const r = applyReview(baseRecord(), "still-learning", NOW);
    expect(r.interval).toBe(1);
    expect(r.dueDate).toBe(NOW + MS_PER_DAY);
  });

  it("increments repetitions", () => {
    const r = applyReview(baseRecord({ repetitions: 2 }), "still-learning", NOW);
    expect(r.repetitions).toBe(3);
  });

  it("sets status to learning", () => {
    expect(applyReview(baseRecord({ status: "new" }), "still-learning", NOW).status).toBe("learning");
    expect(applyReview(baseRecord({ status: "mastered" }), "still-learning", NOW).status).toBe("learning");
  });

  it("sets lastReviewed to now", () => {
    const r = applyReview(baseRecord(), "still-learning", NOW);
    expect(r.lastReviewed).toBe(NOW);
  });
});

// ── applyReview — known ──────────────────────────────────────────

describe('applyReview: "known"', () => {
  it("sets interval to 7 days and dueDate to now + 7 days", () => {
    const r = applyReview(baseRecord(), "known", NOW);
    expect(r.interval).toBe(7);
    expect(r.dueDate).toBe(NOW + 7 * MS_PER_DAY);
  });

  it("increments repetitions", () => {
    const r = applyReview(baseRecord({ repetitions: 1 }), "known", NOW);
    expect(r.repetitions).toBe(2);
  });

  it("sets status to known", () => {
    expect(applyReview(baseRecord({ status: "new" }), "known", NOW).status).toBe("known");
    expect(applyReview(baseRecord({ status: "learning" }), "known", NOW).status).toBe("known");
    expect(applyReview(baseRecord({ status: "mastered" }), "known", NOW).status).toBe("known");
  });

  it("sets lastReviewed to now", () => {
    const r = applyReview(baseRecord(), "known", NOW);
    expect(r.lastReviewed).toBe(NOW);
  });
});

// ── applyReview — does not mutate input ─────────────────────────

describe("applyReview immutability", () => {
  it("does not mutate the input record", () => {
    const record = baseRecord({ repetitions: 2, interval: 6 });
    const before = { ...record };
    applyReview(record, "still-learning", NOW);
    expect(record).toEqual(before);
  });
});


// ── getDueCards ──────────────────────────────────────────────────

describe("getDueCards", () => {
  /** Build a deck of `total` cards where the first `activeCount` are active. */
  function seedFakeDb(total: number, activeCount: number, status: ReviewRecord["status"] = "new") {
    dbState.cards = Array.from({ length: total }, (_, i) => ({
      id: `card-${i}`,
      level: "B1" as const,
      topics: [i < activeCount ? "berlin" : "astrology"],
      front: `front-${i}`,
      back: `back-${i}`,
    }));
    dbState.deckCards = Array.from({ length: total }, (_, i) => ({
      cardId: `card-${i}`,
      active: i < activeCount,
      addedAt: NOW,
    }));
    dbState.reviewRecords = Array.from({ length: total }, (_, i) =>
      baseRecord({ cardId: `card-${i}`, dueDate: NOW - total + i, status })
    );
  }

  beforeEach(() => {
    dbState.cards = [];
    dbState.deckCards = [];
    dbState.reviewRecords = [];
  });

  it("fills the limit from active cards even when most of the deck is dormant", async () => {
    // Regression: the limit used to be applied before deck membership was
    // checked, so 50 active cards out of 470 returned ~2 for a goal of 20.
    seedFakeDb(470, 50);
    const queue = await getDueCards(20, mulberry32(42));
    expect(queue).toHaveLength(20);
  });

  it("only returns cards whose deck entry is active", async () => {
    seedFakeDb(470, 50);
    const activeIds = new Set(
      dbState.deckCards.filter((d) => d.active).map((d) => d.cardId)
    );
    const queue = await getDueCards(20, mulberry32(7));
    expect(queue.every((q) => activeIds.has(q.record.cardId))).toBe(true);
  });

  it("caps at the number of active due cards when the limit exceeds it", async () => {
    seedFakeDb(100, 6);
    const queue = await getDueCards(20, mulberry32(3));
    expect(queue).toHaveLength(6);
  });

  it("returns an empty queue when no cards are active", async () => {
    seedFakeDb(100, 0);
    const queue = await getDueCards(20, mulberry32(1));
    expect(queue).toEqual([]);
  });

  it("excludes known cards", async () => {
    seedFakeDb(40, 40, "known");
    const queue = await getDueCards(20, mulberry32(9));
    expect(queue).toEqual([]);
  });

  it("returns every active due card when no limit is given", async () => {
    seedFakeDb(120, 37);
    const queue = await getDueCards(undefined, mulberry32(11));
    expect(queue).toHaveLength(37);
  });

  it("pairs each record with its own card", async () => {
    seedFakeDb(60, 25);
    const queue = await getDueCards(10, mulberry32(5));
    expect(queue.every((q) => q.card.id === q.record.cardId)).toBe(true);
  });
});
