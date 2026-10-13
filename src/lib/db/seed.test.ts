import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recomputeActiveDeck, syncCardDefinitions } from "./seed";
import type { Card, DeckCard, ReviewRecord } from "@/types";

// Fake Dexie handle. Only the tables these two functions touch are modelled.
const dbState = vi.hoisted(() => ({
  cards: [] as Card[],
  deckCards: [] as DeckCard[],
  reviewRecords: [] as ReviewRecord[],
}));

vi.mock("@/lib/db/schema", () => ({
  default: {
    cards: {
      toArray: async () => dbState.cards,
      toCollection: () => ({
        primaryKeys: async () => dbState.cards.map((c) => c.id),
      }),
      bulkPut: async (rows: Card[]) => {
        for (const row of rows) {
          const i = dbState.cards.findIndex((c) => c.id === row.id);
          if (i >= 0) dbState.cards[i] = row;
          else dbState.cards.push(row);
        }
      },
    },
    deckCards: {
      toArray: async () => dbState.deckCards,
      toCollection: () => ({
        primaryKeys: async () => dbState.deckCards.map((d) => d.cardId),
        modify: async (fn: (d: DeckCard) => void) => {
          for (const d of dbState.deckCards) fn(d);
        },
      }),
      bulkAdd: async (rows: DeckCard[]) => {
        dbState.deckCards.push(...rows);
      },
    },
    reviewRecords: {
      toCollection: () => ({
        primaryKeys: async () => dbState.reviewRecords.map((r) => r.cardId),
      }),
      bulkAdd: async (rows: ReviewRecord[]) => {
        dbState.reviewRecords.push(...rows);
      },
    },
    transaction: async (...args: unknown[]) => {
      const fn = args[args.length - 1] as () => Promise<void>;
      return fn();
    },
  },
}));

const NOW = 1_700_000_000_000;

function card(id: string, topic: string, level: Card["level"]): Card {
  return { id, level, topics: [topic], front: `front-${id}`, back: `back-${id}` };
}

function seedFakeDb(cards: Card[], active: boolean) {
  dbState.cards = cards;
  dbState.deckCards = cards.map((c) => ({ cardId: c.id, active, addedAt: NOW }));
  dbState.reviewRecords = [];
}

const activeIds = () => dbState.deckCards.filter((d) => d.active).map((d) => d.cardId);

describe("recomputeActiveDeck", () => {
  beforeEach(() => {
    dbState.cards = [];
    dbState.deckCards = [];
    dbState.reviewRecords = [];
  });

  it("activates only cards matching both a chosen topic and a chosen level", async () => {
    seedFakeDb(
      [
        card("a", "berlin", "A1"),
        card("b", "berlin", "B1"),
        card("c", "food", "A1"),
        card("d", "food", "B1"),
      ],
      false
    );

    const { active } = await recomputeActiveDeck({ topics: ["berlin"], levels: ["B1"] });

    expect(activeIds()).toEqual(["b"]);
    expect(active).toBe(1);
  });

  it("includes lower levels when they are selected", async () => {
    seedFakeDb(
      [card("a", "berlin", "A1"), card("b", "berlin", "B1"), card("c", "berlin", "B2")],
      false
    );

    await recomputeActiveDeck({ topics: ["berlin"], levels: ["A1", "B1"] });

    expect(activeIds()).toEqual(["a", "b"]);
  });

  it("deactivates cards whose level was dropped", async () => {
    seedFakeDb([card("a", "berlin", "A1"), card("b", "berlin", "B1")], true);

    await recomputeActiveDeck({ topics: ["berlin"], levels: ["B1"] });

    expect(activeIds()).toEqual(["b"]);
  });

  it("deactivates cards whose topic was dropped", async () => {
    seedFakeDb([card("a", "berlin", "B1"), card("b", "food", "B1")], true);

    await recomputeActiveDeck({ topics: ["food"], levels: ["B1"] });

    expect(activeIds()).toEqual(["b"]);
  });

  it("restores a deck that was left entirely inactive", async () => {
    // Regression: the old delta-based activation could only ever subtract, so a
    // second pass through onboarding could empty the deck with no way back.
    seedFakeDb([card("a", "berlin", "B1"), card("b", "berlin", "B1")], false);

    const { active } = await recomputeActiveDeck({ topics: ["berlin"], levels: ["B1"] });

    expect(active).toBe(2);
  });

  it("is idempotent", async () => {
    seedFakeDb([card("a", "berlin", "B1"), card("b", "food", "A1")], false);

    const first = await recomputeActiveDeck({ topics: ["berlin"], levels: ["B1"] });
    const firstIds = activeIds();
    const second = await recomputeActiveDeck({ topics: ["berlin"], levels: ["B1"] });

    expect(second).toEqual(first);
    expect(activeIds()).toEqual(firstIds);
  });

  it("empties the deck when nothing is selected, without touching review history", async () => {
    seedFakeDb([card("a", "berlin", "B1")], true);

    const { active } = await recomputeActiveDeck({ topics: [], levels: ["B1"] });

    expect(active).toBe(0);
    expect(dbState.deckCards).toHaveLength(1);
  });
});

// ── syncCardDefinitions ──────────────────────────────────────────

describe("syncCardDefinitions", () => {
  /** Serve categories.json plus one card file from the given shipped cards. */
  function serveCards(shipped: Card[]) {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("categories.json")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            categories: [
              { id: "berlin", name: "Berlin", nameEn: "Berlin", description: "",
                icon: "map-pin", files: { A1: ["a1-berlin.json"] } },
            ],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => shipped };
    });
  }

  beforeEach(() => {
    dbState.cards = [];
    dbState.deckCards = [];
    dbState.reviewRecords = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("corrects the level of a card already on the device", async () => {
    // The card was shipped as B1 and is stored as B1; the files now say A1.
    dbState.cards = [card("b1-b-001", "berlin", "B1")];
    dbState.deckCards = [{ cardId: "b1-b-001", active: true, addedAt: NOW }];
    dbState.reviewRecords = [
      { cardId: "b1-b-001", easeFactor: 2.9, interval: 7, repetitions: 4,
        dueDate: NOW + 1000, status: "mastered" },
    ];
    serveCards([card("b1-b-001", "berlin", "A1")]);

    const result = await syncCardDefinitions();

    expect(dbState.cards[0].level).toBe("A1");
    expect(result).toEqual({ updated: 1, added: 0 });
  });

  it("leaves review history and deck membership untouched for known cards", async () => {
    dbState.cards = [card("b1-b-001", "berlin", "B1")];
    dbState.deckCards = [{ cardId: "b1-b-001", active: true, addedAt: NOW }];
    dbState.reviewRecords = [
      { cardId: "b1-b-001", easeFactor: 2.9, interval: 7, repetitions: 4,
        dueDate: NOW + 1000, status: "mastered" },
    ];
    serveCards([card("b1-b-001", "berlin", "A1")]);

    await syncCardDefinitions();

    expect(dbState.reviewRecords).toEqual([
      { cardId: "b1-b-001", easeFactor: 2.9, interval: 7, repetitions: 4,
        dueDate: NOW + 1000, status: "mastered" },
    ]);
    expect(dbState.deckCards).toEqual([{ cardId: "b1-b-001", active: true, addedAt: NOW }]);
  });

  it("gives a card that is new to this device its deck entry and SRS state, inactive", async () => {
    dbState.cards = [card("b1-b-001", "berlin", "B1")];
    dbState.deckCards = [{ cardId: "b1-b-001", active: true, addedAt: NOW }];
    serveCards([card("b1-b-001", "berlin", "B1"), card("a1-b-001", "berlin", "A1")]);

    const result = await syncCardDefinitions();

    expect(result).toEqual({ updated: 1, added: 1 });
    expect(dbState.cards).toHaveLength(2);
    const added = dbState.deckCards.find((d) => d.cardId === "a1-b-001");
    expect(added?.active).toBe(false);
    expect(dbState.reviewRecords.find((r) => r.cardId === "a1-b-001")?.status).toBe("new");
  });

  it("does nothing when the shipped files are empty", async () => {
    dbState.cards = [card("b1-b-001", "berlin", "B1")];
    serveCards([]);

    const result = await syncCardDefinitions();

    expect(result).toEqual({ updated: 0, added: 0 });
    expect(dbState.cards).toHaveLength(1);
  });
});
