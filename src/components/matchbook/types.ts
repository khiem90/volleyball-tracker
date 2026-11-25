// The old names for the shapes in src/lib/teamShapes.ts, kept until every
// screen has moved to the new ones, and the crest helpers, which go with them.

export type {
  FormResult as MbFormResult,
  FormRow as MbFormRow,
  NextMatch as MbNextMatch,
  ReadinessRow as MbReadinessRow,
  ReadinessStatus as MbReadinessStatus,
  ScheduleItem as MbScheduleItem,
  StatTotal as MbStatTotal,
  Team as MbTeam,
  TeamRow as MbTeamRow,
  TeamsData as MbTeamsData,
  TeamStatus as MbTeamStatus,
} from "@/lib/teamShapes";

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

// Fills the crest field of a team shape. Nothing draws the picture any more.
export const crestForTeam = (teamId: string, teamName: string): string => {
  const named = CREST_SLUGS.find((slug) => teamName.toLowerCase().includes(slug));
  if (named) return crestPath(named);
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = (hash * 31 + teamId.charCodeAt(i)) >>> 0;
  }
  return crestPath(CREST_SLUGS[hash % CREST_SLUGS.length]);
};
