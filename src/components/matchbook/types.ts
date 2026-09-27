// Matchbook panel shapes and team-crest helpers.

export interface MbTeam {
  name: string;
  crest: string;
}

export type MbFormResult = "W" | "L";

export interface MbScheduleItem {
  day: string;
  date: string;
  time: string;
  home: MbTeam;
  away: MbTeam;
  venue: string;
}

export type MbReadinessStatus = "READY" | "GOOD" | "NEEDS ATTN";

export interface MbReadinessRow {
  team: MbTeam;
  percent: number;
  form: MbFormResult[];
  status: MbReadinessStatus;
}

export interface MbStatTotal {
  label: string;
  value: string;
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
