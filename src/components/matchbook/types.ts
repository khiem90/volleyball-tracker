// Matchbook dashboard panel shapes and team-crest helpers.

import type { MbStandingLine } from "./StandingsTable";

export type { MbStandingLine };

export interface MbTeam {
  name: string;
  crest: string;
}

export type MbFormResult = "W" | "L";

/* `MbStandingRow` is gone. It was the fourth standings shape in the app — P, W,
   L, a combined `PF–PA` string and a `points` field that was `won * 3` however
   the competition actually scores — and it is what let `/` rank a league by a
   different measure than `/competitions/[id]` did for the same teams (F14).
   Every standings surface now carries `MbStandingLine` from `StandingsTable`
   and is ranked by `rankTeams()`. */

export interface MbSetScore {
  home: number;
  away: number;
}

export interface MbFeaturedMatch {
  division: string;
  time: string;
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
  sets: MbSetScore[];
  venue: string;
  attendance?: string;
}

export interface MbLiveCourt {
  court: string;
  time: string;
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
  setLabel: string;
}

export interface MbScheduleItem {
  day: string;
  date: string;
  time: string;
  home: MbTeam;
  away: MbTeam;
  venue: string;
}

export interface MbBracketSeed {
  seed: number;
  team: MbTeam;
}

export interface MbBracket {
  semifinals: [MbBracketSeed, MbBracketSeed][];
  finalNote: string;
  finalVenue: string;
}

export interface MbRecentResult {
  date: string;
  home: MbTeam;
  homeScore: number;
  awayScore: number;
  away: MbTeam;
  venue: string;
  accent: string;
}

export type MbReadinessStatus = "READY" | "GOOD" | "NEEDS ATTN";

export interface MbReadinessRow {
  team: MbTeam;
  percent: number;
  form: MbFormResult[];
  status: MbReadinessStatus;
}

export interface MbLeader {
  team: MbTeam;
  stat: string;
  value: string;
}

export interface MbStatTotal {
  label: string;
  value: string;
}

export interface MbDashboardData {
  dateLine: string;
  matchesCompleted: number;
  /** The competition the standings table is actually for. */
  league: string;
  standings: MbStandingLine[];
  featured: MbFeaturedMatch | null;
  liveCourts: MbLiveCourt[];
  schedule: MbScheduleItem[];
  bracket: MbBracket | null;
  recentResults: MbRecentResult[];
  readiness: MbReadinessRow[];
  leaders: MbLeader[];
  allTimeTotals: MbStatTotal[];
}

/* ----------------------------- Team directory ----------------------------- */

export type MbTeamStatus = "ACTIVE" | "IDLE";

export interface MbNextMatch {
  date: string;
  time: string;
  opponent: MbTeam;
  isHome: boolean;
  competition: string;
}

export interface MbTeamRow {
  id: string;
  team: MbTeam;
  color?: string;
  competitions: string[];
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  nextMatch: MbNextMatch | null;
  status: MbTeamStatus;
  form: MbFormResult[];
}

export interface MbFormRow {
  team: MbTeam;
  form: MbFormResult[];
  record: string;
}

export interface MbTeamsData {
  dateLine: string;
  matchesCompleted: number;
  teamCount: number;
  rows: MbTeamRow[];
  snapshot: MbStatTotal[];
  readiness: MbReadinessRow[];
  fixtures: MbScheduleItem[];
  recentForm: MbFormRow[];
}

export const crestPath = (slug: string) => `/assets/matchbook/teams/${slug}.svg`;

const CREST_SLUGS = [
  "surge",
  "tide",
  "storm",
  "apex",
  "flare",
  "peak",
  "nova",
  "riptide",
] as const;

// Deterministically assign one of the eight pack crests to a real team.
export const crestForTeam = (teamId: string, teamName: string): string => {
  const named = CREST_SLUGS.find((slug) => teamName.toLowerCase().includes(slug));
  if (named) return crestPath(named);
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = (hash * 31 + teamId.charCodeAt(i)) >>> 0;
  }
  return crestPath(CREST_SLUGS[hash % CREST_SLUGS.length]);
};
