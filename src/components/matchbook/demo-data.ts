// Matchbook dashboard panel shapes + showcase dataset shown when the
// account has no data of its own (mirrors the design mockup).

export interface MbTeam {
  name: string;
  crest: string;
}

export type MbFormResult = "W" | "L";

export interface MbStandingRow {
  team: MbTeam;
  played: number;
  won: number;
  lost: number;
  sets: string;
  points: number;
  form: MbFormResult[];
}

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

export interface MbSeasonTotal {
  label: string;
  value: string;
}

export interface MbDashboardData {
  isDemo: boolean;
  seasonTitle: string;
  week: string;
  dateLine: string;
  matchesCompleted: number;
  league: string;
  season: string;
  standings: MbStandingRow[];
  featured: MbFeaturedMatch | null;
  liveCourts: MbLiveCourt[];
  schedule: MbScheduleItem[];
  bracket: MbBracket | null;
  recentResults: MbRecentResult[];
  readiness: MbReadinessRow[];
  leaders: MbLeader[];
  seasonTotals: MbSeasonTotal[];
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

const team = (name: string, slug: string): MbTeam => ({ name, crest: crestPath(slug) });

const SURGE = team("Surge", "surge");
const TIDE = team("Tide", "tide");
const STORM = team("Storm", "storm");
const APEX = team("Apex", "apex");
const FLARE = team("Flare", "flare");
const PEAK = team("Peak", "peak");

const form = (s: string): MbFormResult[] =>
  s.split("").map((c) => (c === "W" ? "W" : "L"));

export const DEMO_DASHBOARD: MbDashboardData = {
  isDemo: true,
  seasonTitle: "The 2026 Season",
  week: "04",
  dateLine: "Saturday, May 24, 2026",
  matchesCompleted: 26,
  league: "Premier Division",
  season: "2026 Season",
  standings: [
    { team: SURGE, played: 12, won: 9, lost: 3, sets: "19–6", points: 28, form: form("WWWWW") },
    { team: TIDE, played: 12, won: 8, lost: 4, sets: "17–8", points: 26, form: form("WWWWW") },
    { team: STORM, played: 11, won: 7, lost: 4, sets: "15–10", points: 22, form: form("WWWWL") },
    { team: APEX, played: 11, won: 6, lost: 5, sets: "14–11", points: 20, form: form("LWWLW") },
    { team: FLARE, played: 10, won: 4, lost: 6, sets: "10–15", points: 14, form: form("LLWLW") },
    { team: PEAK, played: 9, won: 2, lost: 7, sets: "6–18", points: 8, form: form("LLLWL") },
  ],
  featured: {
    division: "Premier Division • Round 14",
    time: "7:30 PM",
    home: SURGE,
    away: TIDE,
    homeScore: 3,
    awayScore: 1,
    sets: [
      { home: 25, away: 18 },
      { home: 25, away: 20 },
      { home: 21, away: 25 },
      { home: 25, away: 16 },
    ],
    venue: "Riverside Court 1",
    attendance: "812",
  },
  liveCourts: [
    {
      court: "Court 2",
      time: "6:00 PM",
      home: STORM,
      away: APEX,
      homeScore: 2,
      awayScore: 1,
      setLabel: "Set 4",
    },
    {
      court: "Court 3",
      time: "8:00 PM",
      home: FLARE,
      away: PEAK,
      homeScore: 1,
      awayScore: 0,
      setLabel: "Set 2",
    },
  ],
  schedule: [
    { day: "Sun", date: "May 25", time: "2:00 PM", home: TIDE, away: STORM, venue: "Riverside Court 1" },
    { day: "Sun", date: "May 25", time: "4:00 PM", home: SURGE, away: APEX, venue: "Riverside Court 2" },
    { day: "Mon", date: "May 26", time: "6:00 PM", home: PEAK, away: FLARE, venue: "Harbor Court 3" },
    { day: "Tue", date: "May 27", time: "7:00 PM", home: STORM, away: PEAK, venue: "Riverside Court 1" },
  ],
  bracket: {
    semifinals: [
      [
        { seed: 1, team: SURGE },
        { seed: 4, team: APEX },
      ],
      [
        { seed: 2, team: TIDE },
        { seed: 3, team: STORM },
      ],
    ],
    finalNote: "Jun 14 • Championship Final",
    finalVenue: "Riverside Stadium",
  },
  recentResults: [
    { date: "May 23", home: SURGE, homeScore: 3, awayScore: 1, away: TIDE, venue: "Riverside Court 1", accent: "var(--mb-teal)" },
    { date: "May 23", home: STORM, homeScore: 3, awayScore: 0, away: PEAK, venue: "Summit Court 2", accent: "var(--mb-gold)" },
    { date: "May 22", home: APEX, homeScore: 2, awayScore: 3, away: FLARE, venue: "Harbor Court 3", accent: "var(--mb-ink-muted)" },
    { date: "May 21", home: TIDE, homeScore: 3, awayScore: 1, away: PEAK, venue: "Riverside Court 2", accent: "var(--mb-plum)" },
  ],
  readiness: [
    { team: SURGE, percent: 92, form: form("WWWWL"), status: "READY" },
    { team: TIDE, percent: 88, form: form("WWLWW"), status: "READY" },
    { team: STORM, percent: 81, form: form("WLWWW"), status: "GOOD" },
    { team: APEX, percent: 76, form: form("LWWLW"), status: "GOOD" },
    { team: FLARE, percent: 62, form: form("LLWLW"), status: "NEEDS ATTN" },
    { team: PEAK, percent: 55, form: form("LLLWL"), status: "NEEDS ATTN" },
  ],
  leaders: [
    { team: SURGE, stat: "Aces", value: "42" },
    { team: STORM, stat: "Blocks", value: "28" },
    { team: APEX, stat: "Kills", value: "196" },
  ],
  seasonTotals: [
    { label: "Aces", value: "612" },
    { label: "Blocks", value: "428" },
    { label: "Kills", value: "3,842" },
    { label: "Matches", value: "132" },
  ],
};
