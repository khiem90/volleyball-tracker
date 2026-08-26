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
   which point this module and its seven call sites disappear. It lives
   here rather than in the kit for now. The same washed-fill treatment is still
   live wherever a filled `MbButton` can be disabled — the scoring console's
   gated commit control is the one the walkthrough named.
   =========================================================================== */

export const MB_DORMANT =
  "disabled:opacity-100! disabled:bg-mb-paper-bright! disabled:border-mb-rule! disabled:text-mb-ink-muted!";

/* ===========================================================================
   THE SAME TREATMENT FOR A CONTROL THAT IS *NOT* `disabled`

   The wizard's commit control is deliberately never `disabled` — pressing a
   blocked primary is what raises the "ONE THING FIRST" notice and moves focus
   to it, and that recovery is the best thing on the screen. But the round
   before this one paid for it by leaving the control at FULL COMMIT DRESS
   while the line 24px above it said the opposite. Scripted at 390x844 on step
   2 of a fresh walk-through:

     status line   "Select at least 3 teams"
     primary       background rgb(201,53,31)   opacity 1   disabled false
                   aria-disabled null          172.95 x 56

   A saturated coral fill is the loudest promise this system can make, and the
   press does not keep it. That is not a disabled control drawn honestly; it is
   an available control that is not available.

   So the *shape* of the answer above applies here too — the state is DRAWN,
   not dimmed — with one difference: every declaration is unconditional rather
   than `disabled:`-scoped, because the button really is operable and the
   `disabled:` variants would never fire. It is scoped instead to the bar's
   last child, which is `MbActionBar`'s primary, so it can be handed to the bar
   as a `className` from the route without reaching inside the component.

   The result: paper ground, muted-but-legible label at `--mb-ink-muted`
   (5.1:1 on paper), opacity 1, cursor and hit area untouched, and NO coral
   anywhere in the bar until the gate is open. Coral returns the instant the
   press will do what it says — which makes the fill mean something again, on
   the one screen where it had stopped meaning anything.

   ONE DEPARTURE FROM `MB_DORMANT`: the frame is `--mb-ink-muted`, not
   `--mb-rule`. `--mb-rule` is `rgba(7,50,77,0.28)`, which composites over
   `--mb-paper-bright` to `rgb(186,194,195)` and measures **1.58:1** — right
   for a control that genuinely cannot be pressed, where the hairline is a
   trace of something switched off, and wrong for this one, which CAN be
   pressed and whose press is the entire recovery path. A commit control the
   eye cannot find is a worse failure than a commit control that overpromises.
   `--mb-ink-muted` puts the frame at the same 5.1:1 as the label, so the
   control is unmistakably a control, unmistakably quieter than the live
   secondary beside it, and unmistakably not making a coral promise.

   HANDOFF: the accessibility tree still reports the control as enabled.
   `aria-disabled="true"` is the correct annotation for "present, focusable,
   not available yet, press me and I will tell you why", but `MbAction` has no
   axis for it yet. One optional `ariaDisabled` field on `MbAction`, forwarded by `BarAction`,
   closes it. Until then the reason is carried by the bar's own status line
   (in the bar, before the press) and by the gate notice (after it).
   =========================================================================== */

export const MB_GATE_DORMANT =
  "[&>button:last-child]:bg-mb-paper-bright! [&>button:last-child]:border-mb-ink-muted! [&>button:last-child]:text-mb-ink-muted!";
