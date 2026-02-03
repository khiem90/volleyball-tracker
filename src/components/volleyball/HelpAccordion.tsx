"use client";

import { memo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

type AccordionItemProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

const AccordionItem = memo(
  ({ title, children, defaultOpen = false }: AccordionItemProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div className="border-b border-border last:border-b-0">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-accent/30 rounded-lg transition-colors"
          aria-expanded={isOpen}
        >
          <span className="font-medium text-sm text-foreground">{title}</span>
          <ChevronDownIcon
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {isOpen && (
          <div className="pb-4 px-1 text-sm text-muted-foreground space-y-2">
            {children}
          </div>
        )}
      </div>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

export const HelpAccordion = memo(() => {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">
          ?
        </span>
        Help & Information
      </h3>

      <div className="space-y-1">
        <AccordionItem title="What are Rotations 1-6?" defaultOpen>
          <p>
            In volleyball, teams rotate clockwise each time they win serve. The
            6 rotations represent the 6 possible starting positions:
          </p>
          <ul className="list-disc list-inside pl-2 mt-2 space-y-1">
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
          <ul className="list-disc list-inside pl-2 mt-2 space-y-1">
            <li>
              <strong className="text-blue-600 dark:text-blue-400">
                Blue dashed lines (Front/Back):
              </strong>{" "}
              Back-row players must be behind their corresponding front-row
              player
            </li>
            <li>
              <strong className="text-amber-600 dark:text-amber-400">
                Orange dotted lines (Left/Right):
              </strong>{" "}
              Middle players must be between their side players
            </li>
          </ul>
          <p className="mt-2 text-xs">
            Note: As of 2025, overlap rules only apply to the receiving team.
          </p>
        </AccordionItem>

        <AccordionItem title="What do the arrows mean?">
          <p>
            Arrows show the transition movement from serve-contact position to
            base/attack position:
          </p>
          <ul className="list-disc list-inside pl-2 mt-2 space-y-1">
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
          <ul className="list-disc list-inside pl-2 mt-2 space-y-1">
            <li>Replaces back-row middle blockers</li>
            <li>Cannot attack above the net or set from front court</li>
            <li>Specializes in passing and defense</li>
            <li>Can enter/exit freely (doesn&apos;t count as a substitution)</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Formation differences">
          <p>Different formations optimize for different situations:</p>
          <ul className="list-disc list-inside pl-2 mt-2 space-y-1">
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
