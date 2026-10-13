import type { CEFRLevel } from "@/types";

/** CEFR levels, ascending. */
export const CEFR_ORDER: readonly CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1"] as const;

/**
 * Every level up to and including `level`.
 *
 * Reaching B1 does not mean every A1 word stuck, so picking a level opts you
 * into everything below it by default. Narrowing happens in Settings.
 */
export function cumulativeLevels(level: CEFRLevel): CEFRLevel[] {
  const i = CEFR_ORDER.indexOf(level);
  return i === -1 ? [level] : CEFR_ORDER.slice(0, i + 1);
}

/** Sort a level selection into CEFR order. */
export function sortLevels(levels: CEFRLevel[]): CEFRLevel[] {
  return [...levels].sort((a, b) => CEFR_ORDER.indexOf(a) - CEFR_ORDER.indexOf(b));
}
