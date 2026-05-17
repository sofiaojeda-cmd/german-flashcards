"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelCard, PixelCheckbox, PixelDialog, PixelDialogActions } from "@/components/pixel";
import { Sprite } from "@/components/Sprite";
import type { Category } from "@/types";
import type { SettingsData } from "@/lib/db/settings";

// ── Types ─────────────────────────────────────────────────────────

type GoalOption = 10 | 20 | 30;
const GOAL_OPTIONS: GoalOption[] = [10, 20, 30];

// ── Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = React.useState<SettingsData | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [localTopics, setLocalTopics] = React.useState<string[]>([]);
  const [topicError, setTopicError] = React.useState("");
  const [topicBusy, setTopicBusy] = React.useState(false);
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const { backfillMissingTopics, getSettings } = await import("@/lib/db/settings");

      // One-time migration: seed dormant topics for users onboarded before seed-all-cards
      await backfillMissingTopics();

      const [settings, catRes] = await Promise.all([
        getSettings(),
        fetch("/api/cards/categories.json").then((r) => r.json()),
      ]);

      if (!settings) {
        router.push("/onboarding");
        return;
      }

      setData(settings);
      setLocalTopics(settings.topics);
      setCategories(catRes.categories as Category[]);
    }
    load();
  }, [router]);

  const handleDailyGoal = async (goal: GoalOption) => {
    if (!data || data.dailyGoal === goal) return;
    setData((d) => d && { ...d, dailyGoal: goal });
    const { updateDailyGoal } = await import("@/lib/db/settings");
    await updateDailyGoal(goal);
  };

  const handleTopicToggle = async (topicId: string, checked: boolean) => {
    if (!checked && localTopics.length <= 1) {
      setTopicError("At least one topic required.");
      return;
    }
    setTopicError("");
    setTopicBusy(true);
    try {
      const { toggleTopic } = await import("@/lib/db/settings");
      const newTopics = await toggleTopic(topicId, checked, localTopics);
      setLocalTopics(newTopics);
    } catch {
      // toggleTopic throws "at-least-one" but we guard above — ignore
    } finally {
      setTopicBusy(false);
    }
  };

  const allTopicsSelected =
    categories.length > 0 && categories.every((c) => localTopics.includes(c.id));

  const handleToggleAll = async () => {
    setTopicError("");
    setTopicBusy(true);
    try {
      const { toggleTopic } = await import("@/lib/db/settings");
      if (allTopicsSelected) {
        // Deselect all except the first — at-least-one rule
        let current = [...localTopics];
        const toDeactivate = categories
          .map((c) => c.id)
          .filter((id) => current.includes(id))
          .slice(1); // keep first
        for (const id of toDeactivate) {
          current = await toggleTopic(id, false, current);
        }
        setLocalTopics(current);
      } else {
        // Select all that aren't already active
        let current = [...localTopics];
        for (const cat of categories) {
          if (!current.includes(cat.id)) {
            current = await toggleTopic(cat.id, true, current);
          }
        }
        setLocalTopics(current);
      }
    } finally {
      setTopicBusy(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const { resetAllProgress } = await import("@/lib/db/settings");
      await resetAllProgress();
      router.push("/dashboard");
    } finally {
      setResetting(false);
    }
  };

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
        <p style={{ color: "var(--text-muted)", fontSize: "24px" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-base)",
        padding: "40px 24px 48px",
        fontFamily: "var(--font-pixel)",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BackArrow onClick={() => router.push("/dashboard")} />
          <h1 style={{ margin: 0, fontSize: "32px", color: "var(--text-light)", lineHeight: 1 }}>
            Settings
          </h1>
        </div>

        {/* ── Profile ── */}
        <Section title="Profile">
          <InfoRow label="Level" value="B1" note="More levels coming soon" />
          <InfoRow label="Streak" value={`${data.streakDays} day${data.streakDays !== 1 ? "s" : ""}`} />
          <InfoRow label="Total XP" value={`${data.xp.toLocaleString()} XP`} />
        </Section>

        {/* ── Study preferences ── */}
        <Section title="Study preferences">
          {/* Daily goal */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: "0 0 4px" }}>
              Daily review goal
            </p>
            <p style={{ fontSize: "17px", color: "var(--text-muted)", margin: "0 0 12px" }}>
              How many cards you'll review each day
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {GOAL_OPTIONS.map((goal) => (
                <PixelButton
                  key={goal}
                  variant="secondary"
                  size="sm"
                  selected={data.dailyGoal === goal}
                  onClick={() => handleDailyGoal(goal)}
                  style={{ flex: 1, textAlign: "center" }}
                >
                  {goal} cards
                </PixelButton>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
              <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: 0 }}>
                Topics in your deck
              </p>
              <button
                onClick={handleToggleAll}
                disabled={topicBusy}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: topicBusy ? "not-allowed" : "pointer",
                  fontSize: "17px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-pixel)",
                  textDecoration: "underline",
                  flexShrink: 0,
                  opacity: topicBusy ? 0.45 : 1,
                }}
              >
                {allTopicsSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <p style={{ fontSize: "17px", color: "var(--text-muted)", margin: "0 0 12px" }}>
              Add or remove topics. Progress is preserved when you disable a topic.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {categories.map((cat) => {
                const isActive = localTopics.includes(cat.id);
                return (
                  <PixelCheckbox
                    key={cat.id}
                    checked={isActive}
                    disabled={topicBusy}
                    onChange={(checked) => handleTopicToggle(cat.id, checked)}
                    label={
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <img
                          src={`/sprites/category-${cat.id}.png`}
                          width={18}
                          height={18}
                          alt=""
                          style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
                        />
                        {cat.nameEn}
                      </span>
                    }
                  />
                );
              })}
            </div>
            {topicError && (
              <p style={{ fontSize: "17px", color: "var(--accent-red)", margin: "10px 0 0" }}>
                {topicError}
              </p>
            )}
          </div>
        </Section>

        {/* ── Audio ── */}
        <Section title="Audio">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: "0 0 2px" }}>
                Sound effects
              </p>
              <p style={{ fontSize: "16px", color: "var(--text-muted)", margin: 0 }}>
                Coming soon
              </p>
            </div>
            {/* Disabled toggle placeholder */}
            <div
              style={{
                width: "48px",
                height: "26px",
                backgroundColor: "var(--border-mid)",
                border: "2px solid var(--border-dark)",
                opacity: 0.45,
                cursor: "not-allowed",
                flexShrink: 0,
              }}
            />
          </div>
        </Section>

        {/* ── Danger zone ── */}
        <PixelCard style={{ display: "flex", flexDirection: "column", gap: "12px", border: "3px solid var(--accent-red)" }}>
          <p
            style={{
              fontSize: "22px",
              color: "var(--accent-red)",
              margin: 0,
              borderBottom: "2px solid var(--border-mid)",
              paddingBottom: "10px",
            }}
          >
            Reset
          </p>
          <p style={{ fontSize: "18px", color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
            This will reset your progress (streak, XP, and all card review history). Your deck
            stays. You'll start fresh from your current topics.
          </p>
          <div>
            <PixelButton
              variant="danger"
              size="sm"
              onClick={() => setShowResetDialog(true)}
            >
              Reset all progress
            </PixelButton>
          </div>
        </PixelCard>

        {/* ── About ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            fontSize: "17px",
            color: "var(--text-muted)",
          }}
        >
          <p style={{ margin: 0 }}>Made with ♥ in Berlin by Sofia Ojeda, with the help of Claude</p>
          <p style={{ margin: 0 }}>Version 0.1 (still cooking)</p>
          <button
            onClick={() => router.push("/onboarding")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: "17px",
              color: "var(--text-primary)",
              fontFamily: "var(--font-pixel)",
              textDecoration: "underline",
              textAlign: "left",
            }}
          >
            Re-run onboarding →
          </button>
        </div>
      </div>

      {/* ── Reset confirmation dialog ── */}
      <PixelDialog
        open={showResetDialog}
        onOpenChange={(open) => { if (!open) setShowResetDialog(false); }}
        title="Reset everything?"
        portrait={<Sprite name="mascot-thinking" size={72} />}
      >
        <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: "0 0 16px", lineHeight: 1.4 }}>
          This permanently deletes your streak, XP, and all card review history. You can&apos;t
          undo this. Are you sure?
        </p>
        <PixelDialogActions>
          <PixelButton
            size="sm"
            variant="danger"
            disabled={resetting}
            onClick={handleReset}
          >
            {resetting ? "Resetting…" : "Yes, reset"}
          </PixelButton>
          <PixelButton
            size="sm"
            variant="default"
            onClick={() => setShowResetDialog(false)}
          >
            Keep my progress
          </PixelButton>
        </PixelDialogActions>
      </PixelDialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function BackArrow({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      aria-label="Back to dashboard"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none",
        border: "none",
        padding: "4px",
        cursor: "pointer",
        color: hovered ? "var(--text-light)" : "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="currentColor"
        shapeRendering="crispEdges"
        aria-hidden
      >
        <rect x="10" y="2" width="2" height="2" />
        <rect x="8" y="4" width="2" height="2" />
        <rect x="6" y="6" width="2" height="2" />
        <rect x="4" y="7" width="2" height="2" />
        <rect x="6" y="9" width="2" height="2" />
        <rect x="8" y="11" width="2" height="2" />
        <rect x="10" y="13" width="2" height="2" />
      </svg>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PixelCard style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p
        style={{
          fontSize: "22px",
          color: "var(--text-primary)",
          margin: 0,
          borderBottom: "2px solid var(--border-mid)",
          paddingBottom: "10px",
        }}
      >
        {title}
      </p>
      {children}
    </PixelCard>
  );
}

function InfoRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "16px" }}>
      <span style={{ fontSize: "20px", color: "var(--text-primary)" }}>{label}</span>
      <span style={{ textAlign: "right" }}>
        <span style={{ fontSize: "20px", color: "var(--text-primary)" }}>{value}</span>
        {note && (
          <span style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "8px" }}>
            {note}
          </span>
        )}
      </span>
    </div>
  );
}
