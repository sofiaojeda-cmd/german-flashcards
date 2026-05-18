"use client";

import * as React from "react";

type PixelInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  /** Optional node rendered inside the input on the left (e.g. a search icon SVG). */
  leftIcon?: React.ReactNode;
};

export function PixelInput({ label, hint, error, id, style, leftIcon, ...props }: PixelInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const isDisabled = props.disabled;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            color: isDisabled ? "var(--text-muted)" : "var(--text-light)",
            fontSize: "20px",
            userSelect: "none",
            cursor: isDisabled ? "not-allowed" : undefined,
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {leftIcon && (
          <span
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          style={{
            backgroundColor: isDisabled ? "var(--bg-panel-dark)" : "var(--bg-panel)",
            color: isDisabled ? "var(--text-muted)" : "var(--text-primary)",
            border: `2px solid ${isDisabled ? "var(--border-mid)" : "var(--input-border)"}`,
            boxShadow: isDisabled ? "none" : "inset 2px 2px 0 var(--shadow)",
            paddingTop: "6px",
            paddingBottom: "6px",
            paddingLeft: leftIcon ? "34px" : "10px",
            paddingRight: "10px",
            fontSize: "20px",
            outline: "none",
            fontFamily: "var(--font-pixel)",
            width: "100%",
            cursor: isDisabled ? "not-allowed" : undefined,
            ...style,
          }}
          {...props}
        />
      </div>
      {(hint || error) && (
        <span
          style={{
            fontSize: "18px",
            color: error ? "var(--accent-red)" : "var(--text-muted)",
          }}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
}
