/**
 * Teams as the screens show them, and the rows the Teams tab and the match
 * pages build from them. These are display shapes. The stored team is
 * PersistentTeam in src/types/game.ts.
 */

/** A team on a screen: what its mark and its name are drawn from. */
export interface Team {
  name: string;
  /** The team's own color. A team without one is drawn in fallbackColor(name). */
  color?: string;
  /** The path of one of the eight crest pictures. */
  crest: string;
}

export type FormResult = "W" | "L";

export interface ScheduleItem {
  day: string;
  date: string;
  time: string;
  home: Team;
  away: Team;
  venue: string;
}

export type ReadinessStatus = "READY" | "GOOD" | "NEEDS ATTN";

export interface ReadinessRow {
  team: Team;
  percent: number;
  form: FormResult[];
  status: ReadinessStatus;
}

export interface StatTotal {
  label: string;
  value: string;
}

/* ----------------------------- Team directory ----------------------------- */

export type TeamStatus = "ACTIVE" | "IDLE";

export interface NextMatch {
  date: string;
  time: string;
  opponent: Team;
  isHome: boolean;
  competition: string;
}

export interface TeamRow {
  id: string;
  team: Team;
  color?: string;
  competitions: string[];
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  nextMatch: NextMatch | null;
  status: TeamStatus;
  form: FormResult[];
}

export interface FormRow {
  team: Team;
  form: FormResult[];
  record: string;
}

export interface TeamsData {
  dateLine: string;
  matchesCompleted: number;
  teamCount: number;
  rows: TeamRow[];
  snapshot: StatTotal[];
  readiness: ReadinessRow[];
  fixtures: ScheduleItem[];
  recentForm: FormRow[];
}
