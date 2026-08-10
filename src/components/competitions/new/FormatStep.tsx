"use client";

import { MbChoiceCard } from "@/components/matchbook/ChoiceCard";
import { Panel } from "@/components/matchbook/Panel";
import { FORMAT_META } from "@/components/matchbook/formatMeta";
import type {
  MbPreviewBasis,
  MbPreviewLine,
} from "@/components/matchbook/useMatchbookNewCompetition";
import type { CompetitionType } from "@/types/game";
import { FormatPreviewPanel } from "./FormatPreviewPanel";

/* ===========================================================================
   STEP 1 — FORMAT

   Five `MbChoiceCard`s driven by `FORMAT_META` and a preview panel that
   answers the question the card grid cannot: "what will this actually
   produce?".

   ------------------------------------------------- why 12 over 12, not 7/5

   The preview used to sit in an `xl:col-span-5` column beside the cards. The
   brief (§3.1) offers both arrangements — "a right rail (`xl:col-span-4` on a
   second row, **or stacked under the grid**)" — and the measurement chose
   between them: at 1440 the card grid stood 900px tall and the preview 200px,
   leaving a **473 x ~700px hole of paper** as the largest unshaped void on the
   screen, which is D2's "whitespace is leftover, not shaped" exactly. Stacked,
   there is no second column to be shorter than, at any width.

   It also fixes the measure. In the 7-col column each card was 320px wide, so
   every blurb set two short lines: the D1.4 census read **30-37 characters per
   line** on five of them at both 1440 and 390, against the rubric's 45-75 band.
   Across the full 12 the same card is 573px, the same sentence sets on one
   line, and the census reads 57-68.

   Step 3 already stacks `Format Preview` full-width under its two columns, so
   this is the wizard agreeing with itself rather than a second idea.
   =========================================================================== */

/**
 * `.mb-tile` declares `transition: background-color …, transform …` in
 * `globals.css`, and `.mb-row-hover` — which every choice card also carries —
 * re-declares `transition: background-color …` **later in the same file at the
 * same specificity**, so the transform half is silently dropped. Measured on
 * the shipped card: `transition-property: background-color`, full stop. The
 * press still lands (`:active` sets `transition-duration: 0s` by design) but
 * the release snaps instead of easing over `--mb-dur-fast`.
 *
 * Restoring it needs `!` because both losing rules are unlayered and every
 * Tailwind utility ships inside `@layer utilities`. The values are the tokens
 * `.mb-tile` itself names, so this re-states the system's intent rather than
 * inventing a timing.
 *
 * HANDOFF (W1, `globals.css` zone A): the ordering bug is the real defect —
 * `.mb-row-hover` should transition `background-color, transform`, or
 * `.mb-tile`'s declaration should move below it. This class is a call-site
 * patch on a route that does not own the stylesheet.
 */
const TILE_PRESS =
  "transition-[background-color,transform]! duration-[var(--mb-dur-fast)]! ease-[var(--mb-ease-out)]!";

export interface FormatStepProps {
  formats: {
    type: CompetitionType;
    meta: (typeof FORMAT_META)[CompetitionType];
    kicker: string;
  }[];
  selectedFormat: CompetitionType | null;
  onSelectFormat: (type: CompetitionType) => void;
  previewLines: MbPreviewLine[];
  previewBasis: MbPreviewBasis;
}

export const FormatStep = ({
  formats,
  selectedFormat,
  onSelectFormat,
  previewLines,
  previewBasis,
}: FormatStepProps) => (
  <>
    <div className="xl:col-span-12">
      <Panel
        title="Choose a Format"
        icon="compete"
        meta={<span className="mb-kicker tabular-nums">{formats.length} formats</span>}
      >
        {/* A second `.mb-enter-grid`, nested inside the step's.

            The outer grid settles the two panels (0ms / 40ms); this one settles
            the five choices behind them (0 / 40 / 80 / 120 / 160ms), which is
            the one thing on the screen the user is here to do. Before it, the
            entrance was two panels and nothing inside them: the D5.4 census
            found `.mb-enter-grid` with exactly two children on a screen whose
            content is five cards. The delays come from the stylesheet's own
            `nth-child` ladder — this file names no timing. */}
        <div className="mb-enter-grid grid gap-3 p-4 sm:grid-cols-2">
          {formats.map(({ type, meta, kicker }, index) => (
            <MbChoiceCard
              key={type}
              icon={meta.icon}
              accent={meta.accent}
              title={meta.label}
              description={meta.blurb}
              kicker={kicker}
              selected={selectedFormat === type}
              onSelect={() => onSelectFormat(type)}
              /* An odd count in a two-up grid leaves the last cell empty —
                 measured at 1440 as a 430x280 hole of paper inside the panel,
                 the largest unshaped void on the screen. The last card takes
                 the remainder instead, so the grid always closes. */
              className={`${TILE_PRESS} ${
                index === formats.length - 1 && formats.length % 2 === 1
                  ? "sm:col-span-2"
                  : ""
              }`}
            />
          ))}
        </div>
      </Panel>
    </div>

    <div className="xl:col-span-12">
      <FormatPreviewPanel
        format={selectedFormat}
        lines={previewLines}
        basis={previewBasis}
      />
    </div>
  </>
);
