/**
 * Sprite — renders a pixel-art PNG from /public/sprites/.
 *
 * Two character types:
 *   - character-level-{1..15}.png — the USER's avatar, levels up with XP.
 *     Use with useUserLevel(). Appears in dashboard HeroStrip and profile views only.
 *   - mascot-{happy,thinking,waving}.png — the app's GUIDE, always a mature neutral otter.
 *     Use in dialogs and empty states. Never swapped for the user's level character.
 *
 * Other sprites:
 *   - Category icons: 48×48px, category-{id}.png
 *   - UI icons: streak-flame (32×32), xp-coin/search/gear (24×24), level-trophy (96×96)
 *
 * Usage:
 *   <Sprite name={`character-level-${userLevel}`} size={96} />  ← dashboard
 *   <Sprite name="mascot-thinking" size={72} />                  ← dialogs
 *   <Sprite name="category-food" size={48} alt="Food category" />
 */

import * as React from "react";

const DEFAULT_SIZES: Record<string, number> = {
  "mascot-happy": 96,
  "mascot-thinking": 96,
  "mascot-waving": 96,
  "level-trophy": 96,
  "streak-flame": 32,
  "xp-coin": 24,
  "category-everyday": 48,
  "category-food": 48,
  "category-politics": 48,
  "category-astrology": 48,
  "category-animals": 48,
  "category-fitness": 48,
  "category-self-improvement": 48,
  "category-berlin": 48,
};

type SpriteProps = {
  name: string;
  size?: number;
  alt?: string;
};

export function Sprite({ name, size, alt = "" }: SpriteProps) {
  const resolvedSize = size ?? DEFAULT_SIZES[name] ?? 48;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/sprites/${name}.png`}
      width={resolvedSize}
      height={resolvedSize}
      alt={alt}
      style={{ imageRendering: "pixelated", display: "block" }}
      draggable={false}
    />
  );
}
