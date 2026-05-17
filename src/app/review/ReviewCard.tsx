"use client";

import * as React from "react";
import { PixelCard } from "@/components/pixel";
import type { Card } from "@/types";

function getWordFontSize(word: string, base: number): number {
  const len = word.length;
  if (len <= 12) return base;
  if (len <= 16) return Math.max(base - 8, 28);
  if (len <= 20) return Math.max(base - 16, 28);
  return Math.max(base - 24, 24);
}

const articleColor: Record<string, string> = {
  der: "var(--accent-blue)",
  die: "var(--accent-red)",
  das: "var(--accent-green)",
};

type ReviewCardProps = {
  card: Card;
  flipped: boolean;
  /** When provided, the whole card is a click target that toggles the flip. */
  onFlip?: () => void;
};

export function ReviewCard({ card, flipped, onFlip }: ReviewCardProps) {
  const [animClass, setAnimClass] = React.useState("");
  const [hovered, setHovered] = React.useState(false);
  const prevFlipped = React.useRef(flipped);

  React.useEffect(() => {
    if (flipped === prevFlipped.current) return;
    setAnimClass(flipped ? "card-flip-to-back" : "card-flip-to-front");
    prevFlipped.current = flipped;
    const t = setTimeout(() => setAnimClass(""), 240);
    return () => clearTimeout(t);
  }, [flipped]);

  const interactive = !!onFlip;

  return (
    <div
      className={animClass}
      style={{ width: "100%" }}
    >
      <PixelCard
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? (flipped ? "Flip back to question" : "Show answer") : undefined}
        onClick={onFlip}
        onKeyDown={
          interactive
            ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFlip?.(); } }
            : undefined
        }
        onMouseEnter={interactive ? () => setHovered(true) : undefined}
        onMouseLeave={interactive ? () => setHovered(false) : undefined}
        style={{
          minHeight: "var(--review-card-min-height)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "32px",
          textAlign: "center",
          gap: "24px",
          cursor: interactive ? "pointer" : "default",
          // Shift shadow inward on hover — same "pressed" cue as pixel buttons
          boxShadow: interactive && hovered
            ? "2px 2px 0 var(--shadow)"
            : "4px 4px 0 var(--shadow)",
          border: interactive && hovered
            ? "3px solid var(--accent-gold)"
            : undefined,
          transition: "none",
        }}
      >
        {!flipped ? <Front card={card} /> : <Back card={card} />}
      </PixelCard>
    </div>
  );
}

function Front({ card }: { card: Card }) {
  const fontSize = getWordFontSize(card.front, 52);

  if (card.gender) {
    const spaceIdx = card.front.indexOf(" ");
    const article = spaceIdx === -1 ? card.front : card.front.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? "" : card.front.slice(spaceIdx);

    return (
      <span style={{ fontSize: `${fontSize}px`, lineHeight: 1.1, textAlign: "center" }}>
        <span style={{ color: articleColor[card.gender] }}>{article}</span>
        <span style={{ color: "var(--text-primary)" }}>{rest}</span>
      </span>
    );
  }

  return (
    <span style={{ fontSize: `${fontSize}px`, color: "var(--text-primary)", lineHeight: 1.1, textAlign: "center" }}>
      {card.front}
    </span>
  );
}

function Back({ card }: { card: Card }) {
  return (
    <>
      {/* Part of speech sits ABOVE the word so the word occupies the same vertical
          center as the German word on the front — eye doesn't jump on flip */}
      {card.partOfSpeech && (
        <span style={{ fontSize: "18px", color: "var(--text-muted)" }}>
          {card.partOfSpeech}
        </span>
      )}

      <span style={{ fontSize: `${getWordFontSize(card.back, 44)}px`, color: "var(--text-primary)", lineHeight: 1.1 }}>
        {card.back}
      </span>

      {card.exampleSentence && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "20px", color: "var(--text-primary)", margin: 0 }}>
            {card.exampleSentence}
          </p>
          {card.exampleTranslation && (
            <p style={{ fontSize: "18px", color: "var(--text-muted)", margin: "8px 0 0" }}>
              {card.exampleTranslation}
            </p>
          )}
        </div>
      )}
    </>
  );
}
