import * as React from "react";

type Band = { fraction: number; color: string };

type PixelProgressBarProps = {
  /** 0–100. Ignored when `bands` is provided. */
  value?: number;
  /** Total number of discrete segment cells. Default 10. */
  segments?: number;
  /** Single-color variant. xp=gold, goal=green, blue=blue. Ignored when `bands` is provided. */
  variant?: "xp" | "goal" | "blue";
  /** Multi-color mode: array of { fraction 0–1, color } rendered left to right. */
  bands?: Band[];
  label?: string;
  showValue?: boolean;
};

const VARIANT_COLOR: Record<"xp" | "goal" | "blue", string> = {
  xp:   "var(--accent-gold)",
  goal: "var(--accent-green)",
  blue: "var(--accent-blue)",
};

export function PixelProgressBar({
  value = 0,
  segments = 10,
  variant = "xp",
  bands,
  label,
  showValue = false,
}: PixelProgressBarProps) {
  // Build a flat array of per-segment colors
  const colors: string[] = React.useMemo(() => {
    if (bands) {
      const out: string[] = [];
      for (const band of bands) {
        const count = Math.min(Math.round(band.fraction * segments), segments - out.length);
        for (let i = 0; i < count; i++) out.push(band.color);
      }
      while (out.length < segments) out.push("empty");
      return out;
    }
    const fillColor = VARIANT_COLOR[variant];
    const filled = Math.round((Math.min(Math.max(value, 0), 100) / 100) * segments);
    return Array.from({ length: segments }, (_, i) => (i < filled ? fillColor : "empty"));
  }, [bands, value, segments, variant]);

  const pct = bands ? undefined : value;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {(label || showValue) && (
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-light)", fontSize: "18px" }}>
          {label && <span>{label}</span>}
          {showValue && pct !== undefined && <span>{pct}%</span>}
        </div>
      )}

      {/* Outer frame — battery-casing look */}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        style={{
          display: "flex",
          gap: "2px",
          border: "3px solid var(--border-dark)",
          padding: "3px",
          backgroundColor: "var(--bg-panel-dark)",
        }}
      >
        {colors.map((color, i) => {
          const empty = color === "empty";
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: "18px",
                backgroundColor: empty ? "var(--bg-panel-dark)" : color,
                boxShadow: empty
                  ? undefined
                  : "inset 2px 2px 0 rgba(255,255,255,0.28), inset -1px -1px 0 rgba(0,0,0,0.18)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
