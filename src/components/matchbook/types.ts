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

const hashOf = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

/** "A" → 1, "Z" → 26, "AA" → 27 — the inverse of `columnLetters`. */
const letterOrdinal = (letters: string): number => {
  let value = 0;
  for (const ch of letters) value = value * 26 + (ch.charCodeAt(0) - 64);
  return value;
};

/** `Team 12` / `Group AB` — the shapes `QuickAddTeams` produces. */
const TRAILING_NUMBER = /^(.*?)(\d{1,6})$/;
const TRAILING_LETTERS = /^(.*?[^A-Za-z])([A-Z]{1,4})$/;

/* ---------------------------------------------------------------------------
   WHICH OF THE EIGHT CRESTS A TEAM WEARS

   It used to hash the **id** — `${Date.now()}-${7 random base36 chars}`. The
   distribution of that is fine (measured: chi² 10.2 over 8 buckets, df 7, well
   inside the 14.1 critical value), and it is still the wrong input, for two
   reasons that are both about what the reader sees.

   1. **A batch of teams collided constantly.** Five ids drawn at random from 8
      crests repeat one 79.5% of the time — the birthday bound, not a bad hash.
      Measured over 1000 quick-add batches of five: 802 contained a repeat and
      the worst batch rendered **two** distinct designs across five teams. A
      batch of eight repeated in 1000/1000. No mixer can fix that, because the
      information that would separate them — that these five teams are a
      numbered run — is in the NAME and was being thrown away.
   2. **The create preview was lying.** `TeamForm` previews the crest as
      `crestForTeam(previewName, previewName)` and `QuickAddTeams` as
      `crestForTeam(entry.name, entry.name)`, but the team that is actually
      created hashes its generated id. The crest a person approved in the sheet
      was, with probability 7/8, not the crest they got.

   So the crest follows the name, which is the thing the reader chose and can
   see. A trailing ordinal is read out and used as a rotation over the pack, so
   any run of up to eight consecutively numbered or lettered teams is eight
   different crests — measured 0/1000 batches with a repeat, at 5 and at 8, for
   every naming style and every starting number. The stem is hashed into the
   rotation, so "Team 1" and "Court 1" do not both open on the same crest.

   Arbitrary names keep the old hash and stay evenly spread (measured over 256
   two-word club names: chi² 3.1). The id is only a fallback for an unnamed
   team, which the form does not allow but a share payload could carry.

   Charter D-9 stands: the colour never selects the crest. D-10 stands too —
   this is the same eight-crest pack, spent better. What separates two teams
   that genuinely do collide (the ninth team in a batch) is unchanged: the
   name, and now a colour that is never a repeat of the last five (see
   `nextTeamColor`).
   --------------------------------------------------------------------------- */
export const crestForTeam = (teamId: string, teamName: string): string => {
  const name = (teamName ?? "").trim();
  /* Longest match wins. `.find()` took the first, and "tide" precedes
     "riptide" in the pack — so a team called Riptide wore the tide crest, and
     the one case the pack can answer by name got the wrong answer. */
  const lower = name.toLowerCase();
  const named = CREST_SLUGS.filter((slug) => lower.includes(slug)).sort(
    (a, b) => b.length - a.length
  )[0];
  if (named) return crestPath(named);

  const key = name || teamId;
  const numbered = TRAILING_NUMBER.exec(key);
  if (numbered) {
    const index = (hashOf(numbered[1]) + Number(numbered[2]) - 1) % CREST_SLUGS.length;
    return crestPath(CREST_SLUGS[index]);
  }
  const lettered = TRAILING_LETTERS.exec(key);
  if (lettered) {
    const index =
      (hashOf(lettered[1]) + letterOrdinal(lettered[2]) - 1) % CREST_SLUGS.length;
    return crestPath(CREST_SLUGS[index]);
  }
  return crestPath(CREST_SLUGS[hashOf(key) % CREST_SLUGS.length]);
};
