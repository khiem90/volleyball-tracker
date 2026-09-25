import { isRotationFormat, isSeriesFormat, minimumTeams, minimumTeamsMessage } from "@/lib/formats";
import type { NewTournamentInput } from "@/lib/tournaments";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
  DEFAULT_TERMINOLOGY,
  type CompetitionTerminology,
} from "@/types/competition-config";
import type { PersistentTeam, TournamentFormat, TournamentSettings } from "@/types/game";

/**
 * Creating a tournament: what the creation page collects, what stops it
 * becoming a tournament yet, and the input a draft is built from. Nothing
 * in here touches the database or React.
 */

/** What the creation page collects. */
export interface TournamentSetup {
  name: string;
  format: TournamentFormat | null;
  /** The ticked roster teams in the order they were ticked, which is the seed order. */
  teamIds: string[];
  /** Courts in play at once. Only rotation formats use more than one. */
  courts: number;
  /** Best-of series length. Rotation formats always play single games. */
  seriesLength: number;
  /** Record results by tapping the winner. Rotation formats only. */
  instantWin: boolean;
  /** Standings points for a win and a loss. Round Robin only. */
  pointsForWin: number;
  pointsForLoss: number;
  /** The tournament's word for a court: "court", "field", or "table". */
  courtWord: string;
}

/** The page as it opens: nothing chosen, one court, single games. */
export const emptySetup = (): TournamentSetup => ({
  name: "",
  format: null,
  teamIds: [],
  courts: 1,
  seriesLength: 1,
  instantWin: false,
  pointsForWin: DEFAULT_POINTS_FOR_WIN,
  pointsForLoss: DEFAULT_POINTS_FOR_LOSS,
  courtWord: DEFAULT_TERMINOLOGY.venue,
});

// ============================================
// Settings
// ============================================

/** Which of the settings a format uses. The page shows only those, and the rest are not stored. */
export interface SettingsUsed {
  courts: boolean;
  series: boolean;
  instantWin: boolean;
  points: boolean;
}

export const settingsUsedBy = (format: TournamentFormat): SettingsUsed => {
  const rotation = isRotationFormat(format);
  return {
    courts: rotation,
    series: isSeriesFormat(format),
    instantWin: rotation,
    points: format === "round_robin",
  };
};

/** With no format chosen yet, every setting is on offer. */
export const ALL_SETTINGS: SettingsUsed = {
  courts: true,
  series: true,
  instantWin: true,
  points: true,
};

/** "field" gives "fields"; "pitch" gives "pitches". */
const pluralOf = (word: string): string =>
  /(s|x|z|ch|sh)$/.test(word) ? `${word}es` : `${word}s`;

/**
 * The tournament's words for a court, from the word typed on the page:
 * "field" gives "field" and "fields". A blank word means court.
 */
export const courtTerminology = (courtWord: string): CompetitionTerminology => {
  const word = courtWord.trim().toLowerCase() || DEFAULT_TERMINOLOGY.venue;
  return { ...DEFAULT_TERMINOLOGY, venue: word, venuePlural: pluralOf(word) };
};

/**
 * The settings the tournament will carry. A setting the format does not
 * use is put back to its default rather than stored, so a best-of chosen
 * before switching to a rotation format, or standings points typed before
 * leaving Round Robin, never reach the tournament.
 */
export const setupSettings = (
  format: TournamentFormat,
  setup: TournamentSetup,
): TournamentSettings => {
  const used = settingsUsedBy(format);
  return {
    courts: used.courts ? setup.courts : 1,
    seriesLength: used.series ? setup.seriesLength : 1,
    instantWin: used.instantWin ? setup.instantWin : false,
    pointsForWin: used.points ? setup.pointsForWin : DEFAULT_POINTS_FOR_WIN,
    pointsForLoss: used.points ? setup.pointsForLoss : DEFAULT_POINTS_FOR_LOSS,
    terminology: courtTerminology(setup.courtWord),
  };
};

// ============================================
// Teams and problems
// ============================================

/**
 * The teams that will enter, in tick order. A ticked team that has since
 * left the roster is left out rather than entered from memory.
 */
export const enteredTeams = (setup: TournamentSetup, roster: PersistentTeam[]): PersistentTeam[] => {
  const byId = new Map(roster.map((team) => [team.id, team]));
  return setup.teamIds.flatMap((id) => byId.get(id) ?? []);
};

/** Why the setup cannot become a tournament yet, by field. Empty when it can. */
export interface SetupProblems {
  name?: string;
  format?: string;
  teams?: string;
}

export const setupProblems = (
  setup: TournamentSetup,
  roster: PersistentTeam[],
): SetupProblems => {
  const problems: SetupProblems = {};
  if (setup.name.trim().length === 0) problems.name = "Give the tournament a name.";
  if (!setup.format) {
    problems.format = "Pick a format.";
    return problems;
  }
  const { courts, terminology } = setupSettings(setup.format, setup);
  if (enteredTeams(setup, roster).length < minimumTeams(setup.format, courts)) {
    problems.teams = minimumTeamsMessage(setup.format, courts, terminology.venuePlural);
  }
  return problems;
};

/** The first problem to fix: the format, since the rest depend on it, then the name, then the teams. */
export const firstProblem = (problems: SetupProblems): string | undefined =>
  problems.format ?? problems.name ?? problems.teams;

/**
 * The input the draft is built from. The problems are checked again here,
 * so a page that shows them and stops is the normal path and this throw
 * is the guard behind it.
 */
export const setupInput = (setup: TournamentSetup, roster: PersistentTeam[]): NewTournamentInput => {
  const first = firstProblem(setupProblems(setup, roster));
  if (first || !setup.format) throw new Error(first ?? "Pick a format.");
  return {
    name: setup.name.trim(),
    format: setup.format,
    teams: enteredTeams(setup, roster),
    settings: setupSettings(setup.format, setup),
  };
};
