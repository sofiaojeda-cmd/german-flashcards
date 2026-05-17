"use client";

import * as React from "react";

type PixelFolderTabProps = {
  label: string;
  /** Sprite name without path/extension, e.g. "category-food" */
  icon?: string;
  active: boolean;
  onClick: () => void;
};

export function PixelFolderTab({ label, icon, active, onClick }: PixelFolderTabProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        height: active ? "36px" : "32px",
        padding: "0 14px",
        backgroundColor: active ? "var(--folder-tab-color)" : "var(--folder-tab-inactive)",
        border: "3px solid var(--border-dark)",
        // Active tab bottom border matches notebook bg — visually merges into page below
        borderBottom: active ? "3px solid var(--bg-panel)" : "3px solid var(--border-dark)",
        boxShadow: active
          ? "inset 2px 2px 0 rgba(255,255,255,0.25), inset -1px -1px 0 rgba(0,0,0,0.15)"
          : "inset 1px 1px 0 rgba(255,255,255,0.15), inset -1px -1px 0 rgba(0,0,0,0.20)",
        fontFamily: "var(--font-pixel)",
        fontSize: "18px",
        color: "var(--text-primary)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        alignSelf: "flex-end",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {/* Negative-space squares cut the top corners into pixel-art steps */}
      <span
        aria-hidden
        style={{
          position: "absolute", top: -3, left: -3,
          width: 6, height: 6,
          backgroundColor: "var(--bg-base)",
          pointerEvents: "none",
          display: "block",
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute", top: -3, right: -3,
          width: 6, height: 6,
          backgroundColor: "var(--bg-base)",
          pointerEvents: "none",
          display: "block",
        }}
      />

      {icon && (
        <img
          src={`/sprites/${icon}.png`}
          width={16}
          height={16}
          alt=""
          style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
        />
      )}
      <span>{label}</span>
    </button>
  );
}
