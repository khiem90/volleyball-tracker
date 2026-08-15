"use client";

import { useEffect, useRef } from "react";
import { Panel } from "@/components/matchbook/Panel";
import { useMbReducedMotion } from "@/components/matchbook/useMbReducedMotion";
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

   ------------------------------------------- and it is not there before that

   The preview used to render on arrival too, drawing "NO FORMAT CHOSEN YET —
   pick one to see the schedule it will generate" — an empty-state headline on
   the one screen in the app that cannot have an empty state, because the five
   things to choose are 150px above it and the panel head already says PICK
   ONE. Measured at 390x844 it cost 153px of a document the sticky commit bar
   was already covering the end of, and every pixel of it was an apology for a
   question the user had been on the screen for four seconds.

   So the panel arrives WITH the answer. Step 1 on arrival is the rail, the
   five choices and the commit bar; choosing adds the preview under the list,
   below the fold on a phone and beside nothing it displaces. `FormatStep` is
   the only place that ever had a nullable format, which is why the guard lives
   here and `FormatPreviewPanel` now takes a `CompetitionType`.
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
}: FormatStepProps) => {
  /* ---------------------------------------------------------------------
     THE PREVIEW HAS TO BE SEEN TO BE THE REWARD.

     The panel below arrives only once a format is chosen, and on a phone it
     lands where the sticky commit bar floats: measured at 390x844, the panel's
     blurb sat at y=657 with `.mb-action-bar` starting at y=681, so two of its
     three sample points hit-tested to the bar. The user taps a format and the
     sentence justifying that choice is sliced through its x-height.

     So the panel is brought into view — but only on a genuine CHANGE, never on
     mount. Returning to step 1 with a format already chosen must not move the
     document, and an earlier round shipped exactly that bug: `MbTabs` called
     `scrollIntoView` unconditionally on mount and put the first painted frame
     709px (desktop) / 3300px (mobile) down the page with no user action.

     It also only scrolls when the panel is genuinely obscured — if the choice
     was made with the preview already fully clear of the bar, nothing moves.
     --------------------------------------------------------------------- */
  const previewRef = useRef<HTMLDivElement>(null);
  const lastFormat = useRef<CompetitionType | null>(selectedFormat ?? null);
  const reduced = useMbReducedMotion();

  useEffect(() => {
    const changed = selectedFormat !== lastFormat.current;
    lastFormat.current = selectedFormat ?? null;
    if (!changed || !selectedFormat) return;

    const panel = previewRef.current;
    if (!panel) return;

    const bar = document.querySelector(".mb-action-bar");
    const floor = bar
      ? bar.getBoundingClientRect().top
      : window.innerHeight;
    const box = panel.getBoundingClientRect();
    if (box.bottom <= floor && box.top >= 0) return; // already fully clear

    panel.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "center",
    });
  }, [selectedFormat, reduced]);

  return (
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

    {selectedFormat && (
      <div ref={previewRef} className="xl:col-span-12">
        <FormatPreviewPanel
          format={selectedFormat}
          lines={previewLines}
          basis={previewBasis}
        />
      </div>
    )}
  </>
  );
};
