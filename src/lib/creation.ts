import { isRotationFormat, isSeriesFormat, minimumTeams, minimumTeamsMessage } from "@/lib/formats";
import {
  matchRosterTeams,
  nameClashes,
  tickedTeamNamed,
  type ListImport,
} from "@/lib/rsvpImport";
import { leastUsedColors } from "@/lib/teamColors";
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
  /**
   * The RSVP list the owner imported, with its teams as arranged so far, or
   * null with no import. Imported teams are seeded after the ticked ones.
   */
  import: ListImport | null;
  /** Courts in play at once. Only rotation formats use more than one. */
  courts: number;
  /** Best-of series length. Rotation formats always play single games. */
  seriesLength: number;
  /** Record results by tapping the winner. Rotation formats and Round Robin. */
  instantWin: boolean;
  /** Standings points for a win and a loss. Round Robin only. */
  pointsForWin: number;
  pointsForLoss: number;
  /** The tournament's word for a court: "court", "field", or "table". */
  courtWord: string;
}

/** The page as it opens: nothing chosen, nothing imported, one court, single games. */
export const emptySetup = (): TournamentSetup => ({
  name: "",
  format: null,
  teamIds: [],
  import: null,
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
    instantWin: rotation || format === "round_robin",
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
 * A team entering under a name the roster does not have. It joins the
 * roster as the tournament is saved, so it is there next week.
 */
export interface JoiningTeam {
  newName: string;
}

/**
 * A mixed team entering: dealt from a by-person list, and never on the
 * roster (ADR-0006). It has no id yet. The tournament gives it one as it
 * is built.
 */
export interface EnteringMixedTeam {
  name: string;
  /** The palette color the tournament's teams use least. */
  color: string;
  /** The players' names, in the order the creation page shows them. */
  players: string[];
}

/** A team entering a new tournament: one on the roster, one about to join it, or a mixed team. */
export type EnteringTeam = PersistentTeam | JoiningTeam | EnteringMixedTeam;

export const isJoiningTeam = (team: EnteringTeam): team is JoiningTeam => "newName" in team;

export const isEnteringMixedTeam = (team: EnteringTeam): team is EnteringMixedTeam =>
  "players" in team;

/**
 * The teams a by-team import enters, in arrival order. A name the roster
 * has, ignoring case, enters that roster team. Any other name enters as a
 * team joining the roster.
 */
const importedRosterTeams = (
  imported: ListImport,
  roster: PersistentTeam[],
): (PersistentTeam | JoiningTeam)[] =>
  matchRosterTeams(
    imported.teams.map((team) => team.name),
    roster,
  ).map((rosterTeam, index) => rosterTeam ?? { newName: imported.teams[index].name.trim() });

/**
 * The mixed teams a by-person import enters, in number order. Each takes
 * the palette color used least among the teams entering before it, the
 * way a pasted team name does on the roster.
 */
const mixedTeams = (imported: ListImport, entering: PersistentTeam[]): EnteringMixedTeam[] => {
  const nextColor = leastUsedColors(entering.map((team) => team.color));
  return imported.teams.map((team) => ({
    name: team.name.trim(),
    color: nextColor(),
    players: (team.players ?? []).map((person) => person.name),
  }));
};

/**
 * The roster teams the owner ticked, in tick order. A ticked team that has
 * since left the roster is left out.
 */
export const tickedTeams = (setup: TournamentSetup, roster: PersistentTeam[]): PersistentTeam[] => {
  const byId = new Map(roster.map((team) => [team.id, team]));
  return setup.teamIds.flatMap((id) => byId.get(id) ?? []);
};

/**
 * The teams that will enter, in seed order, which is the order the teams
 * section shows: ticked roster teams in tick order, then imported teams in
 * the import's order. A ticked team that has since left the roster is left
 * out, not entered from memory. A roster team a by-team import also brings
 * enters once, at its imported place. A mixed team enters beside a roster
 * team of the same name, since it is never that team, and setupProblems
 * asks the owner to tell the two apart first.
 */
export const enteredTeams = (setup: TournamentSetup, roster: PersistentTeam[]): EnteringTeam[] => {
  const ticked = tickedTeams(setup, roster);
  if (!setup.import) return ticked;
  if (setup.import.takes === "people") return [...ticked, ...mixedTeams(setup.import, ticked)];
  const imported = importedRosterTeams(setup.import, roster);
  const importedIds = new Set(imported.flatMap((team) => (isJoiningTeam(team) ? [] : team.id)));
  return [...ticked.filter((team) => !importedIds.has(team.id)), ...imported];
};

/**
 * What stops an import being saved as it stands. Two teams from a by-team
 * list under one name would land on one roster team, and two mixed teams
 * under one name could not be told apart on the schedule, so the owner
 * renames one first. A team the owner has blanked needs a name again. A
 * mixed team under the name of a roster team in `ticked` would enter
 * beside it, so the owner renames the mixed team or unticks the other.
 */
const importProblem = (imported: ListImport, ticked: PersistentTeam[]): string | undefined => {
  const names = imported.teams.map((team) => team.name);
  if (names.some((name) => name.trim().length === 0)) return "Give every imported team a name.";
  const [clash] = nameClashes(names);
  if (clash) {
    return clash.indexes.length === 2
      ? `Rename one of the two teams called ${clash.name}.`
      : `Rename the ${clash.indexes.length} teams called ${clash.name} so each has its own name.`;
  }
  const [shared] = names.flatMap((name) => tickedTeamNamed(imported, name, ticked) ?? []);
  if (!shared) return undefined;
  return `A ticked roster team is also called ${shared.name}. Rename the mixed team or untick the roster team.`;
};

/** Why the setup cannot become a tournament yet, by field. Empty when it can. */
export interface SetupProblems {
  name?: string;
  format?: string;
  /** What is wrong with the imported teams. */
  imported?: string;
  teams?: string;
}

export const setupProblems = (
  setup: TournamentSetup,
  roster: PersistentTeam[],
): SetupProblems => {
  const problems: SetupProblems = {};
  if (setup.name.trim().length === 0) problems.name = "Give the tournament a name.";
  const imported = setup.import
    ? importProblem(setup.import, tickedTeams(setup, roster))
    : undefined;
  if (imported) problems.imported = imported;
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

/**
 * The problems in the order to fix them: the format, since the rest depend
 * on it, then the name, then the imported teams, then the team count.
 */
export const problemsInOrder = (problems: SetupProblems): string[] =>
  [problems.format, problems.name, problems.imported, problems.teams].filter(
    (problem): problem is string => problem !== undefined,
  );

/** The first problem to fix. */
export const firstProblem = (problems: SetupProblems): string | undefined =>
  problemsInOrder(problems)[0];

/**
 * What the creation page hands over to be saved: a new tournament's input
 * whose teams may include some that join the roster on the way.
 */
export interface SetupInput extends Omit<NewTournamentInput, "teams"> {
  /** The teams entering, in seed order. */
  teams: EnteringTeam[];
}

/**
 * The input the draft is built from. The problems are checked again here,
 * so a page that shows them and stops is the normal path and this throw
 * is the guard behind it. With an import, the input names the list the
 * teams came from.
 */
export const setupInput = (setup: TournamentSetup, roster: PersistentTeam[]): SetupInput => {
  const first = firstProblem(setupProblems(setup, roster));
  if (first || !setup.format) throw new Error(first ?? "Pick a format.");
  return {
    name: setup.name.trim(),
    format: setup.format,
    teams: enteredTeams(setup, roster),
    settings: setupSettings(setup.format, setup),
    ...(setup.import && { rsvpListId: setup.import.listId }),
  };
};
