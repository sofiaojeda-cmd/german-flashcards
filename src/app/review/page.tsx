"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelCard, PixelProgressBar, PixelDialog, PixelDialogActions } from "@/components/pixel";
import { getDueCards, applyReview, markAsKnown } from "@/lib/srs/sm2";
import { Sprite } from "@/components/Sprite";
import { ReviewCard } from "./ReviewCard";
import { RatingButtons } from "./RatingButtons";
import { SessionComplete } from "./SessionComplete";
import type { Card, ReviewRecord, ReviewQuality } from "@/types";

// ── Types ────────────────────────────────────────────────────────

type DueCard = { card: Card; record: ReviewRecord };

type Phase =
  | { name: "loading" }
  | { name: "empty" }
  | {
      name: "reviewing";
      queue: DueCard[];
      index: number;
      flipped: boolean;
      busy: boolean;
      reviewed: number;
      /** True after "Forgot" — shows dwell UI until user clicks "Got it, next card" */
      dwellForgot: boolean;
    }
  | { name: "complete"; reviewed: number; xpEarned: number; dailyGoalHit: boolean };

type Action =
  | { type: "LOADED"; queue: DueCard[]; dailyGoal: number }
  | { type: "TOGGLE_FLIP" }
  | { type: "RATE_START" }
  | { type: "DWELL_FORGOT" }
  | { type: "ADVANCE"; dailyGoal: number };

// ── Reducer ──────────────────────────────────────────────────────

function reducer(state: Phase, action: Action): Phase {
  switch (action.type) {
    case "LOADED":
      if (action.queue.length === 0) return { name: "empty" };
      return {
        name: "reviewing",
        queue: action.queue,
        index: 0,
        flipped: false,
        busy: false,
        reviewed: 0,
        dwellForgot: false,
      };

    case "TOGGLE_FLIP":
      if (state.name !== "reviewing" || state.dwellForgot) return state;
      return { ...state, flipped: !state.flipped };

    case "RATE_START":
      if (state.name !== "reviewing") return state;
      return { ...state, busy: true };

    case "DWELL_FORGOT":
      if (state.name !== "reviewing") return state;
      // DB write already happened — just swap to dwell UI, keep card flipped
      return { ...state, busy: false, dwellForgot: true };

    case "ADVANCE": {
      if (state.name !== "reviewing") return state;
      const reviewed = state.reviewed + 1;
      const nextIndex = state.index + 1;
      if (nextIndex >= state.queue.length) {
        const xpEarned = reviewed * 10 + (reviewed >= action.dailyGoal ? 50 : 0);
        return { name: "complete", reviewed, xpEarned, dailyGoalHit: reviewed >= action.dailyGoal };
      }
      return {
        ...state,
        index: nextIndex,
        flipped: false,
        busy: false,
        reviewed,
        dwellForgot: false,
      };
    }

    default:
      return state;
  }
}

// ── Page ─────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const [state, dispatch] = React.useReducer(reducer, { name: "loading" });
  const dailyGoalRef = React.useRef(20);
  const [showExitDialog, setShowExitDialog] = React.useState(false);

  // Escape key: open exit dialog when reviewing; let Radix handle close when dialog is open
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (state.name !== "reviewing") return;
      if (showExitDialog) return;
      e.preventDefault();
      setShowExitDialog(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.name, showExitDialog]);

  // Load queue on mount
  React.useEffect(() => {
    async function load() {
      let dailyGoal = 20;
      try {
        const db = (await import("@/lib/db/schema")).default;
        const settings = await db.settings.get("user");
        if (settings) dailyGoal = settings.dailyGoal;
      } catch {
        // settings not available — use default
      }
      dailyGoalRef.current = dailyGoal;
      const queue = await getDueCards(dailyGoal);
      dispatch({ type: "LOADED", queue, dailyGoal });
    }
    load();
  }, []);

  // Flush XP + progress to DB when session completes
  React.useEffect(() => {
    if (state.name !== "complete") return;
    const { xpEarned, reviewed } = state as Extract<Phase, { name: "complete" }>;
    async function flushProgress() {
      try {
        const db = (await import("@/lib/db/schema")).default;
        const { levelForXP } = await import("@/lib/gamification");
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        await db.transaction("rw", db.progress, async () => {
          const existing = await db.progress.get("user");
          // Upsert — handles the case where reset was run without re-seeding
          const p = existing ?? {
            id: "user" as const,
            xp: 0,
            level: 1,
            streakDays: 0,
            todayReviewed: 0,
            todayDate: today,
          };
          const newXP = p.xp + xpEarned;
          const isNewDay = p.todayDate !== today;
          // Streak: only update on the first review of a given day
          let newStreakDays = p.streakDays;
          let newLastStreakDate = p.lastStreakDate;
          if (p.lastStreakDate !== today) {
            newStreakDays = p.lastStreakDate === yesterday ? p.streakDays + 1 : 1;
            newLastStreakDate = today;
          }
          await db.progress.put({
            ...p,
            id: "user",
            xp: newXP,
            level: levelForXP(newXP),
            streakDays: newStreakDays,
            lastStreakDate: newLastStreakDate,
            todayReviewed: isNewDay ? reviewed : p.todayReviewed + reviewed,
            todayDate: today,
          });
        });
      } catch {
        // best-effort
      }
    }
    flushProgress();
  }, [state.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRate = React.useCallback(
    async (quality: ReviewQuality) => {
      if (state.name !== "reviewing") return;
      dispatch({ type: "RATE_START" });

      const { record } = state.queue[state.index];
      const updated = applyReview(record, quality);

      try {
        const db = (await import("@/lib/db/schema")).default;
        await db.reviewRecords.put(updated);
      } catch {
        // DB write failed — still advance so the user isn't stuck
      }

      if (quality === 0) {
        // "Forgot" — stay on card, show dwell UI
        dispatch({ type: "DWELL_FORGOT" });
      } else {
        dispatch({ type: "ADVANCE", dailyGoal: dailyGoalRef.current });
      }
    },
    [state]
  );

  const handleKnown = React.useCallback(async () => {
    if (state.name !== "reviewing") return;
    dispatch({ type: "RATE_START" });

    const { card } = state.queue[state.index];
    try {
      await markAsKnown(card.id);
    } catch {
      // best-effort
    }

    dispatch({ type: "ADVANCE", dailyGoal: dailyGoalRef.current });
  }, [state]);

  const handleAdvanceFromDwell = React.useCallback(() => {
    dispatch({ type: "ADVANCE", dailyGoal: dailyGoalRef.current });
  }, []);

  // Card flip: disabled during dwell or while a rating write is in-flight
  const handleFlip = React.useCallback(() => {
    dispatch({ type: "TOGGLE_FLIP" });
  }, []);

  // ── Render ────────────────────────────────────────────────────

  if (state.name === "loading") {
    return <Shell><LoadingState /></Shell>;
  }

  if (state.name === "empty") {
    return (
      <Shell>
        <EmptyState onBack={() => router.push("/dashboard")} />
      </Shell>
    );
  }

  if (state.name === "complete") {
    return (
      <Shell>
        <SessionComplete
          reviewed={state.reviewed}
          xpEarned={state.xpEarned}
          dailyGoalHit={state.dailyGoalHit}
        />
      </Shell>
    );
  }

  // reviewing
  const { queue, index, flipped, busy, dwellForgot } = state;
  const { card, record } = queue[index];
  const progress = Math.round((index / queue.length) * 100);

  // Card is clickable unless we're in dwell mode or mid-write
  const cardFlipHandler = !dwellForgot && !busy ? handleFlip : undefined;

  // Top-anchored: flex-start + fixed top padding keeps every region at a stable y.
  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "var(--review-padding-top) var(--review-padding-x) 16px",
        fontFamily: "var(--font-pixel)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "var(--review-col-gap)",
          width: "100%",
          maxWidth: "720px",
        }}
      >
        {/* Progress header — always at same y-position */}
        <div style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "18px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <BackArrow onClick={() => setShowExitDialog(true)} />
              <span style={{ color: "var(--text-muted)" }}>Card {index + 1} of {queue.length}</span>
            </div>
            {card.topics[0] && (
              <span
                style={{
                  color: "var(--text-muted)",
                  border: "2px solid var(--text-muted)",
                  padding: "4px 12px",
                  fontSize: "18px",
                  fontFamily: "var(--font-pixel)",
                }}
              >
                {card.topics[0]}
              </span>
            )}
          </div>
          <PixelProgressBar
            value={progress}
            variant="goal"
            segments={Math.min(queue.length, 20)}
          />
        </div>

        {/* Card — always clickable unless dwell/busy */}
        <ReviewCard card={card} flipped={flipped} onFlip={cardFlipHandler} />

        {/* Button area — fixed height prevents layout shift; top-anchored so
            content always starts at 48px below the card, never shifts inward */}
        <div
          style={{
            width: "100%",
            minHeight: "var(--review-btn-area-min-height)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          {dwellForgot ? (
            <DwellPrompt onNext={handleAdvanceFromDwell} />
          ) : !flipped ? (
            <PixelButton
              size="lg"
              onClick={() => dispatch({ type: "TOGGLE_FLIP" })}
              style={{ width: "100%", padding: "16px 8px" }}
            >
              Flip card
            </PixelButton>
          ) : (
            <RatingButtons
              record={record}
              busy={busy}
              onRate={handleRate}
              onKnown={handleKnown}
            />
          )}
        </div>
      </div>

      <PixelDialog
        open={showExitDialog}
        onOpenChange={(open) => { if (!open) setShowExitDialog(false); }}
        title="Leaving so soon?"
        portrait={<Sprite name="mascot-waving" size={72} />}
      >
        <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: "0 0 16px", lineHeight: 1.4 }}>
          Cards you&apos;ve already rated are saved. But you&apos;ll lose your place in
          this session and miss the daily-goal bonus if you haven&apos;t hit it yet.
        </p>
        <PixelDialogActions>
          <PixelButton size="sm" variant="danger" onClick={() => router.push("/dashboard")}>
            Leave session
          </PixelButton>
          <PixelButton size="sm" variant="default" onClick={() => setShowExitDialog(false)}>
            Keep reviewing
          </PixelButton>
        </PixelDialogActions>
      </PixelDialog>
    </div>
  );
}

// ── Dwell prompt (shown after "Forgot") ──────────────────────────

function DwellPrompt({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <p style={{ fontSize: "18px", color: "var(--text-muted)", margin: 0 }}>
        Take a moment to memorize, then continue
      </p>
      <PixelButton size="lg" onClick={onNext}>
        Got it, next card
      </PixelButton>
    </div>
  );
}

// ── Shell ────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "var(--font-pixel)",
      }}
    >
      {children}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <PixelCard style={{ maxWidth: "480px", textAlign: "center", padding: "40px 32px" }}>
      <p style={{ fontSize: "40px", margin: "0 0 8px" }}>All done!</p>
      <p style={{ fontSize: "22px", color: "var(--text-muted)", margin: "0 0 32px" }}>
        No cards due right now. Come back later.
      </p>
      <PixelButton onClick={onBack}>Back to dashboard</PixelButton>
    </PixelCard>
  );
}

// ── Loading state ────────────────────────────────────────────────

function LoadingState() {
  return (
    <p style={{ color: "var(--text-light)", fontSize: "24px" }}>Loading…</p>
  );
}

// ── Back arrow button ─────────────────────────────────────────────

function BackArrow({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      aria-label="Exit session"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none",
        border: "none",
        padding: "4px",
        cursor: "pointer",
        color: hovered ? "var(--text-primary)" : "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* Pixel chevron pointing left */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="currentColor"
        shapeRendering="crispEdges"
        aria-hidden
      >
        <rect x="10" y="2" width="2" height="2" />
        <rect x="8"  y="4" width="2" height="2" />
        <rect x="6"  y="6" width="2" height="2" />
        <rect x="4"  y="7" width="2" height="2" />
        <rect x="6"  y="9" width="2" height="2" />
        <rect x="8"  y="11" width="2" height="2" />
        <rect x="10" y="13" width="2" height="2" />
      </svg>
    </button>
  );
}

