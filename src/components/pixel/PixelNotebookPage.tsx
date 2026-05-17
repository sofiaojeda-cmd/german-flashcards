import * as React from "react";

type PixelNotebookPageProps = {
  children: React.ReactNode;
};

const MARGIN_X = 52;
const CONTENT_LEFT = 68;
const BINDER_CENTER_X = 20;

export function PixelNotebookPage({ children }: PixelNotebookPageProps) {
  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "var(--bg-panel)",
        border: "3px solid var(--border-dark)",
        // Layered backgrounds: subtle edge shadows + ruled lines
        backgroundImage: [
          "linear-gradient(to right, rgba(0,0,0,0.06) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.06) 100%)",
          "repeating-linear-gradient(to bottom, transparent 0px, transparent calc(var(--notebook-line-height) - 1px), var(--notebook-line-color) calc(var(--notebook-line-height) - 1px), var(--notebook-line-color) var(--notebook-line-height))",
        ].join(", "),
        backgroundSize: `100% 100%, 100% var(--notebook-line-height)`,
        paddingLeft: `${CONTENT_LEFT}px`,
        paddingRight: "16px",
        minHeight: "300px",
        overflow: "hidden",
      }}
    >
      {/* Red margin line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0, bottom: 0,
          left: `${MARGIN_X}px`,
          width: "2px",
          backgroundColor: "var(--notebook-margin-color)",
          pointerEvents: "none",
        }}
      />

      {/* Pixel-art binder holes — 3 evenly spaced */}
      {[25, 50, 75].map((pct) => (
        <div
          key={pct}
          aria-hidden
          style={{
            position: "absolute",
            left: `${BINDER_CENTER_X - 6}px`,
            top: `calc(${pct}% - 6px)`,
            pointerEvents: "none",
          }}
        >
          {/*
            12×12 SVG, 2px per pixel unit (6×6 logical grid):
            Row 0:  .  .  R  R  .  .
            Row 1:  .  R  H  D  R  .
            Row 2:  R  H  D  D  D  R
            Row 3:  R  D  D  D  S  R
            Row 4:  .  R  D  S  R  .
            Row 5:  .  .  R  R  .  .
            R=#c0906a ring/paper-edge  D=#1a0f08 dark-hole  H=#3d2510 highlight  S=#080402 deep-shadow
          */}
          <svg width="12" height="12" viewBox="0 0 12 12" shapeRendering="crispEdges" style={{ display: "block" }}>
            {/* Row 0 */}
            <rect x="4"  y="0"  width="4" height="2" fill="#c0906a" />
            {/* Row 1 */}
            <rect x="2"  y="2"  width="2" height="2" fill="#c0906a" />
            <rect x="4"  y="2"  width="2" height="2" fill="#3d2510" />
            <rect x="6"  y="2"  width="2" height="2" fill="#1a0f08" />
            <rect x="8"  y="2"  width="2" height="2" fill="#c0906a" />
            {/* Row 2 */}
            <rect x="0"  y="4"  width="2" height="2" fill="#c0906a" />
            <rect x="2"  y="4"  width="2" height="2" fill="#3d2510" />
            <rect x="4"  y="4"  width="6" height="2" fill="#1a0f08" />
            <rect x="10" y="4"  width="2" height="2" fill="#c0906a" />
            {/* Row 3 */}
            <rect x="0"  y="6"  width="2" height="2" fill="#c0906a" />
            <rect x="2"  y="6"  width="6" height="2" fill="#1a0f08" />
            <rect x="8"  y="6"  width="2" height="2" fill="#080402" />
            <rect x="10" y="6"  width="2" height="2" fill="#c0906a" />
            {/* Row 4 */}
            <rect x="2"  y="8"  width="2" height="2" fill="#c0906a" />
            <rect x="4"  y="8"  width="2" height="2" fill="#1a0f08" />
            <rect x="6"  y="8"  width="2" height="2" fill="#080402" />
            <rect x="8"  y="8"  width="2" height="2" fill="#c0906a" />
            {/* Row 5 */}
            <rect x="4"  y="10" width="4" height="2" fill="#c0906a" />
          </svg>
        </div>
      ))}

      {children}
    </div>
  );
}
