import type { BracketSide, Match } from "@/types/game";
import { forfeited } from "./forfeit";

/**
 * Where bracket results go. Single elimination is a winners bracket with no
 * losers rounds; double elimination adds a losers bracket and a grand final.
 *
 * Losers rounds come in pairs. An odd round pairs up teams already in the
 * losers bracket; the even round after it takes those winners and drops in the
 * losers from the matching winners round. The last losers round is the losers
 * final, whose winner meets the winners-bracket champion in the grand final.
 */

export interface Slot {
  bracket: BracketSide;
  round: number;
  position: number;
  slot: "home" | "away";
}

const sideOf = (match: Match): BracketSide => match.bracket ?? "winners";

const parity = (position: number): "home" | "away" => (position % 2 === 1 ? "home" : "away");

const roundsOn = (matches: Match[], side: BracketSide): number =>
  matches.reduce((max, m) => (sideOf(m) === side && m.round > max ? m.round : max), 0);

export const winnerDestination = (match: Match, matches: Match[]): Slot | null => {
  const side = sideOf(match);
  const winnersRounds = roundsOn(matches, "winners");
  const losersRounds = roundsOn(matches, "losers");

  if (side === "grand_finals") return null;

  if (side === "winners") {
    if (match.round < winnersRounds) {
      return {
        bracket: "winners",
        round: match.round + 1,
        position: Math.ceil(match.position / 2),
        slot: parity(match.position),
      };
    }
    // The winners final: on to the grand final in double elimination, or the
    // championship in single elimination.
    return losersRounds > 0
      ? { bracket: "grand_finals", round: 1, position: 1, slot: "home" }
      : null;
  }

  if (match.round === losersRounds) {
    return { bracket: "grand_finals", round: 1, position: 1, slot: "away" };
  }
  if (match.round % 2 === 1) {
    return { bracket: "losers", round: match.round + 1, position: match.position, slot: "home" };
  }
  return {
    bracket: "losers",
    round: match.round + 1,
    position: Math.ceil(match.position / 2),
    slot: parity(match.position),
  };
};

export const loserDestination = (match: Match, matches: Match[]): Slot | null => {
  const losersRounds = roundsOn(matches, "losers");
  if (losersRounds === 0 || sideOf(match) !== "winners") return null;

  const winnersRounds = roundsOn(matches, "winners");
  const { round, position } = match;

  if (round === 1) {
    return { bracket: "losers", round: 1, position: Math.ceil(position / 2), slot: parity(position) };
  }
  if (round === winnersRounds) {
    return { bracket: "losers", round: losersRounds, position: 1, slot: "away" };
  }
  // Drop into the losers round that pairs with this winners round. Positions
  // are reversed so a team does not meet the side of the draw it just left.
  const inRound = matches.filter((m) => sideOf(m) === "winners" && m.round === round).length;
  return { bracket: "losers", round: 2 * (round - 1), position: inRound + 1 - position, slot: "away" };
};

export const matchAt = (matches: Match[], slot: Slot): Match | undefined =>
  matches.find(
    (m) => sideOf(m) === slot.bracket && m.round === slot.round && m.position === slot.position,
  );

/** The matches whose winner or loser feeds each match, keyed by match id. */
export const feedersOf = (matches: Match[]): Map<string, string[]> => {
  const feeders = new Map<string, string[]>();
  for (const match of matches) {
    for (const slot of [winnerDestination(match, matches), loserDestination(match, matches)]) {
      if (!slot) continue;
      const target = matchAt(matches, slot);
      if (!target) continue;
      feeders.set(target.id, [...(feeders.get(target.id) ?? []), match.id]);
    }
  }
  return feeders;
};

/** Put a team into a slot. Returns the updated target, or undefined if there is none. */
export const fillSlot = (matches: Map<string, Match>, slot: Slot, teamId: string): void => {
  const target = matchAt([...matches.values()], slot);
  if (!target) return;
  matches.set(target.id, {
    ...target,
    [slot.slot === "home" ? "homeTeamId" : "awayTeamId"]: teamId,
  });
};

/** Send a completed match's winner, and in double elimination its loser, onward. */
export const advance = (matches: Map<string, Match>, completed: Match): void => {
  const list = [...matches.values()];
  const winnerId = completed.winnerId;
  if (!winnerId) return;
  const loserId = completed.homeTeamId === winnerId ? completed.awayTeamId : completed.homeTeamId;

  const toWinner = winnerDestination(completed, list);
  if (toWinner) fillSlot(matches, toWinner, winnerId);

  const toLoser = loserDestination(completed, list);
  if (toLoser && loserId) fillSlot(matches, toLoser, loserId);
};

/**
 * Settle the matches that will not be played. A match whose two teams are
 * known but one of which has withdrawn is that team's forfeit. Once every
 * match feeding a pending match has finished, a match with one team left is
 * won by that team and a match with none is closed. Either way the result
 * flows on, so a withdrawn team's opponent goes through and a bracket with
 * a team count that is not a power of two still reaches its final.
 */
export const settleWithoutPlay = (
  matches: Map<string, Match>,
  withdrawn: Set<string>,
  now: number,
): void => {
  const feeders = feedersOf([...matches.values()]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...matches.keys()]) {
      // Re-read: an earlier settlement in this pass may have filled a slot.
      const match = matches.get(id);
      if (!match || match.status === "completed") continue;
      const settled =
        forfeitOf(match, withdrawn, now) ?? byeOf(match, matches, feeders, withdrawn, now);
      if (!settled) continue;
      matches.set(match.id, settled);
      if (settled.winnerId) advance(matches, settled);
      changed = true;
    }
  }
};

/** The match as a forfeit, when both its teams are known and one has withdrawn. */
const forfeitOf = (match: Match, withdrawn: Set<string>, now: number): Match | null => {
  if (!match.homeTeamId || !match.awayTeamId) return null;
  const gone = [match.homeTeamId, match.awayTeamId].filter((id) => withdrawn.has(id));
  return gone.length === 1 ? forfeited(match, gone[0], now) : null;
};

/**
 * The match settled as a bye, when nothing can fill it further: every match
 * feeding it has finished and fewer than two of its teams are still in.
 */
const byeOf = (
  match: Match,
  matches: Map<string, Match>,
  feeders: Map<string, string[]>,
  withdrawn: Set<string>,
  now: number,
): Match | null => {
  const sources = feeders.get(match.id) ?? [];
  if (sources.length === 0) return null;
  if (!sources.every((id) => matches.get(id)?.status === "completed")) return null;

  const present = [match.homeTeamId, match.awayTeamId].filter((id) => id && !withdrawn.has(id));
  if (present.length === 2) return null;
  return {
    ...match,
    status: "completed",
    isBye: true,
    homeScore: 0,
    awayScore: 0,
    completedAt: now,
    ...(present[0] ? { winnerId: present[0] } : {}),
  };
};

/** Settled by a bye or a forfeit rather than by play. */
const settledWithoutPlay = (match: Match): boolean =>
  match.status === "completed" && (match.isBye === true || match.forfeitedBy !== undefined);

/** Played, being played, or opened for scoring. A bye or a forfeit has not started. */
const hasStarted = (match: Match): boolean =>
  match.status === "in_progress" ||
  match.homeScore > 0 ||
  match.awayScore > 0 ||
  (match.status === "completed" && !settledWithoutPlay(match));

/**
 * Take back what a result sent onward, so a corrected result can flow
 * instead. The matches it fed lose the team it sent them. One of those that
 * was then settled without play, a bye or a forfeit, is reopened as a
 * fresh match and what it sent on is taken back in turn. Returns the first
 * match in the way that has started, with nothing changed, when the result
 * can no longer change.
 */
export const takeBack = (matches: Map<string, Match>, from: Match): Match | null => {
  const list = [...matches.values()];
  const clear: Slot[] = [];
  const reopen = new Set<string>();
  const queue = [from];
  for (let source = queue.shift(); source; source = queue.shift()) {
    for (const slot of [winnerDestination(source, list), loserDestination(source, list)]) {
      if (!slot) continue;
      const target = matchAt(list, slot);
      if (!target) continue;
      if (hasStarted(target)) return target;
      clear.push(slot);
      if (target.status === "completed" && !reopen.has(target.id)) {
        reopen.add(target.id);
        queue.push(target);
      }
    }
  }

  for (const slot of clear) fillSlot(matches, slot, "");
  for (const id of reopen) {
    const target = matches.get(id);
    if (!target) continue;
    matches.set(id, {
      ...target,
      status: "pending",
      winnerId: undefined,
      isBye: undefined,
      forfeitedBy: undefined,
      completedAt: undefined,
      homeScore: 0,
      awayScore: 0,
      ...(target.seriesLength !== undefined && { homeWins: 0, awayWins: 0, seriesGame: 1 }),
    });
  }
  return null;
};

/** The champion once the bracket's last match is done, else undefined. */
export const bracketChampion = (matches: Match[]): string | undefined => {
  const losersRounds = roundsOn(matches, "losers");
  const final =
    losersRounds > 0
      ? matches.find((m) => sideOf(m) === "grand_finals")
      : matchAt(matches, { bracket: "winners", round: roundsOn(matches, "winners"), position: 1, slot: "home" });
  return final?.status === "completed" ? final.winnerId : undefined;
};
