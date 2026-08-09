"use client";

import { MbIcon } from "./MbIcon";

export interface MbStep {
  id: string;
  label: string;
  /** The value already chosen at this step, e.g. "Round Robin". */
  value?: string;
}

type StepState = "done" | "current" | "todo";

const STATE_WORD: Record<StepState, string> = {
  done: "Completed",
  current: "Current step",
  todo: "Not started",
};

const MARKER_CLASS: Record<StepState, string> = {
  done: "border-mb-navy bg-mb-navy text-mb-paper-bright",
  current: "border-mb-coral bg-mb-paper-bright text-mb-coral",
  todo: "border-mb-rule bg-mb-paper-bright text-mb-ink-muted",
};

const LABEL_CLASS: Record<StepState, string> = {
  done: "text-mb-navy",
  current: "text-mb-navy",
  todo: "text-mb-ink-muted",
};

/**
 * Wizard progress rail. Semantic `<ol>`; the step being edited carries
 * `aria-current="step"`; completed steps are real buttons, while the current
 * and future steps are inert text so nobody can skip ahead.
 */
export const MbStepRail = ({
  steps,
  current,
  onNavigate,
  orientation = "horizontal",
  className = "",
}: {
  steps: MbStep[];
  /** `id` of the step being edited. */
  current: string;
  /** Called with the `id` of a completed step the user clicked. */
  onNavigate: (id: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) => {
  const currentIndex = steps.findIndex((step) => step.id === current);
  const vertical = orientation === "vertical";

  return (
    <ol className={`flex min-w-0 ${vertical ? "flex-col" : "items-start"} ${className}`}>
      {steps.map((step, index) => {
        const state: StepState =
          currentIndex >= 0 && index < currentIndex
            ? "done"
            : index === currentIndex
              ? "current"
              : "todo";
        const clickable = state === "done";
        const last = index === steps.length - 1;

        const body = (
          <>
            <span
              aria-hidden="true"
              className={`inline-grid h-7 w-7 shrink-0 place-content-center rounded-[2px] border-[1.5px] ${MARKER_CLASS[state]}`}
            >
              {state === "done" ? (
                <MbIcon id="check" size={14} />
              ) : (
                <span className="matchbook-display text-[0.8rem] font-bold leading-none tracking-[0.02em] tabular-nums">
                  {index + 1}
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 pt-[3px]">
              <span
                className={`matchbook-display truncate text-[0.74rem] font-bold tracking-[0.1em] ${LABEL_CLASS[state]} ${
                  clickable ? "group-hover:text-mb-coral" : ""
                }`}
              >
                {step.label}
              </span>
              {step.value && (
                <span className="truncate text-[0.72rem] leading-snug text-mb-ink-muted">
                  {step.value}
                </span>
              )}
            </span>
            <span className="sr-only">{STATE_WORD[state]}</span>
          </>
        );

        const bodyClass = vertical
          ? "flex min-h-[44px] w-full min-w-0 items-start gap-3 pb-4 pr-2 text-left"
          : "flex min-h-[44px] min-w-0 flex-col items-start gap-1.5 pr-3 text-left";

        return (
          <li
            key={step.id}
            aria-current={state === "current" ? "step" : undefined}
            className={`relative flex min-w-0 ${vertical ? "" : "flex-1"}`}
          >
            {/* Connector to the next marker: navy once walked, hairline ahead. */}
            {!last && (
              <span
                aria-hidden="true"
                className={
                  vertical
                    ? "absolute bottom-0 left-[13px] top-8 w-[1.5px]"
                    : "absolute left-8 right-0 top-[13px] h-[1.5px]"
                }
                style={{
                  background: state === "done" ? "var(--mb-navy)" : "var(--mb-rule)",
                }}
              />
            )}
            {clickable ? (
              <button
                type="button"
                onClick={() => onNavigate(step.id)}
                title={`Back to ${step.label}`}
                className={`group relative rounded-[3px] ${bodyClass}`}
              >
                {body}
              </button>
            ) : (
              <span className={`relative ${bodyClass}`}>{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
};
