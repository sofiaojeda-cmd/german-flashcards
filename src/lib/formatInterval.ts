/**
 * Converts an SM-2 interval (days, can be fractional) to natural-language text
 * for display under rating buttons on the review screen.
 */
export function formatInterval(days: number): string {
  if (days < 1 / 24) return "in a sec";
  if (days < 1)      return "later today";
  if (days < 2)      return "tomorrow";

  const weeks  = Math.round(days / 7);
  const months = Math.round(days / 30);
  const years  = Math.round(days / 365);

  if (days < 7)   return `in ${Math.round(days)} days`;
  if (days < 14)  return "in a week";
  if (days < 30)  return `in ${weeks} weeks`;
  if (days < 365) return months === 1 ? "in a month" : `in ${months} months`;
  return years === 1 ? "in a year" : `in ${years} years`;
}
