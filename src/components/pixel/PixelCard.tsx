import * as React from "react";

type PixelCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Use "dark" for nested panels inside a card */
  shade?: "light" | "dark";
  /** Larger 4px shadow for outermost containers */
  shadowSize?: "sm" | "lg";
};

export function PixelCard({
  shade = "light",
  shadowSize = "lg",
  style,
  children,
  ...props
}: PixelCardProps) {
  return (
    <div
      style={{
        backgroundColor: shade === "dark" ? "var(--bg-panel-dark)" : "var(--bg-panel)",
        border: `${shade === "dark" ? "2px" : "3px"} solid var(--border-dark)`,
        boxShadow: shadowSize === "lg"
          ? "4px 4px 0 var(--shadow)"
          : "3px 3px 0 var(--shadow)",
        color: shade === "dark" ? "var(--text-light)" : "var(--text-primary)",
        // Override --text-muted locally so secondary text stays readable on dark backgrounds
        ["--text-muted" as string]: shade === "dark" ? "rgba(244, 228, 193, 0.55)" : undefined,
        padding: "16px",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
