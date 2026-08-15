"use client";

import { Panel } from "@/components/matchbook/Panel";
import type {
  MbFormatOption,
  MbPreviewBasis,
  MbPreviewLine,
} from "@/components/matchbook/useMatchbookNewCompetition";
import type { CompetitionType } from "@/types/game";
import { FormatChoiceList } from "./FormatChoiceList";
import { FormatPreviewPanel } from "./FormatPreviewPanel";

/* ===========================================================================
   STEP 1 — FORMAT

   One panel holding a five-row radio group, and a preview panel that answers
   the question the group cannot: "what will this actually produce?".

   ------------------------------------------------ why a list, not five cards

   The cards were `MbChoiceCard`s, and two measurements killed them. Both were
   the same defect twice: the control did not say what kind of question it was
   asking.

   1. **IT READ AS A MULTI-SELECT.** Every card carried an unlabelled empty
      ballot box in its top-right corner and `aria-pressed="false"` on its
      button — the toggle contract, five times over, on a list where exactly
      one answer is legal. Nothing on the screen said "pick one".
   2. **1.9 OF 5 FITTED ON A PHONE.** Measured at 390x844 on the shipped grid:
      each card 324x187, the first at y=308, the sticky commit bar covering
      everything from y=681. Card 1 was whole, card 2 was clipped at its
      description, cards 3-5 were below the fold. Choosing between five formats
      meant scrolling and remembering, which is not a comparison.

   `FormatChoiceList` fixes both with one move — see its own header for the
   radiogroup semantics and the 56px row arithmetic.

   ------------------------------------------------------- the preview stays

   Stacked under the group at every width, still full-width. The measurement
   that put it there has not changed: in an `xl:col-span-5` side column it left
   a 473 x ~700px hole of paper at 1440, and it squeezed the card blurbs to
   30-37 characters per line against the rubric's 45-75 band. Step 3 stacks the
   same panel the same way, so this is the wizard agreeing with itself.

   It also now carries the sentence the rows gave up: the list's second line is
   four words, and `FormatPreviewPanel` prints `FORMAT_META[format].blurb`
   verbatim as its first line the moment a format is chosen. The list is the
   comparison; the preview is the detail.
   =========================================================================== */

export interface FormatStepProps {
  formats: MbFormatOption[];
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
        /* "Pick one" rather than "5 formats".
           The count was already legible — five rows are five rows — and the
           one thing the old grid never said is the thing this label now says.
           It sits in the panel head, which is the group's own caption. */
        meta={<span className="mb-kicker">Pick one</span>}
      >
        <FormatChoiceList
          options={formats}
          value={selectedFormat}
          onChange={onSelectFormat}
          label="Competition format"
        />
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
