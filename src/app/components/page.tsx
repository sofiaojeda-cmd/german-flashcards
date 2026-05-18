"use client";

import { notFound } from "next/navigation";
import * as React from "react";
import { User } from "pixelarticons/react";
import {
  PixelButton,
  PixelCard,
  PixelInput,
  PixelProgressBar,
  PixelDialog,
  PixelDialogActions,
  PixelStepIndicator,
  PixelCheckbox,
} from "@/components/pixel";

export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogPortraitOpen, setDialogPortraitOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [checkboxChecked, setCheckboxChecked] = React.useState(false);

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-base)",
        padding: "24px 32px",
        fontFamily: "var(--font-pixel)",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ color: "var(--accent-gold)", marginBottom: "24px" }}>
        Pixel Component Library
      </h1>

      {/* ── PixelButton ─────────────────────────────────────── */}
      <Section title="PixelButton">
        <Row label="Sizes">
          <PixelButton size="sm">Small</PixelButton>
          <PixelButton size="md">Medium</PixelButton>
          <PixelButton size="lg">Large</PixelButton>
        </Row>
        <Row label="Variants">
          <PixelButton variant="default">Default</PixelButton>
          <PixelButton variant="secondary">Secondary</PixelButton>
          <PixelButton variant="danger">Danger</PixelButton>
          <PixelButton variant="ghost">Ghost</PixelButton>
          <PixelButton disabled>Disabled</PixelButton>
        </Row>
        <Row label="Selected">
          <PixelButton variant="default" selected>Default</PixelButton>
          <PixelButton variant="secondary" selected>Secondary</PixelButton>
          <PixelButton variant="danger" selected>Danger</PixelButton>
        </Row>
        <Row label="">
          <p style={{ fontSize: "16px", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            Use <code>selected</code> when a button represents the active choice in a group — tabs, filters, settings options, onboarding picks. Dark brown bg, cream text. No hover effect.
          </p>
        </Row>
      </Section>

      {/* ── PixelCard ────────────────────────────────────────── */}
      <Section title="PixelCard">
        <Row label="Shades">
          <PixelCard style={{ minWidth: "180px" }}>
            <p style={{ margin: 0 }}>Light panel</p>
            <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: "18px" }}>Secondary text</p>
          </PixelCard>
          <PixelCard shade="dark" style={{ minWidth: "180px" }}>
            <p style={{ margin: 0 }}>Dark panel</p>
            <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: "18px" }}>Secondary text</p>
          </PixelCard>
          <PixelCard style={{ minWidth: "200px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "20px" }}>Nested</p>
            <PixelCard shade="dark" shadowSize="sm">
              <p style={{ margin: 0, fontSize: "18px" }}>Inner dark panel</p>
            </PixelCard>
          </PixelCard>
        </Row>
      </Section>

      {/* ── PixelInput ───────────────────────────────────────── */}
      <Section title="PixelInput">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "720px" }}>
          <PixelInput
            label="Default"
            placeholder="Type something..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <PixelInput
            label="With left icon"
            placeholder="Search..."
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
                <rect x="4" y="2" width="2" height="2" fill="var(--text-muted)" />
                <rect x="6" y="2" width="2" height="2" fill="var(--text-muted)" />
                <rect x="8" y="2" width="2" height="2" fill="var(--text-muted)" />
                <rect x="2" y="4" width="2" height="2" fill="var(--text-muted)" />
                <rect x="10" y="4" width="2" height="2" fill="var(--text-muted)" />
                <rect x="2" y="6" width="2" height="2" fill="var(--text-muted)" />
                <rect x="10" y="6" width="2" height="2" fill="var(--text-muted)" />
                <rect x="4" y="8" width="2" height="2" fill="var(--text-muted)" />
                <rect x="6" y="8" width="2" height="2" fill="var(--text-muted)" />
                <rect x="8" y="8" width="2" height="2" fill="var(--text-muted)" />
                <rect x="10" y="10" width="2" height="2" fill="var(--text-muted)" />
                <rect x="12" y="12" width="2" height="2" fill="var(--text-muted)" />
              </svg>
            }
          />
          <PixelInput
            label="With hint"
            hint="Hint text appears here"
            placeholder="Placeholder..."
          />
          <PixelInput
            label="Error state"
            error="This field is required"
            defaultValue="bad value"
          />
          <PixelInput
            label="Disabled"
            placeholder="Can't touch this"
            disabled
            defaultValue="Locked value"
          />
        </div>
      </Section>

      {/* ── PixelProgressBar ─────────────────────────────────── */}
      <Section title="PixelProgressBar">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "720px" }}>
          <PixelProgressBar value={0}   label="Empty"          variant="xp"   showValue />
          <PixelProgressBar value={40}  label="XP (gold)"      variant="xp"   showValue />
          <PixelProgressBar value={70}  label="Daily goal (green)" variant="goal" showValue />
          <PixelProgressBar value={60}  label="Vocab (blue)"   variant="blue" showValue />
          <PixelProgressBar value={100} label="Complete"       variant="goal" showValue />
          <PixelProgressBar
            segments={20}
            label="Multi-band (learning · mastered · known)"
            bands={[
              { fraction: 0.25, color: "var(--accent-blue)" },
              { fraction: 0.35, color: "var(--accent-green)" },
              { fraction: 0.15, color: "var(--accent-gold)" },
            ]}
          />
        </div>
      </Section>

      {/* ── PixelDialog ──────────────────────────────────────── */}
      <Section title="PixelDialog">
        <Row label="Without portrait (default)">
          <PixelButton onClick={() => setDialogOpen(true)}>Open dialog</PixelButton>
        </Row>
        <Row label="With portrait slot">
          <PixelButton variant="secondary" onClick={() => setDialogPortraitOpen(true)}>
            Open with portrait
          </PixelButton>
        </Row>

        {/* No portrait — content spans full width */}
        <PixelDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Sind Sie sicher?"
          description="This dialog has no portrait — text spans the full width."
        >
          <p style={{ fontSize: "20px", margin: "0 0 16px" }}>
            Use this layout for simple confirmations and notices that don&apos;t need a character presence.
          </p>
          <PixelDialogActions>
            <PixelButton size="sm" variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </PixelButton>
            <PixelButton size="sm" onClick={() => setDialogOpen(false)}>
              Confirm
            </PixelButton>
          </PixelDialogActions>
        </PixelDialog>

        {/* With portrait — placeholder Pixelarticons User icon */}
        <PixelDialog
          open={dialogPortraitOpen}
          onOpenChange={setDialogPortraitOpen}
          title="Guten Tag!"
          description="This dialog uses the portrait slot."
          portrait={
            <User
              style={{ width: "40px", height: "40px", color: "var(--text-primary)" }}
            />
          }
        >
          <p style={{ fontSize: "20px", margin: "0 0 16px" }}>
            The portrait slot sits left of the content. Pass any React node — designed for a
            pixel sprite. When no portrait is provided, content spans full width.
          </p>
          <PixelDialogActions>
            <PixelButton size="sm" variant="secondary" onClick={() => setDialogPortraitOpen(false)}>
              Cancel
            </PixelButton>
            <PixelButton size="sm" onClick={() => setDialogPortraitOpen(false)}>
              Got it
            </PixelButton>
          </PixelDialogActions>
        </PixelDialog>
      </Section>

      {/* ── PixelCheckbox ────────────────────────────────────────── */}
      <Section title="PixelCheckbox">
        <Row label="States">
          <PixelCheckbox
            checked={checkboxChecked}
            onChange={setCheckboxChecked}
            label="Toggle me"
          />
          <PixelCheckbox checked={true} onChange={() => {}} label="Checked (static)" />
          <PixelCheckbox checked={false} onChange={() => {}} label="Unchecked (static)" />
          <PixelCheckbox checked={false} onChange={() => {}} label="Disabled" disabled />
          <PixelCheckbox checked={true} onChange={() => {}} label="Disabled + checked" disabled />
        </Row>
      </Section>

      {/* ── PixelStepIndicator ───────────────────────────────────── */}
      <Section title="PixelStepIndicator">
        <p style={{ fontSize: "18px", color: "var(--text-muted)", marginBottom: "16px" }}>
          All three states — sign off before wiring into onboarding
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "400px" }}>
          {[1, 2, 3].map((active) => (
            <PixelCard key={active} shadowSize="sm" style={{ padding: "16px 24px" }}>
              <p style={{ margin: "0 0 16px", fontSize: "17px", color: "var(--text-muted)" }}>
                Step {active} of 3 active
              </p>
              <PixelStepIndicator currentStep={active} totalSteps={3} />
            </PixelCard>
          ))}
        </div>
      </Section>

      {/* ── Review Rating Buttons ────────────────────────────── */}
      <Section title="Review Rating Buttons">
        <Row label="Default">
          {(
            [
              { label: "Not yet",        bg: "#c0392b", border: "#8b1a11", color: "var(--text-light)" },
              { label: "Still Learning", bg: "#f0c050", border: "#a87820", color: "var(--text-primary)" },
              { label: "Known",          bg: "#6ab04c", border: "#3a6b1a", color: "var(--text-light)" },
            ] as const
          ).map(({ label, bg, border, color }) => (
            <button
              key={label}
              className="rating-button"
              style={{
                minHeight: "52px",
                padding: "16px 24px",
                fontSize: "22px",
                fontFamily: "var(--font-pixel)",
                whiteSpace: "nowrap",
                lineHeight: 1,
                cursor: "pointer",
                backgroundColor: bg,
                border: `3px solid ${border}`,
                color,
                boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.18)",
              }}
            >
              {label}
            </button>
          ))}
        </Row>
        <Row label="Disabled">
          {(
            [
              { label: "Not yet",        bg: "#c0392b", border: "#8b1a11", color: "var(--text-light)" },
              { label: "Still Learning", bg: "#f0c050", border: "#a87820", color: "var(--text-primary)" },
              { label: "Known",          bg: "#6ab04c", border: "#3a6b1a", color: "var(--text-light)" },
            ] as const
          ).map(({ label, bg, border, color }) => (
            <button
              key={label}
              disabled
              style={{
                minHeight: "52px",
                padding: "16px 24px",
                fontSize: "22px",
                fontFamily: "var(--font-pixel)",
                whiteSpace: "nowrap",
                lineHeight: 1,
                cursor: "not-allowed",
                opacity: 0.45,
                backgroundColor: bg,
                border: `3px solid ${border}`,
                color,
                boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.18)",
              }}
            >
              {label}
            </button>
          ))}
        </Row>
        <Row label="">
          <p style={{ fontSize: "16px", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            Used in the review screen after flipping a card. Bevel shadow (lighter top-left, darker bottom-right) matches PixelCheckbox. Gold button uses dark text for contrast.
          </p>
        </Row>
      </Section>

      {/* ── Gender color reference ────────────────────────────── */}
      <Section title="Article Gender Colors">
        <Row label="">
          {(["der", "die", "das"] as const).map((article) => (
            <PixelCard key={article} shadowSize="sm" style={{ minWidth: "110px", textAlign: "center" }}>
              <span
                style={{
                  fontSize: "32px",
                  color:
                    article === "der" ? "var(--accent-blue)"
                    : article === "die" ? "var(--accent-red)"
                    : "var(--accent-green)",
                }}
              >
                {article}
              </span>
              <p style={{ margin: "8px 0 0", fontSize: "18px", color: "var(--text-muted)" }}>
                {article === "der" ? "masculine" : article === "die" ? "feminine" : "neuter"}
              </p>
            </PixelCard>
          ))}
        </Row>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2
        style={{
          color: "var(--text-light)",
          fontSize: "28px",
          borderBottom: "2px solid var(--border-mid)",
          paddingBottom: "8px",
          marginBottom: "16px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      {label && (
        <p style={{ margin: "0 0 8px", fontSize: "18px", color: "var(--text-muted)" }}>{label}</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-start" }}>
        {children}
      </div>
    </div>
  );
}
