import { isRotationFormat, isSeriesFormat, minimumTeams, minimumTeamsMessage } from "@/lib/formats";
import { DEFAULT_CAPACITY, rsvpProblems, type RsvpProblems } from "@/lib/rsvp";
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
  /** Record results by tapping the winner. Rotation formats and Round Robin. */
  instantWin: boolean;
  /** Standings points for a win and a loss. Round Robin only. */
  pointsForWin: number;
  pointsForLoss: number;
  /** The tournament's word for a court: "court", "field", or "table". */
  courtWord: string;
  /** The IANA zone the times are entered in: the owner's phone's. */
  zone: string;
  /** When the tournament will be played, in epoch milliseconds, or null while unset. */
  scheduledAt: number | null;
  /** Whether the RSVP link goes on as the tournament is saved. */
  rsvpEnabled: boolean;
  /** The number of confirmed RSVPs the night takes. */
  capacity: number;
  /** When RSVPs open, in epoch milliseconds, or null while unset. */
  opensAt: number | null;
}

/**
 * The page as it opens: nothing chosen, one court, single games, no times,
 * and the RSVP link off. Times are entered in `zone`, the phone's own.
 */
export const emptySetup = (zone = "UTC"): TournamentSetup => ({
  name: "",
  format: null,
  teamIds: [],
  courts: 1,
  seriesLength: 1,
  instantWin: false,
  pointsForWin: DEFAULT_POINTS_FOR_WIN,
  pointsForLoss: DEFAULT_POINTS_FOR_LOSS,
  courtWord: DEFAULT_TERMINOLOGY.venue,
  zone,
  scheduledAt: null,
  rsvpEnabled: false,
  capacity: DEFAULT_CAPACITY,
  opensAt: null,
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
 * The teams that will enter, in tick order. A ticked team that has since
 * left the roster is left out rather than entered from memory.
 */
export const enteredTeams = (setup: TournamentSetup, roster: PersistentTeam[]): PersistentTeam[] => {
  const byId = new Map(roster.map((team) => [team.id, team]));
  return setup.teamIds.flatMap((id) => byId.get(id) ?? []);
};

/** Why the setup cannot become a tournament yet, by field. Empty when it can. */
export interface SetupProblems extends RsvpProblems {
  name?: string;
  format?: string;
  teams?: string;
}

export const setupProblems = (
  setup: TournamentSetup,
  roster: PersistentTeam[],
): SetupProblems => {
  const problems: SetupProblems = rsvpProblems({
    enabled: setup.rsvpEnabled,
    capacity: setup.capacity,
    scheduledAt: setup.scheduledAt,
    opensAt: setup.opensAt,
  });
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

/**
 * The problems in the order to fix them: the format, since the rest depend
 * on it, then the name, the teams, and the RSVP section.
 */
export const problemsInOrder = (problems: SetupProblems): string[] =>
  [
    problems.format,
    problems.name,
    problems.teams,
    problems.scheduledAt,
    problems.opensAt,
    problems.capacity,
  ].filter((problem): problem is string => problem !== undefined);

/** The first problem to fix. */
export const firstProblem = (problems: SetupProblems): string | undefined =>
  problemsInOrder(problems)[0];

/**
 * The scheduled time and RSVP settings the tournament is saved with. A
 * scheduled time carries the zone it was entered in. The RSVP map is
 * written once the link is on or an open time is set, so a night kept
 * private for now keeps what the owner entered; an untouched section adds
 * nothing.
 */
const scheduleInput = (
  setup: TournamentSetup,
): Pick<NewTournamentInput, "scheduledAt" | "scheduledZone" | "rsvp"> => ({
  ...(setup.scheduledAt !== null && { scheduledAt: setup.scheduledAt, scheduledZone: setup.zone }),
  ...((setup.rsvpEnabled || setup.opensAt !== null) && {
    rsvp: {
      enabled: setup.rsvpEnabled,
      capacity: setup.capacity,
      ...(setup.opensAt !== null && { opensAt: setup.opensAt }),
      closed: false,
    },
  }),
});

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
    ...scheduleInput(setup),
  };
};
