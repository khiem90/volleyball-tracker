// @vitest-environment node
import { doc, getDoc } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { buildTeamTallies } from "@/components/matchbook/teamStats";
import {
  abandonedQuickMatches,
  addQuickMatch,
  completeQuickMatch,
  discardQuickMatch,
} from "@/lib/quickMatches";
import { subscribeToAccountMatches } from "@/lib/tournaments";
import type { Match } from "@/types/game";
import { describeFirestoreRules, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";

/** A quick match: no tournament, two roster teams. */
const quickMatch = (overrides: Partial<Match> = {}): Match => ({
  id: "q1",
  ownerId: owner,
  tournamentId: null,
  homeTeamId: "t1",
  awayTeamId: "t2",
  homeScore: 0,
  awayScore: 0,
  status: "in_progress",
  round: 1,
  position: 1,
  createdAt: 1,
  ...overrides,
});

describe("abandoned quick matches", () => {
  it("lists the quick matches left mid-way, the most recently started first", () => {
    const matches = [
      quickMatch({ id: "left-first", status: "in_progress", homeScore: 7, awayScore: 5, createdAt: 1 }),
      quickMatch({ id: "finished", status: "completed", homeScore: 21, awayScore: 19, winnerId: "t1", createdAt: 2 }),
      quickMatch({ id: "never-scored", status: "pending", createdAt: 3 }),
      quickMatch({ id: "tournament-match", tournamentId: "tourn-1", status: "in_progress", createdAt: 4 }),
    ];

    expect(abandonedQuickMatches(matches).map((m) => m.id)).toEqual(["never-scored", "left-first"]);
  });
});

describeFirestoreRules("Quick matches on Firestore", (env) => {
  it("a completed quick match counts in both teams' all-time records", async () => {
    const db = modularFirestore(env().authenticatedContext(owner));
    const match = await addQuickMatch(db, owner, { homeTeamId: "t1", awayTeamId: "t2" });

    await completeQuickMatch(db, owner, match, { homeScore: 21, awayScore: 17 });

    const matches = await when<Match[]>(
      (onChange, onError) => subscribeToAccountMatches(db, owner, onChange, onError),
      (list) => list.some((m) => m.status === "completed"),
    );
    const records = buildTeamTallies(matches.filter((m) => m.status === "completed"));
    expect(records.get("t1")).toMatchObject({ played: 1, won: 1, lost: 0, pointsFor: 21, pointsAgainst: 17 });
    expect(records.get("t2")).toMatchObject({ played: 1, won: 0, lost: 1, pointsFor: 17, pointsAgainst: 21 });
  });

  it("refuses a tie and leaves the match without a result", async () => {
    const db = modularFirestore(env().authenticatedContext(owner));
    const match = await addQuickMatch(db, owner, { homeTeamId: "t1", awayTeamId: "t2" });

    await expect(
      completeQuickMatch(db, owner, match, { homeScore: 15, awayScore: 15 }),
    ).rejects.toThrow("A match cannot end in a tie.");

    const stored = await getDoc(doc(db, "users", owner, "matches", match.id));
    expect(stored.data()).toMatchObject({ status: "pending", homeScore: 0, awayScore: 0 });
  });

  it("discarding a quick match left mid-way removes it from the account's matches", async () => {
    const db = modularFirestore(env().authenticatedContext(owner));
    const kept = await addQuickMatch(db, owner, { homeTeamId: "t1", awayTeamId: "t2" });
    const discarded = await addQuickMatch(db, owner, { homeTeamId: "t3", awayTeamId: "t4" });

    await discardQuickMatch(db, owner, discarded.id);

    const matches = await when<Match[]>(
      (onChange, onError) => subscribeToAccountMatches(db, owner, onChange, onError),
      (list) => list.length === 1,
    );
    expect(abandonedQuickMatches(matches).map((m) => m.id)).toEqual([kept.id]);
  });
});
