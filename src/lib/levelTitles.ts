const LEVEL_TITLES = [
  null,               // index 0 unused
  "Anfänger",         // Level 1
  "Wanderer",         // Level 2
  "Lerner",           // Level 3
  "Student",          // Level 4
  "Sprachfreund",     // Level 5
  "Sprachkenner",     // Level 6
  "Wortschmied",      // Level 7
  "Sprachfuchs",      // Level 8
  "Linguist",         // Level 9
  "Polyglott",        // Level 10
  "Sprachgelehrter",  // Level 11
  "Sprachmeister",    // Level 12
  "Eloquenz",         // Level 13
  "Wortzauberer",     // Level 14
  "Sprachgott",       // Level 15 (max — see CLAUDE.md)
];

export function getTitleForLevel(level: number): string {
  if (level >= LEVEL_TITLES.length) return LEVEL_TITLES[LEVEL_TITLES.length - 1]!;
  return LEVEL_TITLES[level] ?? "Anfänger";
}
