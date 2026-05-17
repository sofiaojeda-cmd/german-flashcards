"use client";

import * as React from "react";

type PixelCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  id?: string;
  disabled?: boolean;
};

export function PixelCheckbox({
  checked,
  onChange,
  label,
  id,
  disabled = false,
}: PixelCheckboxProps) {
  const uid = React.useId();
  const checkboxId = id ?? uid;

  return (
    <label
      htmlFor={checkboxId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {/* Native input hidden but accessible */}
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
      />

      {/* Custom visual — 24×24px pixel-art bevel box */}
      <div
        aria-hidden
        style={{
          width: "24px",
          height: "24px",
          flexShrink: 0,
          border: checked ? "3px solid #3a6b1a" : "3px solid var(--border-dark)",
          backgroundColor: checked ? "var(--accent-green)" : "var(--bg-panel)",
          boxShadow: checked
            ? "inset 3px 3px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.18)"
            : "inset 2px 2px 0 rgba(255,255,255,0.25), inset -1px -1px 0 rgba(0,0,0,0.12), 2px 2px 0 var(--shadow)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && (
          // 12×12 rendered inside 18px inner area → 3px green padding each side
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            style={{ display: "block" }}
            aria-hidden
          >
            <path
              shapeRendering="crispEdges"
              fill="#ffffff"
              d="M1 7 L1 11 L4 14 L4 15 L7 15 L7 14 L15 3 L15 0 L12 0 L5 10 L4 10 L4 7 Z"
            />
          </svg>
        )}
      </div>

      {label && (
        <span style={{ fontSize: "20px" }}>
          {label}
        </span>
      )}
    </label>
  );
}
