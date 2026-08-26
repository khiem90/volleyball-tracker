"use client";

/* The create-competition state machine: wizard state, draft persistence, and
   the one mutation. No JSX — `FORMAT_META` owns icons, hence a `.ts`. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { FORMAT_META } from "@/components/matchbook/formatMeta";
import type { CompetitionType } from "@/types/game";
import {
  buildCompetitionConfig,
  clampCourts,
  courtOptionCount,
  isConfigCustomised,
  parseDraft,
  parseWizardStep,
  validateEntry,
  wizardStepHref,
  DEFAULT_ADVANCED_SETTINGS,
  WIZARD_DRAFT_KEY,
  WIZARD_STEPS,
  WIZARD_STEP_PARAM,
  type AdvancedSettings,
  type WizardDraft,
  type WizardStep,
} from "@/components/competitions/new/rules";

/* -------------------------------------------------------------- the rules */

/* Everything the wizard *decides* lives in `rules` (React-free, testable
   without mounting); re-exported so call sites have one import. */
export * from "@/components/competitions/new/rules";

/* -------------------------------------------------------------- draft store */

const readDraft = (): WizardDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    return parseDraft(window.sessionStorage.getItem(WIZARD_DRAFT_KEY));
  } catch {
    return null;
  }
};

const writeDraft = (draft: WizardDraft): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Private mode, quota, disabled storage — a draft is a convenience. */
  }
};

const clearDraft = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(WIZARD_DRAFT_KEY);
  } catch {
    /* as above */
  }
};

/* ------------------------------------------------------------ submit states */

export type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "denied" }
  | { kind: "stalled" };

/** How long a create may take before the wizard says so instead of spinning. */
const SUBMIT_TIMEOUT_MS = 6000;

/* -------------------------------------------------------------------- hook */

export const useNewCompetitionPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, createCompetition, isSharedMode, canEdit } = useApp();

  /* The wizard only mounts after hydration (the route gates on it), so a lazy
     initialiser reads the draft during the first render rather than correcting
     itself in an effect — no flash of an empty wizard over a restored one, and
     no hydration mismatch because the server never renders this subtree. */
  const [draft] = useState<WizardDraft | null>(readDraft);

  const [selectedFormat, setSelectedFormat] = useState<CompetitionType | null>(
    draft?.format ?? null
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    draft?.teamIds ?? []
  );
  const [competitionName, setCompetitionName] = useState(draft?.name ?? "");
  const [nameError, setNameError] = useState("");
  const [numberOfCourts, setNumberOfCourts] = useState(draft?.courts ?? 1);
  const [matchSeriesLength, setMatchSeriesLength] = useState(draft?.series ?? 1);
  const [instantWinEnabled, setInstantWinEnabled] = useState(
    draft?.instantWin ?? false
  );
  const [advanced, setAdvanced] = useState<AdvancedSettings>(
    draft?.advanced ?? DEFAULT_ADVANCED_SETTINGS
  );
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  const readOnly = isSharedMode && !canEdit;

  /* ------------------------------------------------------------ selection */

  /** A `Set`, so a 200-row directory is O(1) per row instead of O(n). */
  const selectedIds = useMemo(() => new Set(selectedTeamIds), [selectedTeamIds]);

  /* A team can be deleted from another tab while the wizard is open. Entries
     are filtered against the live library on read so a stale draft can never
     create a competition referencing a team that no longer exists. */
  const liveTeamIds = useMemo(
    () => new Set(state.teams.map((team) => team.id)),
    [state.teams]
  );
  const entryIds = useMemo(
    () => selectedTeamIds.filter((id) => liveTeamIds.has(id)),
    [selectedTeamIds, liveTeamIds]
  );

  const entryCount = entryIds.length;
  const validation = useMemo(
    () => validateEntry(selectedFormat, entryCount),
    [selectedFormat, entryCount]
  );

  /* -------------------------------------------------------------- routing */

  const rawStep = parseWizardStep(searchParams.get(WIZARD_STEP_PARAM));
  /* A step the wizard cannot honour is *rendered* as the furthest reachable one
     rather than only corrected in an effect, so a deep link to `?step=details`
     never paints an empty details form for one frame. */
  const step: WizardStep =
    rawStep !== "format" && !selectedFormat
      ? "format"
      : rawStep === "details" && !validation.valid
        ? "teams"
        : rawStep;

  useEffect(() => {
    if (step !== rawStep) router.replace(wizardStepHref(step));
  }, [step, rawStep, router]);

  const goToStep = useCallback(
    (next: WizardStep) => {
      router.push(wizardStepHref(next));
    },
    [router]
  );

  const stepIndex = WIZARD_STEPS.indexOf(step);

  /* ----------------------------------------------------------- the gate */

  /* The primary is never disabled: `canAdvance` feeds the status line (the
     reason BEFORE the press); pressing a blocked primary sets `gateAskedAt`,
     which raises the gate notice and moves focus to `[data-wizard-gate]`. */
  const canAdvance =
    step === "format"
      ? Boolean(selectedFormat)
      : step === "teams"
        ? validation.valid
        : true;

  const [gateAskedAt, setGateAskedAt] = useState<WizardStep | null>(null);

  /* Derived, never cleared by hand — `canAdvance` is in the expression, so
     the notice vanishes the instant the gate is satisfied. */
  const gateMessage =
    gateAskedAt !== step || canAdvance
      ? ""
      : step === "format"
        ? "Pick one of the five formats below — the wizard needs to know what it is scheduling before it can go on."
        : state.teams.length === 0
          ? "There are no teams in this account yet. Create some below and they are entered automatically."
          : `${validation.message || "Select the teams that will take part"} before you can continue.`;

  /* `[data-wizard-gate]` is a tabIndex={-1} wrapper; exactly one exists at a
     time, so this needs no knowledge of a step's internals. */
  const focusGate = useCallback(() => {
    if (typeof document === "undefined") return;
    document.querySelector<HTMLElement>("[data-wizard-gate]")?.focus();
  }, []);

  const handleNext = useCallback(() => {
    if (canAdvance) {
      setGateAskedAt(null);
      if (step === "format") goToStep("teams");
      else if (step === "teams") goToStep("details");
      return;
    }
    setGateAskedAt(step);
    focusGate();
  }, [canAdvance, step, goToStep, focusGate]);

  /** Retreat uses history, so the wizard and the Back button agree. */
  const handleBack = useCallback(() => {
    if (stepIndex <= 0) return;
    router.back();
  }, [stepIndex, router]);

  const handleCancel = useCallback(() => {
    clearDraft();
    router.push("/competitions");
  }, [router]);

  /* ---------------------------------------------------------------- draft */

  useEffect(() => {
    if (
      !selectedFormat &&
      selectedTeamIds.length === 0 &&
      competitionName === ""
    ) {
      clearDraft();
      return;
    }
    writeDraft({
      format: selectedFormat,
      teamIds: selectedTeamIds,
      name: competitionName,
      courts: numberOfCourts,
      series: matchSeriesLength,
      instantWin: instantWinEnabled,
      advanced,
    });
  }, [
    selectedFormat,
    selectedTeamIds,
    competitionName,
    numberOfCourts,
    matchSeriesLength,
    instantWinEnabled,
    advanced,
  ]);

  /* -------------------------------------------------------------- actions */

  const handleFormatSelect = useCallback((type: CompetitionType) => {
    setSelectedFormat(type);
  }, []);

  const handleTeamToggle = useCallback((teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedTeamIds((prev) => {
      const everyOne = ids.every((id) => prev.includes(id));
      if (everyOne) return prev.filter((id) => !ids.includes(id));
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return Array.from(next);
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedTeamIds([]), []);

  const handleNameChange = useCallback((value: string) => {
    setCompetitionName(value);
    setNameError("");
  }, []);

  const updateAdvanced = useCallback(
    (patch: Partial<AdvancedSettings>) =>
      setAdvanced((prev) => ({ ...prev, ...patch })),
    []
  );

  const resetAdvanced = useCallback(
    () => setAdvanced(DEFAULT_ADVANCED_SETTINGS),
    []
  );

  /* ------------------------------------------------------- derived config */

  const supports = selectedFormat ? FORMAT_META[selectedFormat].supports : null;
  const courtOptions = courtOptionCount(entryCount);
  const effectiveCourts = clampCourts(numberOfCourts, entryCount);

  /* --------------------------------------------------------------- submit */

  /* `createCompetition`'s returned id is only correct in shared mode — local
     mode's reducer mints its own — so the wizard identifies its creation by
     diffing the competition list, which works in both modes. */
  const pending = useRef<{ before: Set<string>; fallbackId: string } | null>(null);

  const handleCreate = useCallback(() => {
    if (submit.kind === "submitting") return;

    const trimmedName = competitionName.trim();
    if (!trimmedName) {
      setNameError("Give the competition a name before creating it");
      /* The commit control stays enabled so this branch is reachable; focus
         follows the message. */
      if (typeof document !== "undefined") {
        document.getElementById("competition-name")?.focus();
      }
      return;
    }
    if (!selectedFormat || !validation.valid) return;

    if (readOnly) {
      setSubmit({ kind: "denied" });
      return;
    }

    const courtsToUse = supports?.courts ? effectiveCourts : undefined;
    const seriesToUse = supports?.series ? matchSeriesLength : undefined;
    const instantWinToUse = supports?.scoringMode ? instantWinEnabled : undefined;

    const before = new Set(state.competitions.map((comp) => comp.id));
    setSubmit({ kind: "submitting" });

    const returned = createCompetition(
      trimmedName,
      selectedFormat,
      entryIds,
      courtsToUse,
      seriesToUse,
      instantWinToUse,
      buildCompetitionConfig(advanced)
    );

    /* The one signal a viewer's write was refused that survives without
       editing AppContext: it short-circuits to "" before doing anything. */
    if (!returned) {
      pending.current = null;
      setSubmit({ kind: "denied" });
      return;
    }

    pending.current = { before, fallbackId: returned };
  }, [
    submit.kind,
    competitionName,
    selectedFormat,
    validation.valid,
    readOnly,
    supports,
    effectiveCourts,
    matchSeriesLength,
    instantWinEnabled,
    state.competitions,
    createCompetition,
    entryIds,
    advanced,
  ]);

  useEffect(() => {
    const job = pending.current;
    if (!job) return;
    const created = state.competitions.find((comp) => !job.before.has(comp.id));
    if (!created) return;
    pending.current = null;
    clearDraft();
    router.replace(`/competitions/${created.id}`);
  }, [state.competitions, router]);

  useEffect(() => {
    if (submit.kind !== "submitting") return;
    const timer = window.setTimeout(() => {
      if (!pending.current) return;
      pending.current = null;
      setSubmit({ kind: "stalled" });
    }, SUBMIT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [submit.kind]);

  const dismissSubmitNotice = useCallback(() => setSubmit({ kind: "idle" }), []);

  return {
    // library
    teams: state.teams,
    matches: state.matches,
    competitions: state.competitions,

    // step machine
    step,
    stepIndex,
    goToStep,
    handleNext,
    handleBack,
    handleCancel,

    // the gate — `canAdvance` feeds the bar's status line (the reason BEFORE
    // the press), `gateMessage` the notice inside the step (the reason after).
    canAdvance,
    gateMessage,

    // format
    selectedFormat,
    handleFormatSelect,
    supports,

    // entries
    selectedIds,
    entryIds,
    entryCount,
    validation,
    handleTeamToggle,
    handleSelectAll,
    handleClearSelection,

    // details
    competitionName,
    nameError,
    handleNameChange,
    matchSeriesLength,
    setMatchSeriesLength,
    instantWinEnabled,
    setInstantWinEnabled,
    numberOfCourts: effectiveCourts,
    setNumberOfCourts,
    courtOptions,

    // advanced
    advanced,
    updateAdvanced,
    resetAdvanced,
    advancedCustomised: isConfigCustomised(advanced),

    // submit
    submit,
    handleCreate,
    dismissSubmitNotice,
    readOnly,
  };
};

export type NewCompetitionState = ReturnType<typeof useNewCompetitionPage>;
