"use client";

import { MbCheckMark } from "./SelectList";

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

/**
 * Coral is a rule here, never a letterform: `--mb-coral` on paper measures
 * 3.55:1, which clears the 3:1 floor for a border but not the 4.5:1 floor for
 * 11.8px text. So the current step is marked by a coral ring and a coral
 * underline while its number and label stay navy.
 */
const MARKER_CLASS: Record<StepState, string> = {
  done: "border-mb-navy bg-mb-navy text-mb-paper-bright",
  current: "border-mb-coral bg-mb-paper-bright text-mb-navy",
  todo: "border-mb-rule bg-mb-paper-bright text-mb-ink-muted",
};

const LABEL_CLASS: Record<StepState, string> = {
  done: "border-transparent text-mb-navy",
  current: "border-mb-coral text-mb-navy",
  todo: "border-transparent text-mb-ink-muted",
};

/**
 * Wizard progress rail. Semantic `<ol>`; the step being edited carries
 * `aria-current="step"`; completed steps are real buttons, while the current
 * and future steps are inert text so nobody can skip ahead.
 *
 * State rides three channels — the marker's fill, its ring, and the underline
 * beneath the label — so the rail survives a greyscale squint as well as it
 * survives a screen reader.
 */
export const MbStepRail = ({
  steps,
  current,
  onNavigate,
  orientation = "horizontal",
  label = "Progress",
  className = "",
}: {
  steps: MbStep[];
  /** `id` of the step being edited. */
  current: string;
  /** Called with the `id` of a completed step the user clicked. */
  onNavigate: (id: string) => void;
  orientation?: "horizontal" | "vertical";
  /** Accessible name of the `<ol>`. */
  label?: string;
  className?: string;
}) => {
  const currentIndex = steps.findIndex((step) => step.id === current);
  const vertical = orientation === "vertical";

  return (
    <ol
      aria-label={label}
      className={`flex min-w-0 ${vertical ? "flex-col" : "items-start"} ${className}`}
    >
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
                <MbCheckMark size={11} />
              ) : (
                <span className="matchbook-display text-[0.8rem] mb-track-button font-bold leading-none tabular-nums">
                  {index + 1}
                </span>
              )}
            </span>
            {/*
              Horizontal steps stack, so the wrapper has to be told to fill the
              column: under `items-start` its cross size is content-derived, and
              `max-w-full` on the label would then resolve to the label's own
              width and never truncate. `max-w-full` on the children keeps the
              underline hugging a short label.
            */}
            <span
              className={`flex min-w-0 flex-col items-start gap-[3px] pt-[3px] ${
                vertical ? "flex-1" : "w-full"
              }`}
            >
              <span
                className={`matchbook-display max-w-full truncate border-b-[3px] pb-1 text-[0.74rem] mb-track-status font-bold tabular-nums ${LABEL_CLASS[state]}`}
              >
                {step.label}
              </span>
              {step.value && (
                <span className="max-w-full truncate text-[0.72rem] leading-snug text-mb-ink-muted tabular-nums">
                  {step.value}
                </span>
              )}
            </span>
            <span className="sr-only">{STATE_WORD[state]}</span>
          </>
        );

        /**
         * The trailing space is padding on an inert step and **margin** on a
         * clickable one. Same geometry either way, but as margin it sits
         * outside the hit box, so two adjacent completed steps keep the 8px of
         * clear water invariant 33 requires instead of abutting at 0px.
         */
        const bodyClass = vertical
          ? "flex min-h-[44px] w-full min-w-0 items-start gap-3 pr-2 text-left"
          : "flex min-h-[44px] w-full min-w-[44px] flex-col items-start gap-1.5 text-left";
        const trailing = vertical
          ? clickable
            ? "mb-4"
            : "pb-4"
          : clickable
            ? "mr-3"
            : "pr-3";

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
                className={`mb-row-hover relative rounded-[3px] ${bodyClass} ${trailing}`}
              >
                {body}
              </button>
            ) : (
              <span className={`relative ${bodyClass} ${trailing}`}>{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
};
