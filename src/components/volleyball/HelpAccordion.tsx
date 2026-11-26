"use client";

import { memo, useState } from "react";
import { Icon } from "@/components/shared/Icon";
import { OVERLAP_COLORS } from "@/lib/volleyball/constants";

type AccordionItemProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

const AccordionItem = memo(
  ({ title, children, defaultOpen = false }: AccordionItemProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div className="border-b border-line last:border-b-0">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-chip px-1 py-3 text-left transition-colors hover:bg-ink/4"
          aria-expanded={isOpen}
        >
          <span className="text-label font-medium">{title}</span>
          <Icon
            id="chevron-down"
            size={16}
            className={`shrink-0 text-ink-soft transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {isOpen && (
          <div className="flex flex-col gap-2 px-1 pb-4 text-label text-ink-soft">
            {children}
          </div>
        )}
      </div>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

/** The help under the notes. It has no frame of its own: the card it sits in is the frame. */
export const HelpAccordion = memo(() => {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-label font-bold">
        <span className="card-icon text-caption" aria-hidden="true">
          ?
        </span>
        Help & Information
      </h3>

      <div className="flex flex-col gap-1">
        <AccordionItem title="What are Rotations 1-6?" defaultOpen>
          <p>
            In volleyball, teams rotate clockwise each time they win serve. The
            6 rotations represent the 6 possible starting positions:
          </p>
          <ul className="flex list-inside list-disc flex-col gap-1 pl-2">
            <li>
              <strong>Rotation 1:</strong> Setter serves from Zone 1 (back
              right)
            </li>
            <li>
              <strong>Rotations 1-3:</strong> Setter in back row = 3 front-row
              attackers
            </li>
            <li>
              <strong>Rotations 4-6:</strong> Setter in front row = 2 front-row
              attackers
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem title="What are the overlap lines?">
          <p>
            Overlap lines show the positional constraints that must be
            maintained at the moment of serve contact (FIVB Rule 7.4):
          </p>
          <ul className="flex list-inside list-disc flex-col gap-1 pl-2">
            <li>
              <strong style={{ color: OVERLAP_COLORS["front-back"] }}>
                Blue dashed lines (Front/Back):
              </strong>{" "}
              Back-row players must be behind their corresponding front-row
              player
            </li>
            <li>
              <strong style={{ color: OVERLAP_COLORS["left-right"] }}>
                Orange dotted lines (Left/Right):
              </strong>{" "}
              Middle players must be between their side players
            </li>
          </ul>
          <p className="text-caption">
            Note: As of 2025, overlap rules only apply to the receiving team.
          </p>
        </AccordionItem>

        <AccordionItem title="What do the arrows mean?">
          <p>
            Arrows show the transition movement from serve-contact position to
            base/attack position:
          </p>
          <ul className="flex list-inside list-disc flex-col gap-1 pl-2">
            <li>Setter moves to the setting position (right of center)</li>
            <li>Outside hitters move to their approach lanes</li>
            <li>Middle blockers move to the center for quick attacks</li>
            <li>Libero stays back for defensive coverage</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="What is the Libero?">
          <p>
            The Libero is a defensive specialist who wears a different colored
            jersey:
          </p>
          <ul className="flex list-inside list-disc flex-col gap-1 pl-2">
            <li>Replaces back-row middle blockers</li>
            <li>Cannot attack above the net or set from front court</li>
            <li>Specializes in passing and defense</li>
            <li>Can enter/exit freely (doesn&apos;t count as a substitution)</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Formation differences">
          <p>Different formations optimize for different situations:</p>
          <ul className="flex list-inside list-disc flex-col gap-1 pl-2">
            <li>
              <strong>Traditional:</strong> Balanced 3-passer receive, good for
              consistent passing
            </li>
            <li>
              <strong>Stack:</strong> Players grouped for approach lanes, better
              attack options
            </li>
            <li>
              <strong>Spread:</strong> Wide positioning for maximum court
              coverage
            </li>
          </ul>
        </AccordionItem>
      </div>
    </div>
  );
});
HelpAccordion.displayName = "HelpAccordion";
