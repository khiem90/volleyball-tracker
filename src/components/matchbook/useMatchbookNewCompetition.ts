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

/**
 * Four words per format, for the chooser's second line.
 *
 * `FORMAT_META.blurb` is a full sentence and stays the authority — it is what
 * `FormatPreviewPanel` prints the moment a format is chosen. But a sentence
 * sets two lines in a 207px row column, and a row that sets two lines cannot
 * be one of five on a 390px phone screen (the measurement is in
 * `FormatChoiceList`). So the LIST carries the shortest true thing and the
 * PREVIEW carries the sentence, one panel below.
 *
 * Not in `formatMeta.ts` because that module is the shared format table and
 * this string exists for one control on one step. If a second chooser ever
 * needs it, it moves there and this disappears.
 */
const FORMAT_SUMMARY: Record<CompetitionType, string> = {
  round_robin: "Everyone plays everyone",
  single_elimination: "Lose once, you are out",
  double_elimination: "Two losses to go out",
  win2out: "Winner stays on",
  two_match_rotation: "Two matches, then rotate",
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
  /**
   * The panel head's right-hand label — a NUMBER AND A NOUN, never a bare
   * participle.
   *
   * It used to be the single word `Entered`, chosen by `source === "library" ?
   * "Projected" : "Entered"`. On an empty account `source` is `none`, so the
   * head of a panel that had nothing to count printed the orphan word
   * "ENTERED" with no figure attached to it. Empty when there is nothing to
   * label, so the head simply carries its title.
   */
  label: string;
}

/** One row of the step-1 chooser. */
export interface MbFormatOption {
  type: CompetitionType;
  meta: FormatMetaEntry;
  /** Right-hand column: "Min 3", or "Needs 3" when the library is short. */
  kicker: string;
  /** Four words under the name. The full sentence lives in the preview panel. */
  summary: string;
}

export interface MbNewCompetitionView {
  entryRows: MbEntryRow[];
  entryRowsById: Map<string, MbEntryRow>;
  railSteps: MbStep[];
  formats: MbFormatOption[];
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
   * instead of the row going dead, which is the difference between a
   * constraint and a dead end.
   *
   * Two words, not six. It used to read `Needs 3 teams · 0 in library`, which
   * is 27 characters in a 40px right-hand column, and the second half of it is
   * already the masthead's dateline ("0 teams in library") on every step. The
   * column now carries the one figure that differs between the five rows.
   */
  const formats = useMemo<MbFormatOption[]>(
    () =>
      FORMAT_ORDER.map((type) => {
        const meta = FORMAT_META[type];
        const short = teams.length < meta.minTeams;
        return {
          type,
          meta,
          kicker: short ? `Needs ${meta.minTeams}` : `Min ${meta.minTeams}`,
          summary: FORMAT_SUMMARY[type],
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
        label: `${entryCount} ${entryCount === 1 ? "team" : "teams"} entered`,
      };
    if (teams.length > 0)
      return {
        count: teams.length,
        source: "library",
        caption: `Projected for all ${teams.length} teams in your library. Enter fewer on the next step and these numbers come down.`,
        label: `${teams.length} ${teams.length === 1 ? "team" : "teams"} projected`,
      };
    return {
      count: 0,
      source: "none",
      caption: "",
      label: "",
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
      /* A LIBRARY TOO SMALL TO SATISFY THE FORMAT IS NOT A SELECTION PROBLEM.
         `validateEntry` measures the SELECTION against the format minimum, so
         its message is always "Select at least 3 teams" — and on a fresh
         account that is 0 selected out of 0 that exist, which asks a
         first-time user to tick a row in a directory reading NO TEAMS EXIST
         YET four inches above it. It is the same impossible advice the
         directory panel's own six instruments were cut down to remove, and it
         survived in the commit bar because the bar reads a different source.
         The bar is the one instrument on screen at every scroll position, so
         it is the one that most has to be actionable.

         `validateEntry` itself is not the place to fix it: it is pure, tested,
         and it correctly answers the question it is asked ("is this selection
         legal?"). What is missing is the OTHER constraint — how many teams
         exist at all — and that is a view fact, so it is answered here. */
      const need = validation.minTeams;
      if (teams.length < need) {
        const short = need - teams.length;
        return teams.length === 0
          ? `No teams exist yet — create ${need} to get started`
          : `Add ${short} more ${pluralise("team", short)} — ${need} are needed`;
      }
      return validation.message || "Select the teams that will take part";
    }
    return wizard.competitionName.trim()
      ? `Ready to create · ${entryCount} teams`
      : "Name the competition to create it";
  }, [
    step,
    selectedFormat,
    validation.message,
    validation.minTeams,
    entryCount,
    teams.length,
    wizard.competitionName,
  ]);

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
    /**
     * The primary NAMES ITS DESTINATION.
     *
     * It read "Next", and measured 148px beside a 166px "Cancel" at 390px —
     * an 18px deficit that made the escape hatch the widest control in the
     * commit bar on the app's first-run screen. `MbAction` has no width axis
     * (and should not), so the fix is the label: "Next: teams" is both wider
     * than "Cancel" and more useful than "Next", because a three-step wizard's
     * commit control should say where it goes.
     */
    primaryLabel:
      step === "format"
        ? "Next: teams"
        : step === "teams"
          ? "Next: details"
          : "Create competition",
    seriesOptions,
    courtOptionList,
  };
};
