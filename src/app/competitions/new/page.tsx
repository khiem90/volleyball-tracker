"use client";

import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useTeamsPage } from "@/hooks/useTeamsPage";
import {
  parseWizardStep,
  useNewCompetitionPage,
  type NewCompetitionState,
} from "@/hooks/useNewCompetitionPage";
import { MatchbookShell, MB_DEFAULT_CTA } from "@/components/matchbook/AppShell";
import { MbSkeletonPanel } from "@/components/matchbook/Loading";
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

/* ===========================================================================
   NEW COMPETITION — the app's first-run experience

   Layout only (invariant 23). Everything the screen knows comes from
   `useNewCompetitionPage` (state + the one mutation) and
   `useMatchbookNewCompetition` (shape).

   Five structural decisions live here rather than in a step:

   1. ONE commit bar, at every width. `MbActionBar` is `position: sticky`, so
      the primary is reachable without scrolling on a phone AND on a 1440
      desktop, and there is exactly one Create control on the screen rather
      than a masthead copy that has to be kept in step with it.
   2. The panel grid is KEYED on the step, so `.mb-enter-grid` replays its
      staggered settle on every advance. That is the step transition — the
      masthead, the rail and the bar are outside the key and do not move.
   3. The step heading is a visually-hidden `<h2>` that takes focus on every
      step change, and the same sentence is announced through one polite live
      region. A wizard that changes under a screen-reader user without saying
      so is unusable, and `MatchbookShell`'s own announcer keys on `pathname`,
      which a query-string step change never touches.
   4. The team dialogs are mounted HERE, not inside the teams step, so opening
      "Add team" from the empty state and from the entry panel is one code
      path and the dialog survives the list re-rendering underneath it.
   5. THE STEP NUMBER IS STATED EXACTLY ONCE, in the rail. It used to be
      stated four times in one viewport — a masthead badge reading "1 / STEP",
      a masthead dateline "CHOOSE A FORMAT — STEP 1 OF 3", the rail, and the
      action-bar status "Step 1 of 3 · Choose a format to continue". One datum
      through four instruments, and the loudest of them (a boxed coral badge)
      carried the least. Now the three instruments each answer a different
      question: the masthead says *what you are configuring*, the rail says
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
  "mb-enter rounded-[4px] border-solid border-mb-navy bg-mb-paper-bright px-3 py-2";

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
   * This was a `settled` boolean ref that flipped on the first effect run. It
   * does not survive React's double-invoked mount effect: the first pass set
   * the flag, the second pass sailed past it, and `headingRef.current.focus()`
   * ran on a cold load. Measured consequence — `document.activeElement` was
   * `H2#wizard-step-heading` (an `sr-only`, `tabIndex={-1}` node) from +800ms
   * onward, the first Tab press landed on the THIRD format card, and
   * "Skip to content" became the 7th tab stop on a route whose three sibling
   * screens all return it on the first Tab.
   *
   * Comparing against the previous STEP is immune to that, because the guard is
   * a value the second invocation cannot distinguish from the first: on mount
   * `prevStep.current === step`, whichever pass runs.
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
  const notice = <SubmitNotice wizard={wizard} />;

  return (
    <MatchbookShell
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
           The badge was a coral-framed "1 / STEP" lockup that read as "one
           step", duplicated the rail, and added a sixth coral job to a screen
           whose rubric ceiling is two. The Cancel action was the widest control
           above the fold at 390px — `MastheadAction` is `flex-auto` below `sm`,
           so a lone escape hatch stretched to 358px and outweighed every real
           choice on the screen. Cancel now sits in the commit bar on step 1,
           where the bar has no Back to carry; from steps 2 and 3 the rail walks
           back to step 1, and the mobile top strip's "Competitions" back link
           and the desktop sidebar are unchanged. */
        dateLine: view.subLine,
      }}
    >
      <h2 id={STEP_HEADING_ID} ref={headingRef} tabIndex={-1} className="sr-only">
        {heading}
      </h2>
      <p ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <div className="flex flex-col gap-4">
        <div
          className={WIZARD_RAIL_CLASS}
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
            a wizard step are never the same length — a 5-card format grid
            against a 4-line preview — and `.mb-panel` is `height: 100%`, so
            stretching produced a 900px panel holding three lines of text. */}
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

        {notice}

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
    </MatchbookShell>
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
 * The wizard's own silhouette.
 *
 * `MbPageLoading panels={3}` was standing in for this, and it draws the shape
 * of `/competitions`: three ruled row-list panels in a 7/5 + 4 grid. Measured
 * skeleton → loaded at 1440 on the tree this replaces: panel 1 y 108→90 and
 * h 342→134, panel 2 y 108→240 and w 473→669, panel 3 y 466→240, document
 * 710→1024px; at 390, 1016→1736px with a 670px panel displacement. Invariant 26
 * asks for the FINAL geometry, and the final geometry here is a masthead, a
 * one-line rail strip and a 7/5 pair — not a row list in sight.
 *
 * It is composed from `MbSkeleton` rather than from `MbPageLoading` because
 * `MbPageLoading` has no shape axis. HANDOFF (W2): give it one — a `shape`
 * prop, or a `children` escape hatch for the route's own bones — and this
 * component becomes a call site.
 */
const WizardLoading = () => (
  <MatchbookShell
    variant="console"
    active="/competitions"
    back={{ href: "/competitions", label: "Competitions" }}
  >
    <span className="sr-only" role="status">
      Loading page content
    </span>
    <div aria-busy="true">
      {/* The masthead's bones at THIS masthead's configuration: a two-tone
          display line and the dateline, with no badge and no action pair. */}
      <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <Bar h="h-9 sm:h-12" w="w-[13rem] max-w-[62vw]" />
          <span className="hidden flex-col gap-1.5 sm:flex">
            <Bar h="h-[0.74rem]" w="w-[9rem]" />
          </span>
        </div>
        <div className="hidden w-full min-w-0 items-center gap-3 sm:ml-auto sm:w-auto sm:justify-end md:flex">
          <Bar h="h-11" w="w-[9rem]" />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div
          className="rounded-[4px] border-solid border-mb-rule bg-mb-paper-bright px-3 py-2"
          style={{ borderWidth: "var(--mb-rule-edge)" }}
        >
          <div className="flex min-h-[44px] items-start gap-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex flex-1 flex-col gap-1.5">
                <Bar h="h-7" w="w-7" />
                <Bar h="h-[0.74rem]" w="w-[3.5rem]" />
              </span>
            ))}
          </div>
        </div>
        <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
          <div className="xl:col-span-7">
            <MbSkeletonPanel rows={5} />
          </div>
          <div className="xl:col-span-5">
            <MbSkeletonPanel rows={4} />
          </div>
        </div>
      </div>
    </div>
  </MatchbookShell>
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

export default function NewCompetitionPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const hydrated = useHydrated();

  if (isLoading || !isAuthenticated || !hydrated) {
    return <WizardLoading />;
  }

  return (
    <Suspense fallback={<WizardLoading />}>
      <NewCompetitionWizard />
    </Suspense>
  );
}
