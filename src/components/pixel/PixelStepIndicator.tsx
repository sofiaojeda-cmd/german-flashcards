import * as React from "react";

type PixelStepIndicatorProps = {
  /** 1-indexed current step */
  currentStep: number;
  totalSteps: number;
};

type StepState = "completed" | "current" | "future";

function stepState(index: number, currentStep: number): StepState {
  const step = index + 1;
  if (step < currentStep) return "completed";
  if (step === currentStep) return "current";
  return "future";
}

const SQUARE_BASE = 20;
const SQUARE_CURRENT = 22;

const squareStyle: Record<StepState, React.CSSProperties> = {
  completed: {
    width:  SQUARE_BASE,
    height: SQUARE_BASE,
    backgroundColor: "var(--accent-green)",
    border: "3px solid var(--border-dark)",
    boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.18)",
    flexShrink: 0,
  },
  current: {
    width:  SQUARE_CURRENT,
    height: SQUARE_CURRENT,
    backgroundColor: "var(--accent-gold)",
    border: "3px solid var(--border-dark)",
    boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.18)",
    flexShrink: 0,
  },
  future: {
    width:  SQUARE_BASE,
    height: SQUARE_BASE,
    backgroundColor: "var(--bg-panel-dark)",
    border: "3px solid var(--border-dark)",
    boxShadow: "none",
    flexShrink: 0,
  },
};

export function PixelStepIndicator({ currentStep, totalSteps }: PixelStepIndicatorProps) {
  return (
    <div
      role="list"
      aria-label={`Step ${currentStep} of ${totalSteps}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        marginBottom: "20px",
      }}
    >
      {Array.from({ length: totalSteps }).map((_, i) => {
        const state = stepState(i, currentStep);
        // Connector before each square except the first
        const connectorCompleted = i > 0 && stepState(i - 1, currentStep) === "completed";
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <div
                aria-hidden
                style={{
                  width: "40px",
                  height: "3px",
                  backgroundColor: connectorCompleted
                    ? "var(--accent-green)"
                    : "var(--border-mid)",
                  flexShrink: 0,
                }}
              />
            )}
            <div
              role="listitem"
              aria-current={state === "current" ? "step" : undefined}
              style={squareStyle[state]}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
