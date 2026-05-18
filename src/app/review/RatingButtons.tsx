"use client";

import * as React from "react";
import type { ReviewQuality } from "@/types";

type RatingButtonsProps = {
  busy: boolean;
  onRate: (quality: ReviewQuality) => void;
};

type Rating = {
  quality: ReviewQuality;
  label: string;
  bg: string;
  border: string;
  color: string;
};

const RATINGS: Rating[] = [
  { quality: "not-yet",        label: "Not yet",        bg: "#c0392b", border: "#8b1a11", color: "var(--text-light)" },
  { quality: "still-learning", label: "Still Learning", bg: "#f0c050", border: "#a87820", color: "var(--text-primary)" },
  { quality: "known",          label: "Known",          bg: "#6ab04c", border: "#3a6b1a", color: "var(--text-light)" },
];

export function RatingButtons({ busy, onRate }: RatingButtonsProps) {
  return (
    <div style={{ display: "flex", gap: "var(--rating-btn-row-gap)", width: "100%" }}>
      {RATINGS.map(({ quality, label, bg, border, color }) => (
        <button
          key={quality}
          className="rating-button"
          disabled={busy}
          onClick={() => onRate(quality)}
          style={{
            flex: 1,
            minHeight: "52px",
            padding: "var(--rating-btn-padding)",
            fontSize: "var(--rating-btn-font-size)",
            fontFamily: "var(--font-pixel)",
            whiteSpace: "nowrap",
            lineHeight: 1,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.45 : 1,
            backgroundColor: bg,
            border: `3px solid ${border}`,
            color,
            boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.18), 3px 3px 0 var(--shadow)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
