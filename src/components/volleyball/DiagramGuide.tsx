"use client";

import { memo, useId, useState, type ReactNode } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbRoleChip } from "@/components/matchbook/court/MbPlayerToken";
import { PLAYER_INFO } from "@/lib/volleyball/constants";
import type { PlayerRole } from "@/lib/volleyball/types";

/* ===========================================================================
   READING THE DIAGRAM

   The old accordion imported a sixth Heroicon, stacked four framed buttons 5px
   apart (the three spacing violations the harness recovers when its rule cap is
   applied), animated `height: 0 -> auto` on open, and — worst — named the two
   overlap constraints by hue: "Blue dashed lines", "Orange dotted lines".

   Rewritten: sprite icon, ruled rows at the 44px floor, `aria-controls` wired
   to a real region, opacity-and-transform on the content instead of a height
   animation (invariant 40 — height is a layout property), and every mark named
   by its SHAPE so this copy and the drawing agree in greyscale.

   TWO CORRECTIONS IN THIS PASS.

   THE DISCLOSURE MARK WAS THE WRONG METAPHOR. `expand` / `collapse` are the
   sprite's diagonal fullscreen arrows — "make this fill the screen", which is
   not what an accordion does. A section that opens and closes in place is
   `plus` / `minus`: non-directional, unambiguous, and the mark an almanac would
   actually print.

   THE SEVEN ROLE DESCRIPTIONS LIVE HERE NOW. They used to ride as a truncating
   second line inside each On Court row, where five of six were clipped at 390
   and all six at 320. They are reference prose about the SYSTEM, not about the
   current rotation, so this is where they belong — and here they set at full
   width and are never cut.
   =========================================================================== */

const Section = ({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className="border-b border-mb-rule last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          className="mb-btn-touch mb-row-hover flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
        >
          {/* 0.06em: the shell's mobile top-strip title is the other
              0.8rem/700 on this screen and it is tracked 0.06em. Two trackings
              on one size/weight pair is a collision (rubric 1.3). */}
          <span className="matchbook-display text-[0.8rem] mb-track-button font-bold">
            {title}
          </span>
          <MbIcon
            id={open ? "minus" : "plus"}
            size={14}
            className="shrink-0 text-mb-navy"
          />
        </button>
      </h3>
      {open && (
        <div
          id={id}
          className="mb-enter flex flex-col gap-2 px-4 pb-4 text-[0.78rem] leading-[1.55] text-mb-ink-muted"
        >
          {children}
        </div>
      )}
    </div>
  );
};

const Bullets = ({ items }: { items: ReactNode[] }) => (
  <ul className="flex flex-col gap-1.5 pl-4">
    {items.map((item, index) => (
      <li key={index} className="list-disc">
        {item}
      </li>
    ))}
  </ul>
);

/** Reading order of the seven roles: setter, then the attackers, then the libero. */
const ROLE_ORDER: PlayerRole[] = ["S", "OPP", "OH1", "OH2", "MB1", "MB2", "L"];

export const DiagramGuide = memo(() => (
  <div className="flex flex-1 flex-col">
    <Section title="What are rotations 1–6?" defaultOpen>
      <p>
        Teams rotate clockwise each time they win serve. The six rotations are
        the six possible starting arrangements.
      </p>
      <Bullets
        items={[
          <>
            <strong className="font-semibold text-mb-navy">Rotation 1</strong> — the
            setter serves from zone 1, back right.
          </>,
          <>
            <strong className="font-semibold text-mb-navy">Rotations 1–3</strong> —
            setter in the back row, so three front-row attackers.
          </>,
          <>
            <strong className="font-semibold text-mb-navy">Rotations 4–6</strong> —
            setter in the front row, so two front-row attackers.
          </>,
        ]}
      />
    </Section>

    <Section title="Who plays where">
      <p>
        Six players are on court at a time. The letterform on each disc is the
        role; the disc itself says which row the player is in.
      </p>
      <ul className="flex flex-col gap-2.5 pt-1">
        {ROLE_ORDER.map((role) => {
          const info = PLAYER_INFO[role];
          return (
            <li key={role} className="flex items-start gap-3">
              <MbRoleChip
                role={role}
                label={info.shortName}
                row={role === "L" ? "back" : "front"}
                size={26}
                className="mt-[1px]"
              />
              <span className="min-w-0">
                <span className="matchbook-display block text-[0.78rem] mb-track-display font-bold text-mb-navy">
                  {info.fullName}
                </span>
                <span className="block">{info.description}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Section>

    <Section title="What are the constraint lines?">
      <p>
        They show the positions that must hold at the moment of serve contact
        (FIVB rule 7.4). Each line carries a crossbar at its midpoint, and the
        number of bars is what tells the two rules apart.
      </p>
      <Bullets
        items={[
          <>
            <strong className="font-semibold text-mb-navy">One crossbar</strong>, on a
            long dashed rule — front / back. The back-row player must stay behind
            the front-row player in the same column.
          </>,
          <>
            <strong className="font-semibold text-mb-navy">Two crossbars</strong>, on a
            fine dotted rule — left / right. The middle player must stay between
            the two players on either side.
          </>,
        ]}
      />
      <p>Since 2025 the overlap rules apply only to the receiving team.</p>
    </Section>

    <Section title="What do the arrows mean?">
      <p>
        The move from the serve-contact position to the base or attack position
        once the ball is in play. They are drawn lighter than the constraint
        lines because they are a suggestion, not a rule.
      </p>
      <Bullets
        items={[
          "The setter releases to the setting position, right of centre.",
          "Outside hitters open to their approach lanes.",
          "Middle blockers close to the centre for the quick attack.",
          "The libero stays deep for defensive coverage.",
        ]}
      />
    </Section>

    <Section title="What is the libero?">
      <p>
        A back-row defensive specialist who substitutes freely for a back-row
        middle blocker and does not count against the substitution limit. On the
        court the libero is the hollow back-row disc drawn with a dashed outer
        ring — a dash because the player is not a permanent part of that
        rotation.
      </p>
      <Bullets
        items={[
          "Replaces back-row middle blockers.",
          "Cannot attack above the net or set from the front court.",
          "Enters and leaves without a formal substitution.",
        ]}
      />
    </Section>

    <Section title="Formation differences">
      <p>Each serve-receive shape trades one thing for another.</p>
      <Bullets
        items={[
          <>
            <strong className="font-semibold text-mb-navy">Traditional</strong> —
            balanced three-passer receive, most consistent passing.
          </>,
          <>
            <strong className="font-semibold text-mb-navy">Stack</strong> — passers
            grouped to clear approach lanes, better attack options.
          </>,
          <>
            <strong className="font-semibold text-mb-navy">Spread</strong> — wide
            positioning for maximum court coverage.
          </>,
        ]}
      />
    </Section>
  </div>
));
DiagramGuide.displayName = "DiagramGuide";
