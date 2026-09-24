// @vitest-environment node
import { collection, doc, getDoc, getDocs, type Firestore, type Unsubscribe } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { addQuickMatch } from "@/lib/quickMatches";
import {
  applyTournamentCommand,
  createTournament,
  deleteTournament,
  StaleTournamentError,
  subscribeToAccountMatches,
  subscribeToTournaments,
  updateTournament,
  type NewTournamentInput,
} from "@/lib/tournaments";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
  DEFAULT_TERMINOLOGY,
} from "@/types/competition-config";
import type { Match, PersistentTeam, Tournament, TournamentFormat } from "@/types/game";
import { describeFirestoreRules, modularFirestore } from "../rules/emulator";

const owner = "owner-uid";

const roster: PersistentTeam[] = [
  { id: "t1", name: "Aces", color: "#ef4444", createdAt: 1 },
  { id: "t2", name: "Blockers", color: "#3b82f6", createdAt: 2 },
  { id: "t3", name: "Chasers", color: "#22c55e", createdAt: 3 },
  { id: "t4", name: "Diggers", color: "#f59e0b", createdAt: 4 },
];

const input = (format: TournamentFormat, name = "Tuesday night"): NewTournamentInput => ({
  name,
  format,
  teams: roster,
  settings: {
    courts: 1,
    seriesLength: 1,
    instantWin: false,
    pointsForWin: DEFAULT_POINTS_FOR_WIN,
    pointsForLoss: DEFAULT_POINTS_FOR_LOSS,
    terminology: DEFAULT_TERMINOLOGY,
  },
});

/** Resolves with the first snapshot from `subscribe` that satisfies `ready`. */
const when = <T>(
  subscribe: (onChange: (value: T) => void, onError: (error: Error) => void) => Unsubscribe,
  ready: (value: T) => boolean,
): Promise<T> =>
  new Promise((resolve, reject) => {
    let unsubscribe: Unsubscribe = () => {};
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error("subscription never reached the expected state"));
    }, 5000);
    unsubscribe = subscribe(
      (value) => {
        if (!ready(value)) return;
        clearTimeout(timer);
        unsubscribe();
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        unsubscribe();
        reject(error);
      },
    );
  });

const matchDocsOf = async (db: Firestore, tournamentId: string): Promise<Match[]> => {
  const snapshot = await getDocs(collection(db, "tournaments", tournamentId, "matches"));
  return snapshot.docs.map((d) => d.data() as Match);
};

const tournamentDocOf = async (db: Firestore, id: string): Promise<Tournament> => {
  const snapshot = await getDoc(doc(db, "tournaments", id));
  return snapshot.data() as Tournament;
};

describeFirestoreRules("Tournaments on Firestore", (env) => {
  describe("as the owner", () => {
    it("creating a tournament writes a draft with owner, format, settings, and entries snapshotting each team", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));

      const created = await createTournament(db, owner, input("round_robin"));

      const stored = await tournamentDocOf(db, created.id);
      expect(stored).toMatchObject({
        id: created.id,
        ownerId: owner,
        name: "Tuesday night",
        format: "round_robin",
        status: "draft",
        spectatorEnabled: false,
        teamIds: ["t1", "t2", "t3", "t4"],
        settings: { courts: 1, seriesLength: 1, instantWin: false, pointsForWin: 3, pointsForLoss: 0 },
      });
      expect(stored.entries).toEqual([
        { teamId: "t1", name: "Aces", color: "#ef4444" },
        { teamId: "t2", name: "Blockers", color: "#3b82f6" },
        { teamId: "t3", name: "Chasers", color: "#22c55e" },
        { teamId: "t4", name: "Diggers", color: "#f59e0b" },
      ]);
      expect(await matchDocsOf(db, created.id)).toHaveLength(0);
    });

    it("starting writes one match document per scheduled match and makes the tournament live", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));

      await applyTournamentCommand(db, created.id, { type: "start" });

      const stored = await tournamentDocOf(db, created.id);
      expect(stored.status).toBe("live");
      expect(stored.revision).not.toBe(created.revision);
      const matches = await matchDocsOf(db, created.id);
      expect(matches).toHaveLength(6);
      expect(matches.every((m) => m.ownerId === owner && m.tournamentId === created.id)).toBe(true);
      expect(matches.every((m) => m.status === "pending")).toBe(true);
    });

    it("completing a match updates that document and the one the engine fills next, nothing else", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("single_elimination"));
      await applyTournamentCommand(db, created.id, { type: "start" });
      const before = await matchDocsOf(db, created.id);
      const first = before.find((m) => m.round === 1 && m.position === 1)!;
      const other = before.find((m) => m.round === 1 && m.position === 2)!;

      await applyTournamentCommand(db, created.id, {
        type: "complete_match",
        matchId: first.id,
        homeScore: 25,
        awayScore: 19,
      });

      const after = await matchDocsOf(db, created.id);
      expect(after).toHaveLength(3);
      expect(after.find((m) => m.id === first.id)).toMatchObject({
        status: "completed",
        winnerId: first.homeTeamId,
        homeScore: 25,
        awayScore: 19,
      });
      expect(after.find((m) => m.round === 2)).toMatchObject({ homeTeamId: first.homeTeamId, awayTeamId: "" });
      expect(after.find((m) => m.id === other.id)).toEqual(other);
    });

    it("completes a round robin on its own when the last match document is done", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, { ...input("round_robin"), teams: roster.slice(0, 3) });
      await applyTournamentCommand(db, created.id, { type: "start" });

      for (const match of await matchDocsOf(db, created.id)) {
        await applyTournamentCommand(db, created.id, {
          type: "complete_match",
          matchId: match.id,
          homeScore: match.homeTeamId === "t1" || match.awayTeamId !== "t1" ? 25 : 10,
          awayScore: match.homeTeamId === "t1" || match.awayTeamId !== "t1" ? 10 : 25,
        });
      }

      const stored = await tournamentDocOf(db, created.id);
      expect(stored.status).toBe("completed");
      expect(stored.winnerId).toBe("t1");
    });

    it("refuses a command the engine rejects and leaves the documents untouched", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));
      await applyTournamentCommand(db, created.id, { type: "start" });
      const before = await matchDocsOf(db, created.id);

      await expect(
        applyTournamentCommand(db, created.id, {
          type: "complete_match",
          matchId: before[0].id,
          homeScore: 7,
          awayScore: 7,
        }),
      ).rejects.toThrow(/tie/);

      expect(await matchDocsOf(db, created.id)).toEqual(before);
    });

    it("a direct update is refused when the tournament has moved past the revision it was built on", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));

      await updateTournament(db, { ...created, name: "Renamed" }, created.revision);
      await expect(
        updateTournament(db, { ...created, name: "Overwritten" }, created.revision),
      ).rejects.toBeInstanceOf(StaleTournamentError);

      expect((await tournamentDocOf(db, created.id)).name).toBe("Renamed");
    });

    it("a stale direct update cannot undo a result the engine just saved", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));
      const started = await applyTournamentCommand(db, created.id, { type: "start" });

      // Someone with the pre-start copy tries to write it back.
      await expect(
        updateTournament(db, { ...created, name: "Back to draft" }, created.revision),
      ).rejects.toBeInstanceOf(StaleTournamentError);

      const stored = await tournamentDocOf(db, created.id);
      expect(stored.status).toBe("live");
      expect(stored.revision).toBe(started.tournament.revision);
    });

    it("lists two live round robin tournaments at once", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const first = await createTournament(db, owner, input("round_robin", "Court A"));
      const second = await createTournament(db, owner, input("round_robin", "Court B"));
      await applyTournamentCommand(db, first.id, { type: "start" });
      await applyTournamentCommand(db, second.id, { type: "start" });

      const tournaments = await when<Tournament[]>(
        (onChange, onError) => subscribeToTournaments(db, owner, onChange, onError),
        (list) => list.length === 2 && list.every((t) => t.status === "live"),
      );

      expect(tournaments.map((t) => [t.name, t.status])).toEqual(
        expect.arrayContaining([
          ["Court A", "live"],
          ["Court B", "live"],
        ]),
      );
    });

    it("the account-wide match subscription returns every tournament's matches and quick matches", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const first = await createTournament(db, owner, { ...input("round_robin"), teams: roster.slice(0, 3) });
      const second = await createTournament(db, owner, { ...input("round_robin"), teams: roster.slice(0, 3) });
      await applyTournamentCommand(db, first.id, { type: "start" });
      await applyTournamentCommand(db, second.id, { type: "start" });
      const quick = await addQuickMatch(db, owner, { homeTeamId: "t1", awayTeamId: "t2" });

      const matches = await when<Match[]>(
        (onChange, onError) => subscribeToAccountMatches(db, owner, onChange, onError),
        (list) => list.length === 7,
      );

      expect(matches.filter((m) => m.tournamentId === first.id)).toHaveLength(3);
      expect(matches.filter((m) => m.tournamentId === second.id)).toHaveLength(3);
      expect(matches.find((m) => m.id === quick.id)).toMatchObject({
        tournamentId: null,
        ownerId: owner,
        homeTeamId: "t1",
        awayTeamId: "t2",
        status: "pending",
      });
    });

    it("deleting a tournament removes it and its matches", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));
      await applyTournamentCommand(db, created.id, { type: "start" });

      await deleteTournament(db, created.id);

      // A read of a missing document cannot pass the rules, so look with
      // them off: this is a check of what is stored, not of who may read it.
      await env().withSecurityRulesDisabled(async (unrestricted) => {
        const raw = modularFirestore(unrestricted);
        expect((await getDoc(doc(raw, "tournaments", created.id))).exists()).toBe(false);
        expect(await matchDocsOf(raw, created.id)).toHaveLength(0);
      });
    });
  });
});
