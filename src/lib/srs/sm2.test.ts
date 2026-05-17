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
  it("produces a record due immediately with SM-2 defaults", () => {
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

// ── Status transitions ───────────────────────────────────────────

describe("status transitions", () => {
  it("first review (any quality) → status becomes 'learning'", () => {
    expect(applyReview(baseRecord({ status: "new" }), 4, NOW).status).toBe("learning");
    expect(applyReview(baseRecord({ status: "new" }), 3, NOW).status).toBe("learning");
    expect(applyReview(baseRecord({ status: "new" }), 0, NOW).status).toBe("learning");
  });

  it("interval < 90 days stays 'learning'", () => {
    // After first two Good reviews: interval=6
    const step1 = applyReview(baseRecord(), 4, NOW);
    const step2 = applyReview(step1, 4, NOW);
    expect(step2.interval).toBe(6);
    expect(step2.status).toBe("learning");
  });

  it("interval >= 90 days transitions to 'mastered'", () => {
    // Build a record that will produce interval >= 90 on next review
    // interval=40, easeFactor=2.5 → round(40 * 2.5) = 100
    const record = baseRecord({ repetitions: 2, interval: 40, easeFactor: 2.5, status: "learning" });
    const r = applyReview(record, 4, NOW);
    expect(r.interval).toBe(100);
    expect(r.status).toBe("mastered");
  });

  it("Again on mastered card → interval=0 → drops back to 'learning'", () => {
    const mastered = baseRecord({ repetitions: 5, interval: 100, status: "mastered" });
    const r = applyReview(mastered, 0, NOW);
    expect(r.interval).toBe(0);
    expect(r.status).toBe("learning");
  });

  it("'known' status is preserved through applyReview", () => {
    const known = baseRecord({ repetitions: 99, interval: 365, status: "known" });
    const r = applyReview(known, 4, NOW);
    expect(r.status).toBe("known");
  });
});

// ── First review ─────────────────────────────────────────────────

describe("first review (repetitions=0)", () => {
  it("Again → resets, due immediately", () => {
    const r = applyReview(baseRecord(), 0, NOW);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(0);
    expect(r.dueDate).toBe(NOW); // interval=0 → due now
    expect(r.lastReviewed).toBe(NOW);
  });

  it("Hard → interval=1 day, reps=1", () => {
    const r = applyReview(baseRecord(), 3, NOW);
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.dueDate).toBe(NOW + MS_PER_DAY);
  });

  it("Good → interval=1 day, reps=1", () => {
    const r = applyReview(baseRecord(), 4, NOW);
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
  });

  it("Easy → interval=1 day, reps=1", () => {
    const r = applyReview(baseRecord(), 5, NOW);
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
  });
});

// ── Second review (repetitions=1) ───────────────────────────────

describe("second review (repetitions=1)", () => {
  const after1 = baseRecord({ repetitions: 1, interval: 1, status: "learning" });

  it("Good → interval=6 days, reps=2", () => {
    const r = applyReview(after1, 4, NOW);
    expect(r.repetitions).toBe(2);
    expect(r.interval).toBe(6);
    expect(r.dueDate).toBe(NOW + 6 * MS_PER_DAY);
  });

  it("Again at reps=1 → full reset", () => {
    const r = applyReview(after1, 0, NOW);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(0);
  });
});

// ── Successful repetition (repetitions>=2) ───────────────────────

describe("mature card (repetitions=2, interval=6)", () => {
  const mature = baseRecord({ repetitions: 2, interval: 6, easeFactor: 2.5, status: "learning" });

  it("Good → interval = round(6 × 2.5) = 15", () => {
    const r = applyReview(mature, 4, NOW);
    expect(r.interval).toBe(15);
    expect(r.repetitions).toBe(3);
  });

  it("Easy → higher ease factor → longer interval", () => {
    const rGood = applyReview(mature, 4, NOW);
    const rEasy = applyReview(mature, 5, NOW);
    expect(rEasy.interval).toBeGreaterThan(rGood.interval);
    expect(rEasy.easeFactor).toBeGreaterThan(rGood.easeFactor);
  });

  it("Hard → lower ease factor → shorter interval", () => {
    const rGood = applyReview(mature, 4, NOW);
    const rHard = applyReview(mature, 3, NOW);
    expect(rHard.interval).toBeLessThan(rGood.interval);
    expect(rHard.easeFactor).toBeLessThan(rGood.easeFactor);
  });
});

// ── Failure resets progress ──────────────────────────────────────

describe("failure (Again) resets SRS state", () => {
  it("mature card → Again → interval=0, reps=0, due immediately", () => {
    const mature = baseRecord({ repetitions: 5, interval: 30, easeFactor: 2.5, status: "learning" });
    const r = applyReview(mature, 0, NOW);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(0);
    expect(r.dueDate).toBe(NOW);
  });

  it("ease factor still decreases on Again", () => {
    const mature = baseRecord({ repetitions: 5, interval: 30, easeFactor: 2.5 });
    const r = applyReview(mature, 0, NOW);
    expect(r.easeFactor).toBeLessThan(2.5);
  });
});

// ── Ease factor floor ────────────────────────────────────────────

describe("ease factor floor at 1.3", () => {
  it("never drops below 1.3 after repeated Hard ratings", () => {
    let r = baseRecord({ repetitions: 2, interval: 6, easeFactor: 1.4 });
    for (let i = 0; i < 20; i++) {
      r = applyReview(r, 3, NOW);
    }
    expect(r.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("ease factor after many Hard reviews is exactly 1.3", () => {
    let r = baseRecord({ repetitions: 2, interval: 6, easeFactor: 2.5 });
    for (let i = 0; i < 50; i++) {
      r = applyReview(r, 3, NOW);
    }
    expect(r.easeFactor).toBe(1.3);
  });
});

// ── dueDate calculation ──────────────────────────────────────────

describe("dueDate correctness", () => {
  it("interval=0 → dueDate === now", () => {
    const r = applyReview(baseRecord(), 0, NOW);
    expect(r.dueDate).toBe(NOW);
  });

  it("interval=N days → dueDate === now + N * MS_PER_DAY", () => {
    // After two Good reviews, interval should be 6
    const step1 = applyReview(baseRecord(), 4, NOW);
    const step2 = applyReview(step1, 4, NOW);
    expect(step2.interval).toBe(6);
    expect(step2.dueDate).toBe(NOW + 6 * MS_PER_DAY);
  });

  it("lastReviewed is set to now after every review", () => {
    const r = applyReview(baseRecord(), 4, NOW);
    expect(r.lastReviewed).toBe(NOW);
  });
});

// ── Ease factor delta formula ────────────────────────────────────

describe("ease factor delta per quality", () => {
  // ΔEF = 0.1 − (5−q)×(0.08 + (5−q)×0.02)
  // q=5: ΔEF = 0.1
  // q=4: ΔEF = 0
  // q=3: ΔEF = −0.14
  // q=0: ΔEF = −1.0 (clamped to min 1.3)

  it("Easy (q=5) increases ease factor by 0.1", () => {
    const r = applyReview(baseRecord({ easeFactor: 2.5 }), 5, NOW);
    expect(r.easeFactor).toBeCloseTo(2.6, 5);
  });

  it("Good (q=4) leaves ease factor unchanged", () => {
    const r = applyReview(baseRecord({ easeFactor: 2.5 }), 4, NOW);
    expect(r.easeFactor).toBeCloseTo(2.5, 5);
  });

  it("Hard (q=3) decreases ease factor by 0.14", () => {
    const r = applyReview(baseRecord({ easeFactor: 2.5 }), 3, NOW);
    expect(r.easeFactor).toBeCloseTo(2.36, 5);
  });
});
