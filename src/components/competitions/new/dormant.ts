/* ===========================================================================
   THE DORMANT TREATMENT — what a control that cannot be pressed yet looks like

   `MbButton` ends every variant with `disabled:cursor-not-allowed
   disabled:opacity-40` (Button.tsx:233). One number, applied to the whole box,
   which means the fill, the frame AND the label fade together. That is the
   defect the first-run walkthrough named on the wizard's primary — "a
   washed-out coral fill that reads as broken, not disabled" — and it is not
   only the primary's problem. Measured at 390px on the running app, composited
   over the panel ground each control actually sits on:

     step 2  Clear              label 2.30:1   frame 2.30:1
     step 3  Reset to defaults  label 2.30:1   frame 2.30:1

   2.30:1 is under the 3:1 non-text floor for BOTH channels at once, so the
   control is not reading as dormant, it is reading as half-erased: you cannot
   comfortably read what it would do, and you can barely see that it is there.
   A disabled control still has a job — it tells you what will become available
   and what will unlock it — and it can only do that job if it stays legible.

   So the fade comes off and the state is drawn instead of dimmed:

     - `opacity: 1`, so nothing is washed out;
     - the FILL drops to paper. A filled navy or coral ground is the loudest
       thing on a screen and a control that cannot be pressed has no business
       being loud. This is also what stops the recipe breaking `.mb-btn-navy`:
       muted ink over a navy ground would be illegible, so the ground goes
       first and both variants land on the same shape.
     - the FRAME drops to `--mb-rule`, the same hairline that separates the
       rows around it — present, unmistakably inactive;
     - the LABEL holds at `--mb-ink-muted`, which measures 5.1:1 on paper, so
       it is read rather than guessed at.

   Every declaration carries `!`. `.mb-btn-navy` and `.mb-btn-outline-navy` set
   `background`, `border-color` and `color` from UNLAYERED css, which outranks
   any Tailwind utility whatever its specificity — the same correction
   `FormatChoiceList`, `NameStep` and `form.tsx` all document — and
   `disabled:opacity-40` is a utility in the same layer as `disabled:opacity-100`,
   where the winner would otherwise be decided by Tailwind's generated order
   rather than by this file.

   HANDOFF: this belongs in `MbButton` as the definition of `disabled`, at
   which point this module and its seven call sites disappear. It is written
   here because `Button.tsx` is kit, not wizard, and this workstream owns
   `src/components/competitions/new/*`. The same washed-fill treatment is still
   live wherever a filled `MbButton` can be disabled — the scoring console's
   gated commit control is the one the walkthrough named.
   =========================================================================== */

export const MB_DORMANT =
  "disabled:opacity-100! disabled:bg-mb-paper-bright! disabled:border-mb-rule! disabled:text-mb-ink-muted!";
