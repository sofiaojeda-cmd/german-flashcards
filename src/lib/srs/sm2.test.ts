import { describe, it, expect } from "vitest";
import { applyReview, freshRecord, fisherYatesShuffle, mulberry32 } from "./sm2";
import type { ReviewRecord } from "@/types";

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
