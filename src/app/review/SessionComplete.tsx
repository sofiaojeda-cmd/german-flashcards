"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelDialog, PixelDialogActions } from "@/components/pixel";
import { Sprite } from "@/components/Sprite";

type SessionCompleteProps = {
  reviewed: number;
  xpEarned: number;
  dailyGoalHit: boolean;
};

// Small pixel checkmark in --accent-green — icon accent on parchment is fine,
// long text in green is not (low contrast against warm parchment).
function GreenCheck() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      aria-hidden
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path
        shapeRendering="crispEdges"
        fill="var(--accent-green)"
        d="M1 7 L1 11 L4 14 L4 15 L7 15 L7 14 L15 3 L15 0 L12 0 L5 10 L4 10 L4 7 Z"
      />
    </svg>
  );
}

export function SessionComplete({ reviewed, xpEarned, dailyGoalHit }: SessionCompleteProps) {
  const router = useRouter();
  return (
    <PixelDialog
      open
      onOpenChange={() => {}}
      title="Session complete!"
      portrait={<Sprite name="mascot-happy" size={72} />}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
        <Row label="Cards reviewed" value={String(reviewed)} />
        {/* XP value: --text-primary on parchment, size emphasis instead of gold color */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "22px", color: "var(--text-primary)" }}>XP earned</span>
          <span style={{ fontSize: "32px", color: "var(--text-primary)" }}>+{xpEarned}</span>
        </div>
        {dailyGoalHit && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <GreenCheck />
            <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: 0 }}>
              Daily goal reached! +50 bonus XP
            </p>
          </div>
        )}
      </div>

      <PixelDialogActions>
        <PixelButton onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </PixelButton>
      </PixelDialogActions>
    </PixelDialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px" }}>
      <span style={{ color: "var(--text-primary)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
