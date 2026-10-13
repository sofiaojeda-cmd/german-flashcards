"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelDialogActions, PixelStepIndicator, PixelCheckbox } from "@/components/pixel";
import { Sprite } from "@/components/Sprite";
import { seedCards, recomputeActiveDeck } from "@/lib/db/seed";
import { cumulativeLevels } from "@/lib/levels";
import db from "@/lib/db/schema";
import type { Category, CEFRLevel, UserSettings } from "@/types";

// ── Level data ───────────────────────────────────────────────────
// Only B1 content is available. B2/C1 shown as roadmap but disabled.
// Availability is derived from categories.json at render time: a level becomes
// selectable the moment any category ships a card file for it.
const LEVELS: { value: CEFRLevel; label: string; description: string }[] = [
  { value: "A1", label: "A1", description: "Beginner — everyday words and simple phrases" },
  { value: "A2", label: "A2", description: "Elementary — routine exchanges on familiar topics" },
  { value: "B1", label: "B1", description: "Intermediate — navigate most daily situations" },
  { value: "B2", label: "B2", description: "Upper intermediate — fluent interaction with native speakers" },
  { value: "C1", label: "C1", description: "Advanced — precise, fluid expression on complex topics" },
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
  const [allCategories, setAllCategories] = React.useState<Category[]>([]);
  const [levelsWithContent, setLevelsWithContent] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  // Load non-Berlin categories for topic chips
  React.useEffect(() => {
    fetch("/api/cards/categories.json")
      .then((r) => r.json())
      .then((data) => {
        const all = data.categories as Category[];
        // Levels come from every category, Berlin included — the topic chips
        // below exclude Berlin because it has its own checkbox, not because it
        // has no content.
        setLevelsWithContent(
          new Set(
            all.flatMap((c) =>
              Object.entries(c.files ?? {})
                .filter(([, files]) => files && files.length > 0)
                .map(([level]) => level)
            )
          )
        );
        setAllCategories(all);
        setCategories(all.filter((c) => c.id !== "berlin"));
      });
  }, []);

  const toggleTopic = (id: string) => {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectedLevels = React.useMemo(() => cumulativeLevels(level), [level]);

  // Only levels that actually have cards are offered. A level with nothing
  // behind it is noise in a first-run flow, so B2 and C1 simply are not there
  // until some category ships a file for them.
  const availableLevels = React.useMemo(
    () => LEVELS.filter((l) => levelsWithContent.has(l.value)),
    [levelsWithContent]
  );

  // A topic is worth offering only when it has cards at a level the user picked.
  // Offering one that would contribute nothing is how you end up staring at an
  // empty deck wondering what you did wrong.
  const hasContentAtLevel = React.useCallback(
    (cat: Category) => selectedLevels.some((l) => (cat.files?.[l]?.length ?? 0) > 0),
    [selectedLevels]
  );

  const availableCategories = React.useMemo(
    () => categories.filter(hasContentAtLevel),
    [categories, hasContentAtLevel]
  );

  const berlinCategory = React.useMemo(
    () => allCategories.find((c) => c.id === "berlin"),
    [allCategories]
  );
  const berlinAvailable = !!berlinCategory && hasContentAtLevel(berlinCategory);

  // Lowering the level can withdraw topics that were already ticked. Rather than
  // erase the choice, the selection is narrowed to what is on offer at render
  // time: raising the level again brings the earlier picks back, and nothing the
  // user cannot currently see ever reaches the saved settings.
  const selectedTopics = React.useMemo(() => {
    const offered = new Set(availableCategories.map((c) => c.id));
    return topics.filter((t) => offered.has(t));
  }, [topics, availableCategories]);

  const selectedBerlin = livesInBerlin && berlinAvailable;

  const allTopicsSelected =
    availableCategories.length > 0 && selectedTopics.length === availableCategories.length;

  const handleSelectAll = () => {
    if (allTopicsSelected) {
      setTopics([]);
    } else {
      setTopics(availableCategories.map((c) => c.id));
    }
  };

  const canProceedStep3 = selectedTopics.length > 0 || selectedBerlin;

  const handleDone = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const allTopics = selectedBerlin
        ? [...new Set([...selectedTopics, "berlin"])]
        : selectedTopics;
      const settings: UserSettings = {
        // Picking a level opts you into everything below it; Settings narrows it.
        levels: cumulativeLevels(level),
        topics: allTopics,
        dailyGoal,
        livesInBerlin: selectedBerlin,
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
      await seedCards();

      // Derive deck membership from the saved selection. Deriving beats applying
      // deltas: there is no sequence of onboarding passes that can leave the deck
      // empty, because the flag is recomputed from settings every time.
      const { active: activeCount } = await recomputeActiveDeck({
        topics: allTopics,
        levels: settings.levels,
      });

      // Never hand the user a dashboard with an empty deck.
      if (activeCount === 0) {
        setSaveError("Couldn't load your cards. Check your connection and try again.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setSaveError("Couldn't load your cards. Check your connection and try again.");
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
              Your level includes everything below it. Narrow it later in Settings.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              {availableLevels.length === 0 ? (
                <p style={{ fontSize: "18px", color: "var(--text-muted)" }}>Loading levels…</p>
              ) : (
              availableLevels.map(({ value, label, description }) => (
                <PixelButton
                  key={value}
                  variant="secondary"
                  size="sm"
                  selected={level === value}
                  onClick={() => setLevel(value)}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "flex-start",
                    gap: "16px",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                  }}
                >
                  <span style={{ fontSize: "24px", flexShrink: 0, minWidth: "32px" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: "18px" }}>{description}</span>
                </PixelButton>
              ))
              )}
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
                Topics with cards at {selectedLevels.join(", ")}.
              </p>
              <button
                onClick={handleSelectAll}
                disabled={availableCategories.length === 0}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: availableCategories.length === 0 ? "not-allowed" : "pointer",
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
              {allCategories.length === 0 ? (
                <p style={{ fontSize: "18px", color: "var(--text-muted)" }}>Loading topics…</p>
              ) : availableCategories.length === 0 ? (
                <p style={{ fontSize: "18px", color: "var(--text-muted)" }}>
                  No topics have cards at this level yet. Go back and pick a higher one.
                </p>
              ) : (
                availableCategories.map((cat) => (
                  <PixelButton
                    key={cat.id}
                    size="sm"
                    variant="secondary"
                    selected={selectedTopics.includes(cat.id)}
                    onClick={() => toggleTopic(cat.id)}
                  >
                    {cat.nameEn}
                  </PixelButton>
                ))
              )}
            </div>

            {/* Berlin checkbox — separate control, hidden when its deck has
                nothing at the chosen levels */}
            <div style={{ marginBottom: "16px", display: berlinAvailable ? undefined : "none" }}>
              <PixelCheckbox
                checked={selectedBerlin}
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

            {saveError && (
              <p style={{ fontSize: "17px", color: "var(--accent-red)", marginBottom: "16px" }}>
                {saveError}
              </p>
            )}

            <PixelDialogActions>
              <PixelButton variant="secondary" onClick={() => setStep(3)} disabled={saving}>
                Back
              </PixelButton>
              <PixelButton onClick={handleDone} disabled={saving}>
                {saving ? "Saving…" : saveError ? "Try again" : "Done"}
              </PixelButton>
            </PixelDialogActions>
          </>
        )}

        </div>{/* end centering wrapper */}
      </DialogueBox>
    </div>
  );
}
