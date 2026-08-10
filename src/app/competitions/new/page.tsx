"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useApp } from "@/context/AppContext";
import { useTeamsPage } from "@/hooks/useTeamsPage";
import {
  parseWizardStep,
  useNewCompetitionPage,
  type NewCompetitionState,
} from "@/hooks/useNewCompetitionPage";
import { MatchbookShell, MB_DEFAULT_CTA } from "@/components/matchbook/AppShell";
import { MbSkeleton } from "@/components/matchbook/Skeleton";
import { MbActionBar } from "@/components/matchbook/ActionBar";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbStepRail } from "@/components/matchbook/StepRail";
import {
  useMatchbookNewCompetition,
  wizardStepHeading,
} from "@/components/matchbook/useMatchbookNewCompetition";
import { FormatStep } from "@/components/competitions/new/FormatStep";
import { TeamsStep } from "@/components/competitions/new/TeamsStep";
import { NameStep } from "@/components/competitions/new/NameStep";
import { TeamForm } from "@/components/dialogs/team-form";
import { QuickAddTeams } from "@/components/QuickAddTeams";
import { pluralise } from "@/lib/text";

/* ===========================================================================
   NEW COMPETITION — the app's first-run experience

   Layout only (invariant 23). Everything the screen knows comes from
   `useNewCompetitionPage` (state + the one mutation) and
   `useMatchbookNewCompetition` (shape).

   Six structural decisions live here rather than in a step:

   1. ONE `MatchbookShell`, mounted by the ROUTE and never swapped. The
      skeleton and the wizard are its children, not two shells in sequence.
      Why, measured: the shell moves focus to `<main>` on a route change and
      guards that with a `settled` ref set on the first effect run. The guard
      does not survive React re-connecting a subtree's passive effects — the
      captured stack read `useRouteChange.useEffect → commitHookEffectListMount
      → reconnectPassiveEffects` — so a route that mounts a loading shell and
      then a second, different shell fires the "you navigated" focus move on a
      COLD LOAD. Measured on the two-shell tree: `document.activeElement` was
      `MAIN#mb-main` from +633ms, and the first Tab press returned the masthead
      Account chip instead of `.mb-skip-link`, on the one route in the app
      where that was true (`/competitions`, `/teams` and `/quick-match` all
      arrive on `BODY` and return the skip link first). With one shell the
      effect runs once, the guard holds, and the route matches its siblings.
      `/competitions` never showed the defect because its auth gate resolves
      synchronously in dev-preview, so its `MbPageLoading` shell never renders;
      this route's hydration gate guarantees the second mount.
   2. ONE commit bar, at every width. `MbActionBar` is `position: sticky`, so
      the primary is reachable without scrolling on a phone AND on a 1440
      desktop, and there is exactly one Create control on the screen rather
      than a masthead copy that has to be kept in step with it.
   3. The panel grid is KEYED on the step, so `.mb-enter-grid` replays its
      staggered settle on every advance. That is the step transition — the
      masthead, the rail and the bar are outside the key and do not move.
   4. The step heading is a visually-hidden `<h2>` that takes focus on every
      step change, and the same sentence is announced through one polite live
      region. A wizard that changes under a screen-reader user without saying
      so is unusable, and `MatchbookShell`'s own announcer keys on `pathname`,
      which a query-string step change never touches.
   5. The team dialogs are mounted HERE, not inside the teams step, so opening
      "Add team" from the empty state and from the entry panel is one code
      path and the dialog survives the list re-rendering underneath it.
   6. THE STEP NUMBER IS STATED EXACTLY ONCE, in the rail. It used to be
      stated four times in one viewport — a masthead badge reading "1 / STEP",
      a masthead dateline "CHOOSE A FORMAT — STEP 1 OF 3", the rail, and the
      action-bar status "Step 1 of 3 · Choose a format to continue". One datum
      through four instruments, and the loudest of them (a boxed coral badge)
      carried the least. Now the three instruments each answer a different
      question: the masthead says *what you are drawing from*, the rail says
      *where you are*, the bar says *what is stopping you*.
   =========================================================================== */

const STEP_HEADING_ID = "wizard-step-heading";

/**
 * The rail's shell.
 *
 * It was a full `Panel` titled "Progress" — a panel head, an icon, a 4px navy
 * top border and 24px of body padding wrapped around three words, measured at
 * 175px of desktop and 320px of an 844px phone viewport to restate a number the
 * action bar was already restating. A rail is navigation chrome, not a data
 * panel, so it is drawn as chrome: one edge rule, one 4px radius, no head.
 *
 * `borderWidth` is inline rather than `border-[1.5px]` for the reason
 * `form.tsx` documents — the width belongs to the `--mb-rule-*` tier, and the
 * literal renders 1px anyway.
 */
const WIZARD_RAIL_CLASS =
  "rounded-[4px] border-solid border-mb-navy bg-mb-paper-bright px-3 py-2";

/* --------------------------------------------------------------- notices */

const SubmitNotice = ({ wizard }: { wizard: NewCompetitionState }) => {
  const online = useOnlineStatus();

  if (wizard.submit.kind === "denied") {
    return (
      <MbNotice tone="danger" icon="lock" title="You cannot create here">
        This shared session is open to you as a viewer, so the competition was
        not created. Ask the session owner for the admin link, then try again.
      </MbNotice>
    );
  }

  if (wizard.submit.kind === "stalled") {
    return (
      <MbNotice tone="warn" title="Still saving">
        The competition has not come back yet. Check your connection — nothing
        has been lost, and pressing Create again will retry.
      </MbNotice>
    );
  }

  if (!online) {
    return (
      <MbNotice tone="warn" icon="wifi-off" title="You are offline">
        The wizard keeps working and saves to this device. A shared session will
        not receive the competition until the connection returns.
      </MbNotice>
    );
  }

  if (wizard.readOnly) {
    return (
      <MbNotice tone="info" icon="lock" title="Viewer access">
        You are viewing a shared session. Creating a competition needs the admin
        link.
      </MbNotice>
    );
  }

  return null;
};

/* ----------------------------------------------------------------- wizard */

const NewCompetitionWizard = () => {
  const wizard = useNewCompetitionPage();
  const view = useMatchbookNewCompetition(wizard);

  const {
    formOpen,
    setFormOpen,
    quickAddOpen,
    setQuickAddOpen,
    editingTeam,
    handleCreateClick,
    handleQuickAddClick,
    handleFormSubmit,
    handleQuickAddTeams,
  } = useTeamsPage();

  const { step, stepIndex, selectedFormat, teams, handleSelectAll } = wizard;

  /**
   * A team created from inside the wizard is entered automatically.
   *
   * Without this the empty state is a dead end: the old flow inserted a
   * colourless "Team N", left it unselected, and the Next button stayed
   * disabled with no explanation (brief §2.4 defect 7). The ids are diffed
   * rather than threaded back through the dialog, because bulk add returns
   * nothing and both paths have to behave the same.
   */
  const enterNewTeams = useRef(false);
  const knownTeamIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const current = teams.map((team) => team.id);
    const known = knownTeamIds.current;
    knownTeamIds.current = new Set(current);
    if (!known) return;
    const fresh = current.filter((id) => !known.has(id));
    if (fresh.length === 0 || !enterNewTeams.current) return;
    enterNewTeams.current = false;
    handleSelectAll(fresh);
  }, [teams, handleSelectAll]);

  const openTeamForm = () => {
    enterNewTeams.current = true;
    handleCreateClick();
  };
  const openQuickAdd = () => {
    enterNewTeams.current = true;
    handleQuickAddClick();
  };

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const liveRef = useRef<HTMLParagraphElement | null>(null);

  const heading = `${wizardStepHeading(step)} — step ${stepIndex + 1} of 3`;

  /**
   * Focus moves ON AN ADVANCE, and only on an advance.
   *
   * This was a `settled` boolean ref that flipped on the first effect run —
   * the same shape as the shell defect in note 1, and it failed the same way:
   * `document.activeElement` was `H2#wizard-step-heading` (an `sr-only`,
   * `tabIndex={-1}` node) from +800ms on a cold load, and the first Tab press
   * landed on the third format card.
   *
   * Comparing against the previous STEP is immune to a re-run, because the
   * guard is a value a second invocation cannot distinguish from the first: on
   * mount `prevStep.current === step`, whichever pass runs.
   */
  const prevStep = useRef(step);
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    if (liveRef.current) liveRef.current.textContent = heading;
    // `heading` is derived from `step`; keying on the step is what makes this
    // fire once per advance rather than on every keystroke in the name field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /**
   * Steps 1 and 2 disable the primary, because the status line beside it names
   * the gate ("Choose a format to continue", "Select at least 3 teams") and the
   * gate is a selection the user can see. Step 3 does NOT: a blank name is a
   * field-level error, so the button stays live and pressing it says what is
   * missing and puts the caret in the field.
   */
  const canAdvance =
    step === "format"
      ? Boolean(selectedFormat)
      : step === "teams"
        ? wizard.validation.valid
        : true;

  const submitting = wizard.submit.kind === "submitting";

  return (
    <>
      <h2 id={STEP_HEADING_ID} ref={headingRef} tabIndex={-1} className="sr-only">
        {heading}
      </h2>
      <p ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <div className="flex flex-col gap-4">
        <div
          className={`mb-enter ${WIZARD_RAIL_CLASS}`}
          style={{ borderWidth: "var(--mb-rule-edge)" }}
        >
          <MbStepRail
            steps={view.railSteps}
            current={step}
            onNavigate={(id) => wizard.goToStep(parseWizardStep(id))}
            label="Competition setup"
          />
        </div>

        {/* Keyed on the step: `.mb-enter-grid` replays per advance.

            `xl:items-start` rather than the default stretch. The two columns of
            a wizard step are never the same length — a directory against a
            roster — and `.mb-panel` is `height: 100%`, so stretching produced a
            900px panel holding three lines of text. */}
        <div
          key={step}
          className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start"
        >
          {step === "format" && (
            <FormatStep
              formats={view.formats}
              selectedFormat={selectedFormat}
              onSelectFormat={wizard.handleFormatSelect}
              previewLines={view.previewLines}
              previewBasis={view.previewBasis}
            />
          )}

          {step === "teams" && selectedFormat && (
            <TeamsStep
              rows={view.entryRows}
              selectedIds={wizard.selectedIds}
              entryIds={wizard.entryIds}
              entryRowsById={view.entryRowsById}
              validation={wizard.validation}
              formatLabel={view.formatLabel}
              onToggle={wizard.handleTeamToggle}
              onSelectAll={wizard.handleSelectAll}
              onClear={wizard.handleClearSelection}
              onCreateTeam={openTeamForm}
              onQuickAdd={openQuickAdd}
              readOnly={wizard.readOnly}
            />
          )}

          {step === "details" && selectedFormat && (
            <NameStep
              format={selectedFormat}
              competitionName={wizard.competitionName}
              nameError={wizard.nameError}
              onNameChange={wizard.handleNameChange}
              onSubmit={wizard.handleCreate}
              onChangeFormat={() => wizard.goToStep("format")}
              entryCount={wizard.entryCount}
              seriesOptions={view.seriesOptions}
              matchSeriesLength={wizard.matchSeriesLength}
              onSeriesChange={wizard.setMatchSeriesLength}
              courtOptionList={view.courtOptionList}
              numberOfCourts={wizard.numberOfCourts}
              onCourtsChange={wizard.setNumberOfCourts}
              instantWinEnabled={wizard.instantWinEnabled}
              onInstantWinChange={wizard.setInstantWinEnabled}
              advanced={wizard.advanced}
              onAdvancedChange={wizard.updateAdvanced}
              onAdvancedReset={wizard.resetAdvanced}
              advancedCustomised={wizard.advancedCustomised}
              previewLines={view.previewLines}
              previewBasis={view.previewBasis}
            />
          )}
        </div>

        <SubmitNotice wizard={wizard} />

        {/* `--mb-toast-offset` is `MatchbookBottomBar`'s own published height —
            57px below `lg`, 0 at `lg` and 0 in landscape — so the commit bar
            rides above the fixed tab bar without this file restating either
            media query. The `!` is required: `.mb-action-bar { bottom: 0 }` is
            unlayered and outranks a plain utility.

            `.mb-enter .mb-stagger-4` is the "slides up on first mount only"
            the brief asks of a sticky commit bar: it sits outside the step key,
            so it arrives once with the route and never moves again. */}
        <MbActionBar
          className="mb-enter mb-stagger-4 bottom-[var(--mb-toast-offset,0px)]!"
          status={view.statusLine}
          /* Back from step 2 onward; Cancel on step 1, where there is nothing
             to go back to and the bar would otherwise carry a lone primary. */
          secondary={
            stepIndex > 0
              ? { label: "Back", icon: "chevron-left", onClick: wizard.handleBack }
              : { label: "Cancel", icon: "close", onClick: wizard.handleCancel }
          }
          primary={{
            label: submitting ? "Creating…" : view.primaryLabel,
            icon: step === "details" ? "check" : "chevron-right",
            onClick: step === "details" ? wizard.handleCreate : wizard.handleNext,
            disabled: !canAdvance || wizard.readOnly,
            loading: submitting,
          }}
        />
      </div>

      <TeamForm
        open={formOpen}
        onOpenChange={setFormOpen}
        team={editingTeam}
        onSubmit={handleFormSubmit}
      />

      <QuickAddTeams
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onAddTeams={handleQuickAddTeams}
        existingTeamCount={teams.length}
      />
    </>
  );
};

/* ------------------------------------------------------------------ loading */

/** One bar inside a slot, so a skeleton line keeps the real line's box. */
const Bar = ({ h, w }: { h: string; w: string }) => (
  <span className={`block ${h} ${w}`}>
    <MbSkeleton w="100%" h="100%" radius={2} />
  </span>
);

/**
 * The wizard's own silhouette, drawn inside the real shell.
 *
 * `MbPageLoading panels={3}` was standing in for this and it draws the shape of
 * `/competitions`: ruled row-list panels in a 7/5 + 4 grid. Measured
 * skeleton → loaded at 1440 on that tree: panel 1 y 108→90 and h 342→134,
 * panel 2 y 108→240 and w 473→669, panel 3 y 466→240, document 710→1024px; at
 * 390, 1016→1736px with a 670px panel displacement. Invariant 26 asks for the
 * FINAL geometry, and the final geometry here is a one-line rail strip over a
 * full-width choice panel over a full-width preview — not a row list in sight.
 *
 * The masthead is NOT drawn here any more: the route owns it, so during loading
 * it IS the real masthead and its geometry cannot differ from itself.
 *
 * The bones are the step-1 arrival state, because that is what a cold load
 * paints unless a draft says otherwise: five choice boxes in the same two-up
 * grid `FormatStep` uses, then the preview panel's ruled lines.
 *
 * HANDOFF (W2): `MbPageLoading` has no shape axis — a `shape` prop, or a
 * `children` escape hatch for a route's own bones, would make this a call site
 * instead of a component.
 */
const WizardBones = () => (
  <div aria-busy="true">
    <span className="sr-only" role="status">
      Loading page content
    </span>
    <div className="flex flex-col gap-4">
      {/* The rail strip at its real height: a numeral row over the label line,
          inside the same 8px padding box the live rail uses. */}
      <div
        className={WIZARD_RAIL_CLASS}
        style={{ borderWidth: "var(--mb-rule-edge)" }}
        aria-hidden="true"
      >
        <div className="flex items-start gap-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex flex-1 flex-col gap-2">
              {/* 42 + 8 + 11.84 = 61.84 inside a 16px padding box and a 2px
                  rule: 79.84 against the live rail's measured 80. */}
              <Bar h="h-[42px]" w="w-[34px]" />
              <Bar h="h-[0.74rem]" w="w-[3.5rem]" />
            </span>
          ))}
        </div>
      </div>

      {/* `aria-hidden` on the bones themselves: the `role="status"` line above
          is the whole announcement, and a screen reader crawling forty empty
          boxes is the defect a skeleton is supposed to avoid. */}
      <div
        className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start"
        aria-hidden="true"
      >
        <section className="mb-panel xl:col-span-12">
          <header className="mb-panel-head">
            <span className="flex h-6 w-[9rem] max-w-[60%] items-center">
              <MbSkeleton w="100%" h="0.95rem" radius={2} />
            </span>
            <span className="flex h-6 w-[4.5rem] items-center">
              <MbSkeleton w="100%" h="0.62rem" radius={2} />
            </span>
          </header>
          {/* Same grid, same gap, same card box as `FormatStep` — five choices
              two-up with the odd one spanning — so the bones cannot drift from
              the layout they stand in for. */}
          {/* Every bar is a LINE BOX, not a glyph height — the same correction
              `MbSkeletonPanel` documents for its panel head. A card measures
              32 (p-4) + 44 disc + 10 + 19 title + 10 + description + 10 + 1
              rule + 10 + 15 kicker + 2 border. With the description at one
              line that is 170px, against the live card's measured 170; below
              `sm` the blurb sets two lines, which is the one bar that changes
              height rather than a second bar that would also add a 10px gap. */}
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`flex flex-col gap-2.5 rounded-[4px] border border-mb-rule p-4 pl-[1.15rem] ${
                  i === 4 ? "sm:col-span-2" : ""
                }`}
              >
                <Bar h="h-11" w="w-11" />
                <Bar h="h-[19px]" w="w-[8rem]" />
                <Bar h="h-[34px] sm:h-[17px]" w="w-[85%]" />
                {/* No `mt-*`: the 10px above this rule is the column's own
                    `gap-2.5`, exactly as it is in the live card. Adding a
                    margin on top of the gap measured +10px per card — 31px of
                    panel at 1440 and 50px at 390. */}
                <span className="block border-t border-mb-rule pt-2.5">
                  <Bar h="h-[15px]" w="w-[5rem]" />
                </span>
              </span>
            ))}
          </div>
        </section>

        <section className="mb-panel xl:col-span-12">
          <header className="mb-panel-head">
            <span className="flex h-6 w-[9rem] max-w-[60%] items-center">
              <MbSkeleton w="100%" h="0.95rem" radius={2} />
            </span>
          </header>
          {/* Two 52px rules under a 48px head is 153px — the height
              `Format Preview` measures on arrival, where it carries its
              "no format chosen yet" block rather than four ruled figures. */}
          <div className="flex flex-col">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex min-h-[52px] items-center justify-between gap-3 border-b border-mb-rule px-4 py-3 last:border-b-0"
              >
                <Bar h="h-[0.62rem]" w="w-[6rem]" />
                <Bar h="h-[0.95rem]" w="w-[3rem]" />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* The commit bar is 82px of the final geometry at `sm` and above and
          106px below it — `MB_ACTION_BAR_H` / `MB_ACTION_BAR_H_STACKED`, the
          two heights `ActionBar.tsx` pins itself to. Leaving it out of the
          bones was worth 82/106px of document height on its own, which is a
          scroll range that appears the instant the data lands. */}
      <div
        className="mb-action-bar min-h-[calc(82px_+_var(--mb-safe-bottom))] flex-wrap bottom-[var(--mb-toast-offset,0px)]! max-sm:min-h-[calc(106px_+_var(--mb-safe-bottom))] sm:flex-nowrap"
        aria-hidden="true"
      >
        <span className="min-w-0 flex-1">
          <Bar h="h-[0.75rem]" w="w-[11rem] max-w-full" />
        </span>
        <span className="flex shrink-0 gap-2 max-sm:w-full">
          <Bar h="h-14" w="w-[7rem] max-sm:flex-auto" />
          <Bar h="h-14" w="w-[11rem] max-sm:flex-auto" />
        </span>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------- route */

/**
 * `false` on the server and through hydration, `true` afterwards.
 *
 * The wizard reads its `sessionStorage` draft in a lazy `useState` initialiser,
 * which is only safe if the subtree never renders on the server — and in the
 * dev-preview build `AuthContext` resolves synchronously, so the auth gate
 * alone does not guarantee that. `useSyncExternalStore` with a server snapshot
 * is the sanctioned way to say "client only" without a setState in an effect.
 */
const neverChanges = () => () => {};
const useHydrated = (): boolean =>
  useSyncExternalStore(
    neverChanges,
    () => true,
    () => false
  );

/**
 * The masthead's context line — the one fact that is true at every step.
 *
 * It used to be `format · n of m teams entered`, which the rail already states
 * twice over ("FORMAT / Round Robin", "TEAMS / 8 selected"): a fifth
 * restatement of the wizard's own progress in a viewport that had four. The
 * library size is what the wizard DRAWS FROM rather than what it is doing, it
 * needs no wizard state, and that is what lets the masthead be hoisted above
 * the step machine (note 1).
 */
const LibraryLine = () => {
  const { state } = useApp();
  const count = state.teams.length;
  return <>{`${count} ${pluralise("team", count)} in library`}</>;
};

const WizardShell = ({ children }: { children: ReactNode }) => (
  <MatchbookShell
    variant="console"
    active="/competitions"
    cta={MB_DEFAULT_CTA}
    back={{ href: "/competitions", label: "Competitions" }}
    masthead={{
      title: (
        <>
          New <span className="text-mb-coral">Competition</span>
        </>
      ),
      shortTitle: "New competition",
      /* No badge and no actions.
         The badge was a coral-framed "1 / STEP" lockup that read as "one step",
         duplicated the rail, and added a sixth coral job to a screen whose
         rubric ceiling is two. The Cancel action was the widest control above
         the fold at 390px — `MastheadAction` is `flex-auto` below `sm`, so a
         lone escape hatch stretched to 358px and outweighed every real choice
         on the screen. Cancel now sits in the commit bar on step 1, where the
         bar has no Back to carry; from steps 2 and 3 the rail walks back, and
         the mobile top strip's "Competitions" link is unchanged. */
      dateLine: <LibraryLine />,
    }}
  >
    {children}
  </MatchbookShell>
);

export default function NewCompetitionPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const hydrated = useHydrated();
  const ready = !isLoading && isAuthenticated && hydrated;

  return (
    <WizardShell>
      {ready ? (
        <Suspense fallback={<WizardBones />}>
          <NewCompetitionWizard />
        </Suspense>
      ) : (
        <WizardBones />
      )}
    </WizardShell>
  );
}
