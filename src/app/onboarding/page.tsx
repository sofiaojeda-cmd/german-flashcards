"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelDialogActions, PixelStepIndicator, PixelCheckbox } from "@/components/pixel";
import { Sprite } from "@/components/Sprite";
import { seedCards, deactivateTopicCards } from "@/lib/db/seed";
import db from "@/lib/db/schema";
import type { Category, CEFRLevel, UserSettings } from "@/types";

// ── Level data ───────────────────────────────────────────────────
// Only B1 content is available. B2/C1 shown as roadmap but disabled.
const LEVELS: { value: CEFRLevel; label: string; description: string; available: boolean }[] = [
  { value: "B1", label: "B1", description: "Intermediate — navigate most daily situations", available: true },
  { value: "B2", label: "B2", description: "Upper intermediate — fluent interaction with native speakers", available: false },
  { value: "C1", label: "C1", description: "Advanced — precise, fluid expression on complex topics", available: false },
];

const DAILY_GOALS = [10, 20, 30, 50];

// ── Dialogue box shell (Stardew style, non-modal) ────────────────
function DialogueBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "var(--bg-panel)",
        border: "4px solid var(--border-dark)",
        boxShadow: "6px 6px 0 var(--shadow)",
        padding: "32px 32px 24px",
        maxWidth: "560px",
        width: "100%",
        color: "var(--text-primary)",
        fontFamily: "var(--font-pixel)",
        minHeight: "600px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "4px",
          border: "2px solid var(--border-mid)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}>{children}</div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = React.useState(1);
  const [level, setLevel] = React.useState<CEFRLevel>("B1");
  const [topics, setTopics] = React.useState<string[]>([]);
  const [livesInBerlin, setLivesInBerlin] = React.useState(false);
  const [dailyGoal, setDailyGoal] = React.useState(20);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [saving, setSaving] = React.useState(false);

  // Load non-Berlin categories for topic chips
  React.useEffect(() => {
    fetch("/api/cards/categories.json")
      .then((r) => r.json())
      .then((data) => {
        const nonBerlin = (data.categories as Category[]).filter((c) => c.id !== "berlin");
        setCategories(nonBerlin);
      });
  }, []);

  const toggleTopic = (id: string) => {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const allTopicsSelected = categories.length > 0 && topics.length === categories.length;

  const handleSelectAll = () => {
    if (allTopicsSelected) {
      setTopics([]);
    } else {
      setTopics(categories.map((c) => c.id));
    }
  };

  const canProceedStep3 = topics.length > 0 || livesInBerlin;

  const handleDone = async () => {
    setSaving(true);
    try {
      const allTopics = livesInBerlin ? [...new Set([...topics, "berlin"])] : topics;
      const settings: UserSettings = {
        level,
        topics: allTopics,
        dailyGoal,
        livesInBerlin,
        audioEnabled: false,
        onboardingComplete: true,
      };
      await db.settings.put({ id: "user", ...settings });
      await db.progress.put({
        id: "user",
        xp: 0,
        level: 1,
        streakDays: 0,
        todayReviewed: 0,
        todayDate: new Date().toISOString().slice(0, 10),
      });

      // Seed ALL 470 cards so topic toggling in Settings is lossless.
      // All start active: true, then we deactivate the non-selected ones.
      await seedCards();

      const allCategoryIds = [...categories.map((c) => c.id), "berlin"];
      const selectedSet = new Set(allTopics);
      const toDeactivate = allCategoryIds.filter((id) => !selectedSet.has(id));
      await Promise.all(toDeactivate.map((id) => deactivateTopicCards(id)));

      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

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
      <DialogueBox>
        <PixelStepIndicator currentStep={step} totalSteps={4} />

        {/* centering wrapper — gives each step vertical breathing room inside the fixed-height panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              padding: "8px 0 4px",
            }}
          >
            <Sprite name="mascot-happy" size={128} />
            <h2 style={{ fontSize: "32px", margin: "24px 0 0" }}>Hallo!</h2>
            <div
              style={{
                maxWidth: "480px",
                marginTop: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <p style={{ fontSize: "18px", color: "var(--text-primary)", margin: 0, lineHeight: 1.6 }}>
                i made this because nothing else fit how i wanted to learn.
              </p>
              <p style={{ fontSize: "18px", color: "var(--text-primary)", margin: 0, lineHeight: 1.6 }}>
                470 B1 words across topics i actually care about, smart review timing, and an otter to keep you company.
              </p>
              <p style={{ fontSize: "18px", color: "var(--text-primary)", margin: 0, lineHeight: 1.6 }}>
                if it works for you too, that&apos;s a bonus.
              </p>
            </div>
            <div style={{ marginTop: "32px" }}>
              <PixelButton onClick={() => setStep(2)}>Let&apos;s begin →</PixelButton>
            </div>
          </div>
        )}

        {/* ── Step 2: Level ── */}
        {step === 2 && (
          <>
            <h2 style={{ fontSize: "32px", marginBottom: "8px" }}>Choose your level</h2>
            <p style={{ fontSize: "18px", color: "var(--text-muted)", marginBottom: "24px" }}>
              B1 content available now. Higher levels coming soon.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              {LEVELS.map(({ value, label, description, available }) => (
                <PixelButton
                  key={value}
                  variant="secondary"
                  size="sm"
                  selected={available && level === value}
                  disabled={!available}
                  onClick={() => available && setLevel(value)}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "flex-start",
                    gap: "16px",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    opacity: available ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontSize: "24px", flexShrink: 0, minWidth: "32px" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: "18px" }}>
                    {description}
                    {!available && (
                      <span style={{ marginLeft: "12px", fontSize: "15px" }}>Coming soon</span>
                    )}
                  </span>
                </PixelButton>
              ))}
            </div>
            <PixelDialogActions>
              <PixelButton variant="secondary" onClick={() => setStep(1)}>Back</PixelButton>
              <PixelButton onClick={() => setStep(3)}>Next</PixelButton>
            </PixelDialogActions>
          </>
        )}

        {/* ── Step 3: Topics ── */}
        {step === 3 && (
          <>
            <h2 style={{ fontSize: "32px", marginBottom: "8px" }}>Pick your topics</h2>

            {/* Subtitle row + Select all link */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <p style={{ fontSize: "18px", color: "var(--text-muted)", margin: 0 }}>
                Select at least one topic to study.
              </p>
              <button
                onClick={handleSelectAll}
                disabled={categories.length === 0}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: categories.length === 0 ? "not-allowed" : "pointer",
                  fontSize: "17px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-pixel)",
                  textDecoration: "underline",
                  flexShrink: 0,
                }}
              >
                {allTopicsSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {/* Topic chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
              {categories.length === 0 ? (
                <p style={{ fontSize: "18px", color: "var(--text-muted)" }}>Loading topics…</p>
              ) : (
                categories.map((cat) => (
                  <PixelButton
                    key={cat.id}
                    size="sm"
                    variant="secondary"
                    selected={topics.includes(cat.id)}
                    onClick={() => toggleTopic(cat.id)}
                  >
                    {cat.nameEn}
                  </PixelButton>
                ))
              )}
            </div>

            {/* Berlin checkbox — separate control */}
            <div style={{ marginBottom: "16px" }}>
              <PixelCheckbox
                checked={livesInBerlin}
                onChange={setLivesInBerlin}
                label={
                  <>
                    <span>I live in Berlin</span>
                    <span style={{ fontSize: "17px", color: "var(--text-muted)", marginLeft: "8px" }}>
                      — adds Berlin & Bürokratie deck
                    </span>
                  </>
                }
              />
            </div>

            <div style={{ minHeight: "32px" }}>
              {!canProceedStep3 && (
                <p style={{ fontSize: "17px", color: "var(--accent-red)", margin: 0 }}>
                  Pick at least one topic to continue.
                </p>
              )}
            </div>

            <PixelDialogActions>
              <PixelButton variant="secondary" onClick={() => setStep(2)}>Back</PixelButton>
              <PixelButton onClick={() => setStep(4)} disabled={!canProceedStep3}>
                Next
              </PixelButton>
            </PixelDialogActions>
          </>
        )}

        {/* ── Step 4: Daily goal ── */}
        {step === 4 && (
          <>
            <h2 style={{ fontSize: "32px", marginBottom: "8px" }}>Set a daily goal</h2>
            <p style={{ fontSize: "18px", color: "var(--text-muted)", marginBottom: "24px" }}>
              How many cards do you want to review each day?
            </p>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
              {DAILY_GOALS.map((goal) => (
                <PixelButton
                  key={goal}
                  size="lg"
                  variant="secondary"
                  selected={dailyGoal === goal}
                  onClick={() => setDailyGoal(goal)}
                >
                  {goal}
                </PixelButton>
              ))}
            </div>

            <p style={{ fontSize: "17px", color: "var(--text-muted)", marginBottom: "24px" }}>
              {dailyGoal} cards/day · ~{Math.round(dailyGoal * 0.5)} min estimated
            </p>

            <PixelDialogActions>
              <PixelButton variant="secondary" onClick={() => setStep(3)} disabled={saving}>
                Back
              </PixelButton>
              <PixelButton onClick={handleDone} disabled={saving}>
                {saving ? "Saving…" : "Done"}
              </PixelButton>
            </PixelDialogActions>
          </>
        )}

        </div>{/* end centering wrapper */}
      </DialogueBox>
    </div>
  );
}
