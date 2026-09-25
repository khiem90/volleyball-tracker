import type { Match } from "@/types/game";

/**
 * One document write the engine wants applied. Creates carry a whole match;
 * updates carry only the fields that changed; deletes name the match to
 * remove. The data layer turns these into Firestore writes and tests fold
 * them back into an array.
 */
export type MatchWrite =
  | { kind: "create"; match: Match }
  | { kind: "update"; matchId: string; changes: Partial<Match> }
  | { kind: "delete"; matchId: string };

const MATCH_KEYS = [
  "homeTeamId",
  "awayTeamId",
  "homeScore",
  "awayScore",
  "status",
  "round",
  "position",
  "court",
  "bracket",
  "winnerId",
  "forfeitedBy",
  "completedAt",
  "seriesLength",
  "homeWins",
  "awayWins",
  "seriesGame",
  "isBye",
] as const satisfies readonly (keyof Match)[];

/**
 * Work out the writes that take `before` to `after`. Matches in `after` that
 * `before` does not have become creates; matches whose fields differ become
 * updates carrying just those fields; matches `after` no longer has become
 * deletes. A field that `after` no longer has is written as undefined so the
 * data layer can delete it.
 */
export const diffMatchWrites = (before: Match[], after: Map<string, Match>): MatchWrite[] => {
  const previous = new Map(before.map((m) => [m.id, m]));
  const writes: MatchWrite[] = [];

  for (const match of after.values()) {
    const old = previous.get(match.id);
    if (!old) {
      writes.push({ kind: "create", match });
      continue;
    }
    const changes: Partial<Match> = {};
    let changed = false;
    for (const key of MATCH_KEYS) {
      if (old[key] !== match[key]) {
        // The two objects share a key set, so the assignment is type-safe.
        (changes as Record<string, unknown>)[key] = match[key];
        changed = true;
      }
    }
    if (changed) writes.push({ kind: "update", matchId: match.id, changes });
  }

  for (const match of before) {
    if (!after.has(match.id)) writes.push({ kind: "delete", matchId: match.id });
  }

  return writes;
};

/** The matches the writes create, in the order the engine made them. */
export const createdMatches = (writes: MatchWrite[]): Match[] =>
  writes.flatMap((write) => (write.kind === "create" ? [write.match] : []));

/** Fold writes into a match list, the way the database would. */
export const applyMatchWrites = (matches: Match[], writes: MatchWrite[]): Match[] => {
  let result = matches.map((m) => ({ ...m }));
  for (const write of writes) {
    if (write.kind === "create") {
      result.push({ ...write.match });
      continue;
    }
    if (write.kind === "delete") {
      result = result.filter((m) => m.id !== write.matchId);
      continue;
    }
    const index = result.findIndex((m) => m.id === write.matchId);
    if (index === -1) continue;
    const updated: Record<string, unknown> = { ...result[index] };
    for (const [key, value] of Object.entries(write.changes)) {
      if (value === undefined) delete updated[key];
      else updated[key] = value;
    }
    result[index] = updated as unknown as Match;
  }
  return result;
};
