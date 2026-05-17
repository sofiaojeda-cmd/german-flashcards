import * as React from "react";

type PixelNotebookPageProps = {
  children: React.ReactNode;
};

const MARGIN_X = 52;           // px from left edge — red line sits here
const CONTENT_LEFT = 68;       // px — content starts 16px right of the margin line
const BINDER_CENTER_X = 20;    // px — center x for binder hole squares
const BINDER_SIZE = 10;        // px

export function PixelNotebookPage({ children }: PixelNotebookPageProps) {
  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "var(--bg-panel)",
        border: "3px solid var(--border-dark)",
        backgroundImage: `repeating-linear-gradient(
          to bottom,
          transparent 0px,
          transparent calc(var(--notebook-line-height) - 1px),
          var(--notebook-line-color) calc(var(--notebook-line-height) - 1px),
          var(--notebook-line-color) var(--notebook-line-height)
        )`,
        backgroundSize: `100% var(--notebook-line-height)`,
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

      {/* Binder holes — 3 dark squares evenly spaced */}
      {[25, 50, 75].map((pct) => (
        <div
          key={pct}
          aria-hidden
          style={{
            position: "absolute",
            left: `${BINDER_CENTER_X - BINDER_SIZE / 2}px`,
            top: `calc(${pct}% - ${BINDER_SIZE / 2}px)`,
            width: `${BINDER_SIZE}px`,
            height: `${BINDER_SIZE}px`,
            backgroundColor: "var(--border-dark)",
            pointerEvents: "none",
          }}
        />
      ))}

      {children}
    </div>
  );
}
