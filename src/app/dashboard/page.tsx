"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import db from "@/lib/db/schema";
import { getVocabStats } from "@/lib/srs/sm2";
import { xpForLevel } from "@/lib/gamification";
import { getTitleForLevel } from "@/lib/levelTitles";
import { PixelCard, PixelButton, PixelProgressBar } from "@/components/pixel";
import { Sprite } from "@/components/Sprite";

type VocabStats = { total: number; new: number; learning: number; mastered: number; known: number };

type DashData = {
  dueCount: number;
  reviewedToday: number;
  dailyGoal: number;
  xp: number;
  level: number;
  streakDays: number;
  vocabStats: VocabStats;
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = React.useState<DashData | null>(null);

  React.useEffect(() => {
    async function load() {
      const todayStr = new Date().toISOString().slice(0, 10);
      const now = Date.now();
      // IndexedDB can't index booleans — filter active status in JS
      const allDeckCards = await db.deckCards.toArray();
      const activeIds = allDeckCards.filter((d) => d.active).map((d) => d.cardId);
      const [settings, progress, dueCount, vocabStats] = await Promise.all([
        db.settings.get("user"),
        db.progress.get("user"),
        db.reviewRecords
          .where("cardId").anyOf(activeIds)
          .and((r) => r.dueDate <= now && r.status !== "known")
          .count(),
        getVocabStats(),
      ]);
      const reviewedToday =
        progress?.todayDate === todayStr ? (progress.todayReviewed ?? 0) : 0;
      setData({
        dueCount,
        reviewedToday,
        dailyGoal: settings?.dailyGoal ?? 20,
        xp: progress?.xp ?? 0,
        level: progress?.level ?? 1,
        streakDays: progress?.streakDays ?? 0,
        vocabStats,
      });
    }
    load();
  }, []);

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--bg-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-pixel)",
        }}
      >
        <span style={{ color: "var(--text-light)", fontSize: "24px" }}>Loading…</span>
      </div>
    );
  }

  const { dueCount, reviewedToday, dailyGoal, xp, level, streakDays, vocabStats } = data;

  const xpThisLevel = xpForLevel(level);
  const xpNextLevel = xpForLevel(level + 1);
  const xpIntoLevel = xp - xpThisLevel;
  const xpSpan = xpNextLevel - xpThisLevel;
  const xpProgress = Math.round((xpIntoLevel / xpSpan) * 100);
  const goalProgress = Math.min(Math.round((reviewedToday / dailyGoal) * 100), 100);

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--dashboard-padding-top) 24px 48px",
        fontFamily: "var(--font-pixel)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
          maxWidth: "560px",
        }}
      >
        {/* ── Hero strip ── */}
        <PixelCard
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "center",
            padding: "16px 24px",
          }}
        >
          <div
            style={{
              width: "108px",
              height: "108px",
              flexShrink: 0,
              backgroundColor: "var(--bg-panel-dark)",
              border: "3px solid var(--border-dark)",
              boxShadow: "4px 4px 0 var(--shadow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sprite
              name={`character-level-${Math.min(level, 15)}`}
              size={96}
              alt={`Level ${level} character`}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            <span style={{ fontSize: "32px", color: "var(--text-primary)" }}>Guten Tag!</span>
            <div style={{ fontSize: "20px" }}>
              <span style={{ color: "var(--text-muted)" }}>Level {level}: </span>
              <span style={{ color: "var(--text-primary)" }}>{getTitleForLevel(level)}</span>
            </div>
            {streakDays > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sprite name="streak-flame" size={24} alt="" />
                <span style={{ fontSize: "18px", color: "var(--text-muted)" }}>
                  {streakDays} day streak
                </span>
              </div>
            )}
            <GearButton onClick={() => router.push("/settings")} />
          </div>
        </PixelCard>

        {/* ── CTA card (dark — gold text OK) ── */}
        <CTACard
          duePool={dueCount}
          doneToday={reviewedToday}
          goal={dailyGoal}
          onStart={() => router.push("/review")}
        />

        {/* ── Daily goal + XP row ── */}
        <div style={{ display: "flex", gap: "16px" }}>
          <PixelCard style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
              <span style={{ color: "var(--text-primary)" }}>Daily goal</span>
              <span style={{ color: "var(--text-muted)" }}>
                {reviewedToday}/{dailyGoal}
              </span>
            </div>
            <PixelProgressBar value={goalProgress} variant="goal" segments={10} />
          </PixelCard>

          <PixelCard style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
              <span style={{ color: "var(--text-primary)" }}>
                Lv {level} → {level + 1}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{xpIntoLevel} XP</span>
            </div>
            <PixelProgressBar
              value={Math.max(0, Math.min(xpProgress, 100))}
              variant="xp"
              segments={10}
            />
          </PixelCard>
        </div>

        {/* ── Vocab mastery ── */}
        <PixelCard style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "24px", color: "var(--text-primary)" }}>Your vocabulary</span>
            <span style={{ fontSize: "18px", color: "var(--text-muted)" }}>
              {vocabStats.learning + vocabStats.mastered + vocabStats.known} words in your collection
            </span>
          </div>
          {vocabStats.learning + vocabStats.mastered + vocabStats.known === 0 ? (
            <p style={{ fontSize: "18px", color: "var(--text-muted)", margin: 0 }}>
              Your collection is empty. Start a review to add words!
            </p>
          ) : (
            <>
              <PixelProgressBar
                segments={20}
                bands={[
                  { fraction: vocabStats.learning / vocabStats.total, color: "var(--accent-gold)" },
                  { fraction: vocabStats.mastered / vocabStats.total, color: "var(--accent-mastered)" },
                  { fraction: vocabStats.known   / vocabStats.total, color: "var(--accent-green)" },
                ]}
              />
              <p style={{ fontSize: "16px", color: "var(--text-muted)", margin: 0 }}>
                Learning {vocabStats.learning} · Mastered {vocabStats.mastered} · Known {vocabStats.known}
              </p>
            </>
          )}
          <button
            onClick={() => router.push("/vocabulary")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: "18px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-pixel)",
              textAlign: "left",
              textDecoration: "underline",
            }}
          >
            Browse all →
          </button>
        </PixelCard>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

type CTAState = { headline: string; button: string; action: "review" | "browse" };

function resolveCTA(duePool: number, doneToday: number, goal: number): CTAState {
  if (duePool === 0) {
    return {
      headline: "All caught up!",
      button: "Browse vocabulary",
      action: "browse",
    };
  }
  if (doneToday === 0) {
    return {
      headline: `Are you ready for your ${goal} cards?`,
      button: "Let's go!",
      action: "review",
    };
  }
  if (doneToday < goal) {
    return {
      headline: `${goal - doneToday} more to reach your goal`,
      button: "Continue",
      action: "review",
    };
  }
  if (doneToday === goal) {
    return {
      headline: "Daily goal complete!",
      button: "More cards?",
      action: "review",
    };
  }
  // doneToday > goal
  return {
    headline: `${doneToday}/${goal}. Incredible.`,
    button: "Even more?",
    action: "review",
  };
}

function CTACard({
  duePool,
  doneToday,
  goal,
  onStart,
}: {
  duePool: number;
  doneToday: number;
  goal: number;
  onStart: () => void;
}) {
  const router = useRouter();
  const cta = resolveCTA(duePool, doneToday, goal);
  const handleClick = cta.action === "browse" ? () => router.push("/vocabulary") : onStart;
  return (
    <PixelCard
      shade="dark"
      style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "24px" }}
    >
      <span style={{ fontSize: "26px", color: "var(--text-light)" }}>{cta.headline}</span>
      <PixelButton
        size="lg"
        onClick={handleClick}
        style={{
          width: "100%",
          textAlign: "center",
          marginTop: "4px",
          backgroundColor: "var(--bg-base)",
          color: "var(--text-light)",
          border: "4px solid var(--border-dark)",
        }}
      >
        {cta.button}
      </PixelButton>
    </PixelCard>
  );
}


function GearButton({ onClick }: { onClick: () => void }) {
  return (
    <PixelButton
      size="sm"
      onClick={onClick}
      style={{ marginTop: "8px", alignSelf: "flex-start" }}
    >
      Settings
    </PixelButton>
  );
}
