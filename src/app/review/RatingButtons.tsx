"use client";

import * as React from "react";
import { PixelButton } from "@/components/pixel";
import { applyReview } from "@/lib/srs/sm2";
import { formatInterval } from "@/lib/formatInterval";
import type { ReviewRecord, ReviewQuality } from "@/types";

type RatingButtonsProps = {
  record: ReviewRecord;
  busy: boolean;
  onRate: (quality: ReviewQuality) => void;
  onKnown: () => void;
};

type Rating = {
  quality: ReviewQuality;
  label: string;
  variant: "danger" | "secondary" | "blue";
  style?: React.CSSProperties;
};

const RATINGS: Rating[] = [
  { quality: 0, label: "No idea :(", variant: "danger" },
  { quality: 3, label: "Struggling",  variant: "secondary" },
  { quality: 4, label: "Knew it!",    variant: "secondary", style: { backgroundColor: "var(--accent-green)", color: "var(--text-primary)", border: "3px solid var(--border-dark)" } },
  { quality: 5, label: "Got it :)",   variant: "blue" },
];

export function RatingButtons({ record, busy, onRate, onKnown }: RatingButtonsProps) {
  const previews = React.useMemo(
    () => RATINGS.map(({ quality }) => applyReview(record, quality).interval),
    [record]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "32px", width: "100%" }}>
      <div style={{ display: "flex", gap: "16px", width: "100%" }}>
        {RATINGS.map(({ quality, label, variant, style }, i) => (
          <div
            key={quality}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
          >
            <PixelButton
              size="md"
              variant={variant}
              disabled={busy}
              onClick={() => onRate(quality)}
              style={{ width: "100%", padding: "16px 8px", ...style }}
            >
              {label}
            </PixelButton>
            <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>
              {formatInterval(previews[i])}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onKnown}
        disabled={busy}
        style={{
          background: "none",
          border: "none",
          cursor: busy ? "not-allowed" : "pointer",
          fontSize: "18px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-pixel)",
          padding: "4px 8px",
          textDecoration: "underline",
          opacity: busy ? 0.5 : 1,
        }}
      >
        I already knew this
      </button>
    </div>
  );
}
