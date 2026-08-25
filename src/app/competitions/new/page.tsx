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
import {
  MB_VIEWPORT_FILL,
  useMbViewportFill,
} from "@/components/matchbook/useViewportFill";
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
import { MB_GATE_DORMANT } from "@/components/competitions/new/dormant";
import { pluralise } from "@/lib/text";

/* NEW COMPETITION wizard. Structural constraints:

   1. ONE `MatchbookShell`, mounted by the route and never swapped: the shell's
      route-change focus move is guarded by a first-run ref, and that guard
      does not survive React re-connecting a subtree's passive effects — a
      loading shell followed by a second shell fires the "you navigated" focus
      move on a cold load.
   2. One sticky commit bar. Sticky only sticks inside its containing block,
      so the column takes at least the viewport height (useViewportFill) or
      the bar comes to rest mid-page on a short step.
   3. The panel grid is keyed on the step so `.mb-enter-grid` replays per
      advance; masthead, rail and bar sit outside the key.
   4. The sr-only step `<h2>` takes focus on each advance and the same line is
      announced via a live region — the shell's own announcer keys on
      `pathname`, which a query-string step change never touches.
   5. The team dialogs mount here, not inside the teams step, so they survive
      the list re-rendering underneath them. */

const STEP_HEADING_ID = "wizard-step-heading";

/* `borderWidth` is inline rather than `border-[1.5px]`: the width belongs to
   the `--mb-rule-*` tier, and the literal renders 1px anyway (see form.tsx). */
const WIZARD_RAIL_CLASS =
  "rounded-[4px] border-solid border-mb-navy bg-mb-paper-bright px-3 py-2";

const VIEWPORT_FILL = MB_VIEWPORT_FILL;
const useViewportFill = useMbViewportFill;

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

  /* A team created from inside the wizard is entered automatically. The ids
     are diffed rather than threaded back through the dialog, because bulk add
     returns nothing and both paths must behave the same. */
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

  /* Focus moves on an advance only. Guard by comparing the previous STEP, not
     a first-run flag — a flag does not survive effect re-runs, but on mount
     `prevStep.current === step` whichever pass runs. */
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

  const submitting = wizard.submit.kind === "submitting";
  const columnRef = useViewportFill();

  return (
    <>
      <h2 id={STEP_HEADING_ID} ref={headingRef} tabIndex={-1} className="sr-only">
        {heading}
      </h2>
      <p ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <div ref={columnRef} className={`flex flex-col gap-4 ${VIEWPORT_FILL}`}>
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

        {/* `data-wizard-gate` + `tabIndex={-1}` is the contract
            `useNewCompetitionPage.focusGate` looks for: pressing a primary
            that cannot move focuses (and scrolls to) this wrapper. */}
        <div
          data-wizard-gate
          tabIndex={-1}
          className="scroll-mt-4 outline-none empty:hidden"
        >
          {wizard.gateMessage ? (
            <MbNotice tone="warn" title="One thing first">
              {wizard.gateMessage}
            </MbNotice>
          ) : null}
        </div>

        {/* Keyed on the step: `.mb-enter-grid` replays per advance.
            `xl:items-start`, not stretch — `.mb-panel` is `height: 100%`. */}
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

        {/* `--mb-toast-offset` is the tab bar's own published height, so the
            commit bar rides above it without restating its media queries. The
            `!` is required: `.mb-action-bar { bottom: 0 }` is unlayered and
            outranks a plain utility. `mt-auto` pairs with VIEWPORT_FILL to
            send the bar to the bottom of a short step. `MB_GATE_DORMANT`
            keeps the primary operable while gated but out of commit dress
            (recipe in `competitions/new/dormant.ts`). */}
        <MbActionBar
          className={`mb-enter mb-stagger-4 mt-auto bottom-[var(--mb-toast-offset,0px)]! ${
            view.gateOpen ? "" : MB_GATE_DORMANT
          }`}
          status={view.statusLine}
          /* Back from step 2 onward; Cancel on step 1. */
          secondary={
            stepIndex > 0
              ? { label: "Back", icon: "chevron-left", onClick: wizard.handleBack }
              : { label: "Cancel", icon: "close", onClick: wizard.handleCancel }
          }
          /* The primary is never disabled: pressing it while gated raises
             `gateMessage` and moves focus to `[data-wizard-gate]`. `readOnly`
             is not a gate either — Create as a viewer raises SubmitNotice. */
          primary={{
            label: submitting ? "Creating…" : view.primaryLabel,
            icon: step === "details" ? "check" : "chevron-right",
            onClick: step === "details" ? wizard.handleCreate : wizard.handleNext,
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

/* The wizard's skeleton, drawn to the FINAL geometry of the step-1 arrival
   state: a rail strip over one panel of five ruled 56px choice rows. The
   masthead is not drawn — the route owns the real one. */
const WizardBones = () => {
  const columnRef = useViewportFill();
  return (
  <div aria-busy="true">
    <span className="sr-only" role="status">
      Loading page content
    </span>
    {/* The same fill as the live column, so the skeleton's commit bar sits
        where the real one will and the swap moves nothing. */}
    <div ref={columnRef} className={`flex flex-col gap-4 ${VIEWPORT_FILL}`}>
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
              <Bar h="h-[42px]" w="w-[34px]" />
              <Bar h="h-[0.74rem]" w="w-[3.5rem]" />
            </span>
          ))}
        </div>
      </div>

      {/* `aria-hidden` on the bones — the `role="status"` line above is the
          whole announcement. */}
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
          {/* Five ruled 56px rows — the exact box `FormatChoiceList` draws, so
              the bones cannot drift from the layout they stand in for. */}
          <div className="flex flex-col divide-y divide-mb-rule">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="flex min-h-[56px] items-center gap-2.5 py-2.5 pr-3 pl-3.5"
              >
                <Bar h="h-[18px]" w="w-[18px]" />
                <Bar h="h-9" w="w-9" />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <Bar h="h-[19px]" w="w-[7rem] max-w-full" />
                  <Bar h="h-[14px]" w="w-[10rem] max-w-full" />
                </span>
                <Bar h="h-[0.62rem]" w="w-[3rem]" />
              </span>
            ))}
          </div>
        </section>

        {/* No second panel: step 1 no longer renders Format Preview on
            arrival, and a skeleton must not stand in for a panel the loaded
            page does not have. */}
      </div>

      {/* The commit bar at the two heights `ActionBar.tsx` pins itself to —
          leaving it out of the bones shifts the document when data lands. */}
      <div
        className="mb-action-bar mt-auto min-h-[calc(82px_+_var(--mb-safe-bottom))] flex-wrap bottom-[var(--mb-toast-offset,0px)]! max-sm:min-h-[calc(106px_+_var(--mb-safe-bottom))] sm:flex-nowrap"
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
};

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

/* Needs no wizard state, which is what lets the masthead sit above the step
   machine. */
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
    /* One short word: the strip's title is the only flexible child and always
       loses width to a long back label first. */
    back={{ href: "/competitions", label: "Back" }}
    masthead={{
      title: (
        <>
          New <span className="text-mb-coral">Competition</span>
        </>
      ),
      shortTitle: "New competition",
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
