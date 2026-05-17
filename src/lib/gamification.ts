/** XP required to reach level N (level 1 = 0 XP). */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.floor(100 * Math.pow(n, 1.5));
}

/** Current level for a given total XP. Always ≥ 1. */
export function levelForXP(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}
