"use client";

import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";

type PixelDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  /** Optional pixel portrait shown left of the content.
   *  When omitted the content spans full width.
   */
  portrait?: React.ReactNode;
  /** Action buttons. Wrap in a <PixelDialog.Actions> for correct bottom-right alignment. */
  children: React.ReactNode;
  trigger?: React.ReactNode;
};

export function PixelDialog({
  open,
  onOpenChange,
  title,
  description,
  portrait,
  children,
  trigger,
}: PixelDialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}

      <RadixDialog.Portal>
        <RadixDialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(26, 15, 8, 0.75)",
            zIndex: 50,
          }}
        />

        {/* Dialog box — Stardew dialogue style */}
        <RadixDialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 51,
            backgroundColor: "var(--bg-panel)",
            border: "4px solid var(--border-dark)",
            boxShadow: "6px 6px 0 var(--shadow)",
            padding: "24px",
            maxWidth: "560px",
            width: "calc(100vw - 48px)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-pixel)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
          aria-describedby={description ? "pixel-dialog-desc" : undefined}
        >
          {/* Inner border accent */}
          <div
            style={{
              position: "absolute",
              inset: "4px",
              border: "2px solid var(--border-mid)",
              pointerEvents: "none",
            }}
          />

          {/* Body: optional portrait + text */}
          <div style={{ position: "relative", display: "flex", gap: "16px" }}>
            {portrait && (
              <div
                style={{
                  alignSelf: "flex-start",
                  flexShrink: 0,
                  width: "108px",
                  height: "108px",
                  border: "3px solid var(--border-dark)",
                  boxShadow: "4px 4px 0 var(--shadow)",
                  backgroundColor: "var(--bg-panel-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {portrait}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <RadixDialog.Title
                style={{ fontSize: "28px", marginBottom: "8px", lineHeight: 1.1 }}
              >
                {title}
              </RadixDialog.Title>

              {description && (
                <RadixDialog.Description
                  id="pixel-dialog-desc"
                  style={{ fontSize: "20px", color: "var(--text-muted)", marginBottom: "12px" }}
                >
                  {description}
                </RadixDialog.Description>
              )}

              {children}
            </div>
          </div>

          <RadixDialog.Close
            aria-label="Close"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "24px",
              cursor: "pointer",
              lineHeight: 1,
              fontFamily: "var(--font-pixel)",
              padding: "2px 6px",
            }}
          >
            ✕
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Bottom-right aligned action button row for use inside PixelDialog */
export function PixelDialogActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
