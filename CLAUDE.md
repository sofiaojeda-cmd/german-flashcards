# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
```

## Stack

- **Next.js 16** — App Router, TypeScript, `src/` directory, path alias `@/*` → `src/*`
- **Tailwind CSS v4** — configured entirely via `src/app/globals.css` (no `tailwind.config.ts`)
- **Dexie.js** — IndexedDB wrapper; all card data and review history lives here
- **Zustand** — UI state only (session state, modals, etc.) — not card data
- **Framer Motion** — XP float animation and level-up sequence only; card flip uses CSS
- **Vitest** — test runner (`vitest.config.ts` at root)

## Architecture

### Data flow
```
data/cards/*.json  ──(seed on first launch)──▶  IndexedDB (Dexie)
                                                       │
                                              src/lib/db/schema.ts
                                              src/lib/db/seed.ts
                                                       │
                                              Zustand store (UI state)
                                                       │
                                              React components / pages
```

### Key directories
- `data/cards/` — 16 hand-curated JSON files (categories.json + 15 B1 deck files). **Do not regenerate or modify card data without confirming with the user.**
- `src/types/index.ts` — canonical types: `Card`, `Category`, `ReviewRecord`, `UserSettings`, `UserProgress`
- `src/lib/sm2.ts` — SM-2 spaced repetition algorithm (with unit tests in `sm2.test.ts`)
- `src/lib/gamification.ts` — XP formula, level thresholds, streak logic
- `src/lib/db/` — Dexie schema and seed loader
- `src/components/pixel/` — base component library: `PixelButton`, `PixelCard`, `PixelInput`, `PixelProgressBar`, `PixelDialog`
- `src/store/useAppStore.ts` — Zustand store
- `src/hooks/useUserLevel.ts` — reads `db.progress.level` and returns the user's numeric level (1–15); use this to drive character portrait sprites

### Pages (App Router)
| Route | Purpose |
|---|---|
| `/` | Redirects to `/dashboard` or `/onboarding` based on `localStorage.onboardingComplete` |
| `/onboarding` | 3-step level/topics/goal flow (shown once) |
| `/dashboard` | Streak, XP, daily goal, "Start Review" CTA |
| `/review` | Full-screen card flip review session |
| `/decks` | Browse categories, toggle topics |
| `/browse` | Table view of all cards with SRS state |
| `/settings` | Change level, topics, daily goal; reset progress |
| `/components` | Pixel component demo (not linked from nav) |

## Design system

**Hard rules — never break these:**
- No rounded corners (`border-radius: 0 !important` in globals.css)
- No smooth gradients
- No colors outside the palette below
- No sans-serif fonts mixed in — VT323 only

**Color palette** (CSS custom properties in `globals.css`):
| Token | Hex | When to use |
|---|---|---|
| `--bg-base` | `#4a3826` | Page background |
| `--bg-panel` | `#d9b48a` | Cards, panels, dialogs |
| `--bg-panel-dark` | `#8b5a3c` | Nested panels, button bodies |
| `--border-dark` | `#2d1f14` | All primary borders |
| `--border-mid` | `#6b4423` | Secondary borders |
| `--text-primary` | `#2d1f14` | Text on light panels |
| `--text-light` | `#f4e4c1` | Text on dark backgrounds |
| `--text-muted` | `#8b6f47` | Faded / secondary text |
| `--accent-gold` | `#f0c050` | XP, coins, button text |
| `--accent-green` | `#6ab04c` | Success, "Good" rating, `das` articles |
| `--accent-red` | `#c0392b` | Errors, "Again" rating, `die` articles |
| `--accent-blue` | `#4a90d9` | Info, `der` articles |
| `--accent-purple` | `#8e44ad` | Streaks, special events |
| `--shadow` | `#1a0f08` | Hard offset shadow |

**Box shadows:** `3px 3px 0 var(--shadow)` (panels), `4px 4px 0 var(--shadow)` (large panels), `inset 2px 2px 0 var(--shadow)` (inputs).

**Article gender colors in review UI:** `der` → `--accent-blue`, `die` → `--accent-red`, `das` → `--accent-green`.

## Card data rules

- **Never invent or guess German genders.** Always look up the article in the JSON files.
- All 470 cards are B1 level. CEFR filtering in v1: show B1 cards to all users with a subtle "above your level" notice for A1/A2 users.
- `categories.json` only has a `file` field for the base deck. The seeding logic infers the extra file as `b1-{category}-extra.json` (berlin has no extra file).
- `partOfSpeech` values include `"noun (plural)"` and `"noun phrase"` in addition to `"noun"` — gender can be set on all three.

## Gamification formulas

- XP per card reviewed: +10
- XP bonus for completing daily queue: +50
- XP at streak milestones (7, 30, 100 days): +25
- Level N requires: `Math.floor(100 * Math.pow(N, 1.5))` XP
- **Level cap: 15.** `src/lib/levelTitles.ts` has exactly 15 titles (Anfänger → Sprachgott). Do not add a Level 16 entry without a corresponding hand-drawn character sprite in `public/sprites/character-level-16.png`.
- **Two separate character types — never mix them:**
  - **Character sprites** (`character-level-1.png` … `character-level-15.png`): the USER's avatar (a baby otter that grows up). Use `useUserLevel()` to pick the right sprite. Appears only in dashboard HeroStrip and profile/progress views.
  - **Mascot sprites** (`mascot-happy.png`, `mascot-thinking.png`, `mascot-waving.png`): the app's GUIDE — a mature, neutral otter that narrates. Appears in all dialogs (exit, session complete, reset confirmation) and empty states. Never replaced by the user's level character.

## Audio

Audio is wired up but no assets exist yet. Toggle lives in Settings. Chime goes at `public/audio/chime.mp3` — leave a TODO comment at the trigger site.
