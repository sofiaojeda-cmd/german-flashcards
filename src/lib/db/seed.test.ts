import { describe, it, expect, vi, beforeEach } from "vitest";
import { recomputeActiveDeck } from "./seed";
import type { Card, DeckCard } from "@/types";

// Fake Dexie handle. recomputeActiveDeck only touches cards and deckCards.
const dbState = vi.hoisted(() => ({
  cards: [] as Card[],
  deckCards: [] as DeckCard[],
}));

vi.mock("@/lib/db/schema", () => ({
  default: {
    cards: {
      toArray: async () => dbState.cards,
    },
    deckCards: {
      toArray: async () => dbState.deckCards,
      toCollection: () => ({
        modify: async (fn: (d: DeckCard) => void) => {
          for (const d of dbState.deckCards) fn(d);
        },
      }),
    },
  },
}));

const NOW = 1_700_000_000_000;

function card(id: string, topic: string, level: Card["level"]): Card {
  return { id, level, topics: [topic], front: `front-${id}`, back: `back-${id}` };
}

/** Seed the fake DB. Every deck card starts with the given active value. */
function seedFakeDb(cards: Card[], active: boolean) {
  dbState.cards = cards;
  dbState.deckCards = cards.map((c) => ({ cardId: c.id, active, addedAt: NOW }));
}

const activeIds = () => dbState.deckCards.filter((d) => d.active).map((d) => d.cardId);

describe("recomputeActiveDeck", () => {
  beforeEach(() => {
    dbState.cards = [];
    dbState.deckCards = [];
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
