"use client";

/* ===========================================================================
   THE WIZARD VIEW-MODEL

   `useNewCompetitionPage` owns state and the mutation; this owns shape. The
   route file below it contains layout and nothing else (invariant 23).

   Two things here are worth more than the shaping: `formatPreview`, which
   turns the chosen format into the numbers it will actually generate, and
   `entryRows`, which gives the team directory a crest, a record and a home
   competition so the step reads like the rest of the app rather than like a
   multi-select.
   =========================================================================== */

import { useMemo } from "react";
import {
  FORMAT_META,
  FORMAT_ORDER,
  isEliminationFormat,
  type FormatMetaEntry,
} from "./formatMeta";
import { buildTeamTallies, recentForm } from "./teamStats";
import { crestForTeam, type MbFormResult, type MbTeam } from "./types";
import type { MbStep } from "./StepRail";
import {
  WIZARD_STEPS,
  nextPowerOfTwo,
  type NewCompetitionState,
  type WizardStep,
} from "@/hooks/useNewCompetitionPage";
import { pluralise } from "@/lib/text";
import type { CompetitionType } from "@/types/game";

/* -------------------------------------------------------------- entry rows */

export interface MbEntryRow {
  id: string;
  team: MbTeam;
  /** The stored team colour, rendered as a 3px bar beside the crest only. */
  accent?: string;
  /** Competitions the team is already entered in, or an em dash. */
  enteredIn: string;
  /** "5-2", always `tabular-nums` at the call site. */
  record: string;
  form: MbFormResult[];
}

/* ---------------------------------------------------------- format preview */

export interface MbPreviewLine {
  label: string;
  value: string;
}

/**
 * What the chosen format will generate, in the user's own numbers.
 *
 * Every line is arithmetic the app already performs when it builds a schedule,
 * restated here before the competition exists — which is the one moment the
 * answer changes a decision. Nothing is invented: round-robin is n(n-1)/2
 * matchups, a bracket is nextPow2 with the remainder as byes, and the rotation
 * formats are two teams per venue with the rest queued.
 */
export const formatPreview = (
  format: CompetitionType,
  teamCount: number,
  options: { series: number; courts: number; venue: string; instantWin: boolean }
): MbPreviewLine[] => {
  const { series, courts, venue, instantWin } = options;

  if (format === "round_robin") {
    const matchups = (teamCount * (teamCount - 1)) / 2;
    return [
      { label: "Entrants", value: `${teamCount}` },
      { label: "Matchups", value: `${matchups}` },
      {
        label: "Matches",
        value:
          series > 1
            ? `${matchups} to ${matchups * series}`
            : `${matchups}`,
      },
      {
        label: "Decided by",
        value: series > 1 ? `Standings · best of ${series}` : "Standings",
      },
    ];
  }

  if (isEliminationFormat(format)) {
    const bracket = nextPowerOfTwo(Math.max(teamCount, 2));
    const byes = bracket - teamCount;
    const rounds = Math.max(1, Math.log2(bracket));
    const matchups =
      format === "single_elimination"
        ? Math.max(teamCount - 1, 1)
        : Math.max(teamCount * 2 - 2, 1);
    return [
      { label: "Bracket", value: `${bracket} slots` },
      { label: "Byes", value: byes > 0 ? `${byes}` : "None" },
      { label: "Rounds", value: `${rounds}` },
      {
        label: format === "single_elimination" ? "Matchups" : "Matchups (max)",
        value: series > 1 ? `${matchups} · best of ${series}` : `${matchups}`,
      },
    ];
  }

  const onCourt = Math.min(courts * 2, teamCount);
  const queued = Math.max(teamCount - onCourt, 0);
  return [
    { label: "Entrants", value: `${teamCount}` },
    {
      label: pluralise(venue, courts) === venue ? "Venue" : "Venues",
      value: `${courts} ${pluralise(venue, courts)}`,
    },
    { label: "Playing at once", value: `${onCourt}` },
    { label: "In queue", value: `${queued}` },
    {
      label: "Scoring",
      value: instantWin ? "Instant win" : "Score points",
    },
  ];
};

/* -------------------------------------------------------------------- copy */

const STEP_LABEL: Record<WizardStep, string> = {
  format: "Format",
  teams: "Teams",
  details: "Details",
};

const STEP_HEADING: Record<WizardStep, string> = {
  format: "Choose a format",
  teams: "Select teams",
  details: "Name and configure",
};

export const wizardStepHeading = (step: WizardStep): string => STEP_HEADING[step];

/* -------------------------------------------------------------------- hook */

/**
 * What the preview's arithmetic was performed on.
 *
 * The panel used to run every line through `entryCount`, which is 0 for the
 * whole of step 1 — so the first thing a user saw on arriving at the screen was
 * a panel asserting ENTRANTS 0 / MATCHUPS 0 / MATCHES 0. Three false facts at
 * the exact moment the panel exists to justify a decision.
 *
 * So the basis is explicit and the panel says which one it used: the teams
 * actually entered once there are any, otherwise the whole library as a
 * projection, and `none` when there is no library either — in which case there
 * is no arithmetic to show and the panel says *that* instead of showing zeros.
 */
export type MbPreviewSource = "entered" | "library" | "none";

export interface MbPreviewBasis {
  count: number;
  source: MbPreviewSource;
  /** One sentence naming the basis, printed under the lines. */
  caption: string;
}

export interface MbNewCompetitionView {
  entryRows: MbEntryRow[];
  entryRowsById: Map<string, MbEntryRow>;
  railSteps: MbStep[];
  formats: { type: CompetitionType; meta: FormatMetaEntry; kicker: string }[];
  previewLines: MbPreviewLine[];
  previewBasis: MbPreviewBasis;
  /** The chosen format's display name, or "" before one is chosen. */
  formatLabel: string;
  /**
   * The action bar's status line — the GATE, and only the gate.
   *
   * It used to open `Step 2 of 3 · …`, which made it the fourth instrument on
   * the screen to state the step number. The rail states it; this states what
   * is stopping the primary from advancing, which is the one thing a commit bar
   * is for.
   */
  statusLine: string;
  /* No `subLine`.
     It returned `format · n of m teams entered` for the masthead, and the step
     rail already prints both halves of that ("FORMAT / Round Robin",
     "TEAMS / 8 selected") — a fifth restatement of the wizard's own progress in
     a viewport that had four. The masthead's line is now the library size,
     which is what the wizard draws FROM rather than what it is doing, needs no
     wizard state, and therefore survives the masthead being hoisted above the
     step machine (route file, note 1). */
  primaryLabel: string;
  seriesOptions: { value: string; label: string }[];
  courtOptionList: { value: string; label: string }[];
}

export const useMatchbookNewCompetition = (
  wizard: NewCompetitionState
): MbNewCompetitionView => {
  const {
    teams,
    matches,
    competitions,
    step,
    selectedFormat,
    entryCount,
    validation,
    advanced,
    numberOfCourts,
    matchSeriesLength,
    instantWinEnabled,
    courtOptions,
  } = wizard;

  const entryRows = useMemo<MbEntryRow[]>(() => {
    const completed = matches
      .filter((match) => match.status === "completed")
      .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
    const tallies = buildTeamTallies(completed);

    const enteredIn = new Map<string, string[]>();
    for (const competition of competitions) {
      for (const teamId of competition.teamIds) {
        const list = enteredIn.get(teamId);
        if (list) list.push(competition.name);
        else enteredIn.set(teamId, [competition.name]);
      }
    }

    return teams.map((team) => {
      const tally = tallies.get(team.id);
      const events = enteredIn.get(team.id) ?? [];
      return {
        id: team.id,
        team: { name: team.name, crest: crestForTeam(team.id, team.name) },
        accent: team.color,
        enteredIn:
          events.length === 0
            ? "—"
            : events.length === 1
              ? events[0]
              : `${events[0]} +${events.length - 1}`,
        record: `${tally?.won ?? 0}-${tally?.lost ?? 0}`,
        form: recentForm(tally),
      };
    });
  }, [teams, matches, competitions]);

  const entryRowsById = useMemo(
    () => new Map(entryRows.map((row) => [row.id, row])),
    [entryRows]
  );

  const railSteps = useMemo<MbStep[]>(
    () =>
      WIZARD_STEPS.map((id) => ({
        id,
        label: STEP_LABEL[id],
        value:
          id === "format"
            ? selectedFormat
              ? FORMAT_META[selectedFormat].label
              : undefined
            : id === "teams"
              ? entryCount > 0
                ? `${entryCount} selected`
                : undefined
              : wizard.competitionName.trim() || undefined,
      })),
    [selectedFormat, entryCount, wizard.competitionName]
  );

  /**
   * The library size gates nothing — a format below the minimum stays
   * selectable because the very next step can create teams. The kicker says so
   * instead of the card going dead, which is the difference between a
   * constraint and a dead end.
   */
  const formats = useMemo(
    () =>
      FORMAT_ORDER.map((type) => {
        const meta = FORMAT_META[type];
        const short = teams.length < meta.minTeams;
        return {
          type,
          meta,
          kicker: short
            ? `Needs ${meta.minTeams} teams · ${teams.length} in library`
            : `Min ${meta.minTeams} teams`,
        };
      }),
    [teams.length]
  );

  const previewBasis = useMemo<MbPreviewBasis>(() => {
    if (entryCount > 0)
      return {
        count: entryCount,
        source: "entered",
        caption: `Based on the ${entryCount} ${
          entryCount === 1 ? "team" : "teams"
        } entered so far. The numbers update as you pick teams.`,
      };
    if (teams.length > 0)
      return {
        count: teams.length,
        source: "library",
        caption: `Projected for all ${teams.length} teams in your library. Enter fewer on the next step and these numbers come down.`,
      };
    return {
      count: 0,
      source: "none",
      caption: "",
    };
  }, [entryCount, teams.length]);

  const previewLines = useMemo(
    () =>
      selectedFormat && previewBasis.source !== "none"
        ? formatPreview(selectedFormat, previewBasis.count, {
            series: matchSeriesLength,
            courts: numberOfCourts,
            venue: advanced.venueName || "court",
            instantWin: instantWinEnabled,
          })
        : [],
    [
      selectedFormat,
      previewBasis,
      matchSeriesLength,
      numberOfCourts,
      advanced.venueName,
      instantWinEnabled,
    ]
  );

  const statusLine = useMemo(() => {
    if (step === "format") {
      return selectedFormat
        ? `${FORMAT_META[selectedFormat].label} selected`
        : "Choose a format to continue";
    }
    if (step === "teams") {
      return validation.message || "Select the teams that will take part";
    }
    return wizard.competitionName.trim()
      ? `Ready to create · ${entryCount} teams`
      : "Name the competition to create it";
  }, [step, selectedFormat, validation.message, entryCount, wizard.competitionName]);

  const seriesOptions = useMemo(
    () =>
      [1, 3, 5, 7].map((count) => ({
        value: String(count),
        label: count === 1 ? "Single game" : `Best of ${count}`,
      })),
    []
  );

  const courtOptionList = useMemo(
    () =>
      Array.from({ length: courtOptions }, (_, index) => index + 1).map((count) => ({
        value: String(count),
        label: `${count} ${pluralise(advanced.venueName || "court", count)}`,
      })),
    [courtOptions, advanced.venueName]
  );

  return {
    entryRows,
    entryRowsById,
    railSteps,
    formats,
    previewLines,
    previewBasis,
    formatLabel: selectedFormat ? FORMAT_META[selectedFormat].label : "",
    statusLine,
    primaryLabel: step === "details" ? "Create competition" : "Next",
    seriesOptions,
    courtOptionList,
  };
};
