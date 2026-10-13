"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

type Variant = "default" | "primary" | "secondary" | "danger" | "ghost" | "blue";
type Size = "sm" | "md" | "lg";

type PixelButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  /** Chip/toggle selected state — inset shadow + gold border + gold text */
  selected?: boolean;
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  default: {
    backgroundColor: "var(--bg-panel-dark)",
    color: "var(--accent-gold)",
    border: "3px solid var(--button-default-border)",
    boxShadow: "3px 3px 0 var(--shadow)",
  },
  // The single call to action on a screen. Orange fill, cream label.
  // Reserve it: two primaries side by side means neither is primary.
  primary: {
    backgroundColor: "var(--accent-primary)",
    color: "var(--text-light)",
    border: "3px solid var(--button-primary-border)",
    boxShadow: "3px 3px 0 var(--shadow)",
  },
  secondary: {
    backgroundColor: "var(--bg-panel-dark)",
    color: "var(--text-light)",
    border: "3px solid var(--button-default-border)",
    boxShadow: "3px 3px 0 var(--shadow)",
  },
  danger: {
    backgroundColor: "var(--accent-red)",
    color: "var(--text-light)",
    border: "3px solid var(--button-danger-border)",
    boxShadow: "3px 3px 0 var(--shadow)",
  },
  // Plain text button — transparent bg, no border/shadow.
  // Takes the surrounding text color so it stays legible on parchment
  // (dark text) and on the page background (cream) without a second variant.
  ghost: {
    backgroundColor: "transparent",
    color: "inherit",
    border: "none",
    boxShadow: "none",
  },
  blue: {
    backgroundColor: "var(--accent-blue)",
    color: "var(--text-light)",
    border: "3px solid var(--button-blue-border)",
    boxShadow: "3px 3px 0 var(--shadow)",
  },
};


const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { fontSize: "18px", padding: "4px 12px" },
  md: { fontSize: "22px", padding: "6px 18px" },
  lg: { fontSize: "28px", padding: "8px 24px" },
};

// Applied on top of variant styles when selected=true.
// Dark page-bg + cream text reads as "anchored / chosen". Inset shadow = physically pressed in.
const selectedOverlay: React.CSSProperties = {
  backgroundColor: "var(--bg-base)",
  color: "var(--text-light)",
  border: "3px solid var(--border-dark)",
  boxShadow: "inset 2px 2px 0 var(--shadow)",
};

export function PixelButton({
  variant = "default",
  size = "md",
  asChild = false,
  selected = false,
  style,
  className,
  ...props
}: PixelButtonProps) {
  const Comp = asChild ? Slot : "button";
  const baseStyles = variantStyles[variant];
  const activeStyles = (!props.disabled && selected)
    ? { ...baseStyles, ...selectedOverlay }
    : baseStyles;

  return (
    <Comp
      data-pixel-button
      data-variant={variant}
      aria-pressed={selected || undefined}
      style={{ ...activeStyles, ...sizeStyles[size], ...style }}
      className={`pixel-button${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
