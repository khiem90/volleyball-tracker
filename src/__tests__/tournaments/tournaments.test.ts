// @vitest-environment node
import { collection, doc, getDoc, getDocs, type Firestore } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { addQuickMatch } from "@/lib/quickMatches";
import {
  proveScorer,
  regenerateScorerKey,
  setSpectatorEnabled,
  subscribeToScorerKey,
} from "@/lib/sharing";
import {
  applyTournamentCommand,
  createTournament,
  deleteTournament,
  duplicateInput,
  renameTournament,
  StaleTournamentError,
  subscribeToAccountMatches,
  subscribeToTournament,
  subscribeToTournamentMatches,
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
import { describeFirestoreRules, modularFirestore, when } from "../rules/emulator";

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

/** Six teams on two courts, so each court has a queue to draw from. */
const rotationInput = (format: TournamentFormat): NewTournamentInput => {
  const base = input(format, "Rotation night");
  return {
    ...base,
    teams: [
      ...roster,
      { id: "t5", name: "Eagles", color: "#a855f7", createdAt: 5 },
      { id: "t6", name: "Falcons", color: "#14b8a6", createdAt: 6 },
    ],
    settings: { ...base.settings, courts: 2, instantWin: true },
  };
};

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

    it("starting a rotation tournament writes the format state and one match per court", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, rotationInput("win2out"));

      await applyTournamentCommand(db, created.id, { type: "start" });

      const stored = await tournamentDocOf(db, created.id);
      expect(stored.status).toBe("live");
      expect(stored.win2outState).toMatchObject({
        numberOfCourts: 2,
        queue: ["t5", "t6"],
        courts: [
          { courtNumber: 1, teamIds: ["t1", "t2"] },
          { courtNumber: 2, teamIds: ["t3", "t4"] },
        ],
      });
      const matches = await matchDocsOf(db, created.id);
      expect(matches.map((m) => [m.court, m.homeTeamId, m.awayTeamId, m.status]).sort()).toEqual([
        [1, "t1", "t2", "pending"],
        [2, "t3", "t4", "pending"],
      ]);
    });

    it("keeps both results when two courts finish at the same moment", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, rotationInput("win2out"));
      await applyTournamentCommand(db, created.id, { type: "start" });
      const before = await matchDocsOf(db, created.id);
      const court1 = before.find((m) => m.court === 1)!;
      const court2 = before.find((m) => m.court === 2)!;

      // Two phones, one per court, saving at once. Each loads the same
      // revision; one of them must lose the race and apply again on top of
      // the other's result.
      await Promise.all([
        applyTournamentCommand(db, created.id, {
          type: "complete_match",
          matchId: court1.id,
          homeScore: 25,
          awayScore: 20,
        }),
        applyTournamentCommand(db, created.id, {
          type: "complete_match",
          matchId: court2.id,
          homeScore: 18,
          awayScore: 25,
        }),
      ]);

      const after = await matchDocsOf(db, created.id);
      expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
      expect(after.find((m) => m.id === court2.id)).toMatchObject({ status: "completed", winnerId: "t4" });
      const open = after.filter((m) => m.status === "pending").sort((a, b) => a.court! - b.court!);
      expect(open.map((m) => [m.court, m.homeTeamId, m.awayTeamId])).toEqual(
        expect.arrayContaining([
          [1, "t1", expect.stringMatching(/^t[56]$/)],
          [2, "t4", expect.stringMatching(/^t[56]$/)],
        ]),
      );
      expect(new Set(open.map((m) => m.awayTeamId)).size).toBe(2);
      const stored = await tournamentDocOf(db, created.id);
      expect(stored.win2outState?.queue.sort()).toEqual(["t2", "t3"]);
      expect(stored.win2outState?.courts.map((c) => c.teamIds[0])).toEqual(["t1", "t4"]);
    });

    it("an instant win schedules the court's next match and undo takes it back", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, rotationInput("two_match_rotation"));
      await applyTournamentCommand(db, created.id, { type: "start" });
      const live = await tournamentDocOf(db, created.id);
      const before = await matchDocsOf(db, created.id);
      const court1 = before.find((m) => m.court === 1)!;

      const outcome = await applyTournamentCommand(db, created.id, {
        type: "instant_win",
        matchId: court1.id,
        winnerId: "t2",
      });

      const played = await matchDocsOf(db, created.id);
      expect(played).toHaveLength(3);
      expect(played.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t2" });
      expect(played.find((m) => m.id === outcome.createdMatchIds[0])).toMatchObject({
        court: 1,
        homeTeamId: "t2",
        awayTeamId: "t5",
        status: "pending",
      });
      expect((await tournamentDocOf(db, created.id)).twoMatchRotationState?.queue).toEqual(["t6", "t1"]);

      await applyTournamentCommand(db, created.id, { type: "undo_result", matchId: court1.id });

      const restored = await matchDocsOf(db, created.id);
      expect(restored.map((m) => m.id).sort()).toEqual(before.map((m) => m.id).sort());
      expect(restored.find((m) => m.id === court1.id)).toEqual(court1);
      const stateAfterUndo = (await tournamentDocOf(db, created.id)).twoMatchRotationState;
      expect({ ...stateAfterUndo, undoRecords: undefined }).toEqual(live.twoMatchRotationState);
    });

    it("renaming writes the trimmed name and moves the revision, and leaves the rest alone", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));
      await applyTournamentCommand(db, created.id, { type: "start" });
      const before = await tournamentDocOf(db, created.id);
      const matchesBefore = await matchDocsOf(db, created.id);

      await renameTournament(db, created.id, "  Wednesday night ");

      const after = await tournamentDocOf(db, created.id);
      expect(after.name).toBe("Wednesday night");
      expect(after.revision).not.toBe(before.revision);
      expect(after.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
      expect({ ...after, name: before.name, revision: before.revision, updatedAt: before.updatedAt }).toEqual(before);
      expect(await matchDocsOf(db, created.id)).toEqual(matchesBefore);
    });

    it("refuses an empty name and writes nothing", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));

      await expect(renameTournament(db, created.id, "   ")).rejects.toThrow(/name/i);

      const stored = await tournamentDocOf(db, created.id);
      expect(stored.name).toBe("Tuesday night");
      expect(stored.revision).toBe(created.revision);
    });

    it("a duplicate of a completed rotation tournament is a fresh draft with its teams and settings and no format state", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const source = await createTournament(db, owner, rotationInput("win2out"));
      await applyTournamentCommand(db, source.id, { type: "start" });
      const first = (await matchDocsOf(db, source.id)).find((m) => m.court === 1)!;
      await applyTournamentCommand(db, source.id, {
        type: "instant_win",
        matchId: first.id,
        winnerId: first.homeTeamId,
      });
      await applyTournamentCommand(db, source.id, { type: "end" });
      const completed = await tournamentDocOf(db, source.id);
      const roster = rotationInput("win2out").teams;

      const duplicate = await createTournament(db, owner, duplicateInput(completed, roster));

      const stored = await tournamentDocOf(db, duplicate.id);
      expect(stored.id).not.toBe(source.id);
      expect(stored).toMatchObject({
        ownerId: owner,
        name: "Rotation night (duplicate)",
        format: "win2out",
        status: "draft",
        spectatorEnabled: false,
        teamIds: completed.teamIds,
        entries: completed.entries,
        settings: completed.settings,
      });
      expect(stored.win2outState).toBeUndefined();
      expect(stored.startedAt).toBeUndefined();
      expect(stored.completedAt).toBeUndefined();
      expect(await matchDocsOf(db, duplicate.id)).toHaveLength(0);
      expect((await tournamentDocOf(db, source.id)).status).toBe("completed");
    });

    it("creating and starting in one go writes a live tournament with its first matches", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));

      const created = await createTournament(db, owner, input("round_robin"), { start: true });

      const stored = await tournamentDocOf(db, created.id);
      expect(stored).toMatchObject({
        ownerId: owner,
        name: "Tuesday night",
        format: "round_robin",
        status: "live",
        teamIds: ["t1", "t2", "t3", "t4"],
      });
      expect(stored.startedAt).toBe(stored.createdAt);
      const matches = await matchDocsOf(db, created.id);
      expect(matches).toHaveLength(6);
      expect(matches.every((m) => m.ownerId === owner && m.tournamentId === created.id)).toBe(true);
      expect(matches.every((m) => m.status === "pending")).toBe(true);
    });

    it("creating and starting a rotation tournament writes its format state and one match per court", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));

      const created = await createTournament(db, owner, rotationInput("win2out"), { start: true });

      const stored = await tournamentDocOf(db, created.id);
      expect(stored.status).toBe("live");
      expect(stored.win2outState).toMatchObject({
        numberOfCourts: 2,
        queue: ["t5", "t6"],
        courts: [
          { courtNumber: 1, teamIds: ["t1", "t2"] },
          { courtNumber: 2, teamIds: ["t3", "t4"] },
        ],
      });
      const matches = await matchDocsOf(db, created.id);
      expect(matches.map((m) => [m.court, m.homeTeamId, m.awayTeamId, m.status]).sort()).toEqual([
        [1, "t1", "t2", "pending"],
        [2, "t3", "t4", "pending"],
      ]);
    });

    it("a start the engine refuses is rejected before anything is written", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));

      await expect(
        createTournament(db, owner, { ...input("round_robin"), teams: roster.slice(0, 2) }, { start: true }),
      ).rejects.toThrow(/needs at least 3 teams/);

      await env().withSecurityRulesDisabled(async (unrestricted) => {
        const raw = modularFirestore(unrestricted);
        expect((await getDocs(collection(raw, "tournaments"))).size).toBe(0);
      });
    });

    it("adding, withdrawing, and closing a court on a live rotation tournament write the entries, the queue, and the matches", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, rotationInput("win2out"), { start: true });

      await applyTournamentCommand(db, created.id, { type: "add_team", teamId: "t7", name: "Gulls" });

      const joined = await tournamentDocOf(db, created.id);
      expect(joined.entries.at(-1)).toEqual({ teamId: "t7", name: "Gulls" });
      expect(joined.teamIds).toEqual(["t1", "t2", "t3", "t4", "t5", "t6", "t7"]);
      expect(joined.win2outState?.queue).toEqual(["t5", "t6", "t7"]);

      await applyTournamentCommand(db, created.id, { type: "withdraw", teamId: "t6" });

      const withdrawn = await tournamentDocOf(db, created.id);
      expect(withdrawn.entries.find((e) => e.teamId === "t6")?.withdrawnAt).toEqual(expect.any(Number));
      expect(withdrawn.win2outState?.queue).toEqual(["t5", "t7"]);

      const court2 = (await matchDocsOf(db, created.id)).find((m) => m.court === 2)!;
      await applyTournamentCommand(db, created.id, { type: "change_courts", courts: 1 });

      const narrowed = await tournamentDocOf(db, created.id);
      expect(narrowed.settings.courts).toBe(1);
      expect(narrowed.win2outState?.courts.map((c) => c.courtNumber)).toEqual([1]);
      expect(narrowed.win2outState?.queue).toEqual(["t3", "t4", "t5", "t7"]);
      const matches = await matchDocsOf(db, created.id);
      expect(matches).toHaveLength(1);
      expect(matches[0].id).not.toBe(court2.id);
    });

    it("adding, withdrawing, and correcting a result on a live round robin write the entries and the matches", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"), { start: true });

      await applyTournamentCommand(db, created.id, { type: "add_team", teamId: "t5", name: "Eagles" });

      const joined = await tournamentDocOf(db, created.id);
      expect(joined.entries.at(-1)).toEqual({ teamId: "t5", name: "Eagles" });
      expect(joined.teamIds).toEqual(["t1", "t2", "t3", "t4", "t5"]);
      const afterAdd = await matchDocsOf(db, created.id);
      expect(afterAdd).toHaveLength(10);
      expect(afterAdd.filter((m) => m.awayTeamId === "t5").map((m) => m.homeTeamId).sort()).toEqual(
        ["t1", "t2", "t3", "t4"],
      );

      await applyTournamentCommand(db, created.id, { type: "withdraw", teamId: "t5" });

      const withdrawn = await tournamentDocOf(db, created.id);
      expect(withdrawn.entries.at(-1)?.withdrawnAt).toEqual(expect.any(Number));
      expect(withdrawn.status).toBe("live");
      const forfeits = (await matchDocsOf(db, created.id)).filter((m) => m.awayTeamId === "t5");
      expect(forfeits).toHaveLength(4);
      for (const match of forfeits) {
        expect(match).toMatchObject({
          status: "completed",
          forfeitedBy: "t5",
          winnerId: match.homeTeamId,
          homeScore: 0,
          awayScore: 0,
        });
      }

      // A forfeit corrected into a played result loses its forfeit mark in the document.
      const forfeit = forfeits[0];
      await applyTournamentCommand(db, created.id, {
        type: "correct_result",
        matchId: forfeit.id,
        homeScore: 21,
        awayScore: 25,
      });

      const corrected = (await matchDocsOf(db, created.id)).find((m) => m.id === forfeit.id)!;
      expect(corrected).toMatchObject({
        status: "completed",
        winnerId: "t5",
        homeScore: 21,
        awayScore: 25,
      });
      expect("forfeitedBy" in corrected).toBe(false);
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

  describe("share links", () => {
    const phoneA = "phone-a-uid";
    const phoneB = "phone-b-uid";
    const ownerDb = () => modularFirestore(env().authenticatedContext(owner));
    /** A phone that opened a link, with a silent anonymous identity and no account. */
    const phoneDb = (uid: string) =>
      modularFirestore(
        env().authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }),
      );

    /** The key behind the scorer link, as the owner's Settings tab reads it. */
    const currentScorerKey = (db: Firestore, tournamentId: string) =>
      when<string | null>(
        (onChange, onError) => subscribeToScorerKey(db, tournamentId, onChange, onError),
        (key) => key !== null,
      );

    /** The owner creates and starts a tournament; each phone opens its scorer link. */
    const sharedWith = async (phones: string[], tournamentInput: NewTournamentInput) => {
      const db = ownerDb();
      const created = await createTournament(db, owner, tournamentInput);
      await applyTournamentCommand(db, created.id, { type: "start" });
      const key = (await currentScorerKey(db, created.id))!;
      for (const uid of phones) await proveScorer(phoneDb(uid), created.id, uid, key);
      return { id: created.id, key };
    };

    /** What the rules' refusal looks like to the caller. */
    const REFUSED = { code: "permission-denied" };

    const winFor = (match: Match, winnerId: string) => ({
      type: "complete_match" as const,
      matchId: match.id,
      homeScore: match.homeTeamId === winnerId ? 25 : 20,
      awayScore: match.homeTeamId === winnerId ? 20 : 25,
    });

    it("a new tournament has a scorer key that its owner reads and a phone cannot", async () => {
      const db = ownerDb();
      const created = await createTournament(db, owner, input("round_robin"));

      const key = await currentScorerKey(db, created.id);

      expect(key).toEqual(expect.any(String));
      expect(key!.length).toBeGreaterThanOrEqual(16);
      await expect(
        getDoc(doc(phoneDb(phoneA), "tournaments", created.id, "private", "scorerKey")),
      ).rejects.toMatchObject(REFUSED);
    });

    it("a phone that opened the scorer link records a result through the engine", async () => {
      const { id } = await sharedWith([phoneA], input("round_robin"));
      const db = phoneDb(phoneA);
      const [match] = await matchDocsOf(db, id);

      await applyTournamentCommand(db, id, winFor(match, match.awayTeamId));

      const stored = (await matchDocsOf(db, id)).find((m) => m.id === match.id);
      expect(stored).toMatchObject({ status: "completed", winnerId: match.awayTeamId });
    });

    it("two phones on the scorer link complete matches on different courts at the same time without losing either result", async () => {
      const { id } = await sharedWith([phoneA, phoneB], rotationInput("win2out"));
      const before = await matchDocsOf(ownerDb(), id);
      const court1 = before.find((m) => m.court === 1)!;
      const court2 = before.find((m) => m.court === 2)!;

      await Promise.all([
        applyTournamentCommand(phoneDb(phoneA), id, winFor(court1, "t1")),
        applyTournamentCommand(phoneDb(phoneB), id, winFor(court2, "t4")),
      ]);

      const after = await matchDocsOf(ownerDb(), id);
      expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
      expect(after.find((m) => m.id === court2.id)).toMatchObject({ status: "completed", winnerId: "t4" });
      const open = after.filter((m) => m.status === "pending");
      expect(open.map((m) => m.court).sort()).toEqual([1, 2]);
      expect(new Set(open.map((m) => m.awayTeamId)).size).toBe(2);
      expect((await tournamentDocOf(ownerDb(), id)).win2outState?.queue.sort()).toEqual(["t2", "t3"]);
    });

    it("a phone's last result completes a round robin on its own", async () => {
      const { id } = await sharedWith([phoneA], { ...input("round_robin"), teams: roster.slice(0, 3) });
      const db = phoneDb(phoneA);

      for (const match of await matchDocsOf(db, id)) {
        const winner = match.homeTeamId === "t1" || match.awayTeamId === "t1" ? "t1" : match.homeTeamId;
        await applyTournamentCommand(db, id, winFor(match, winner));
      }

      const stored = await tournamentDocOf(ownerDb(), id);
      expect(stored.status).toBe("completed");
      expect(stored.winnerId).toBe("t1");
    });

    it("a phone cannot end, rename, delete, change the teams of, or open the spectator link on the tournament", async () => {
      const { id } = await sharedWith([phoneA], input("round_robin"));
      const db = phoneDb(phoneA);

      await expect(applyTournamentCommand(db, id, { type: "end" })).rejects.toMatchObject(REFUSED);
      await expect(renameTournament(db, id, "Hacked")).rejects.toMatchObject(REFUSED);
      await expect(applyTournamentCommand(db, id, { type: "withdraw", teamId: "t1" })).rejects.toMatchObject(REFUSED);
      await expect(
        applyTournamentCommand(db, id, { type: "add_team", teamId: "t9", name: "Gatecrashers" }),
      ).rejects.toMatchObject(REFUSED);
      await expect(setSpectatorEnabled(db, id, true)).rejects.toMatchObject(REFUSED);
      await expect(deleteTournament(db, id)).rejects.toMatchObject(REFUSED);

      const stored = await tournamentDocOf(ownerDb(), id);
      expect(stored).toMatchObject({ status: "live", name: "Tuesday night", spectatorEnabled: false });
      expect(stored.entries.every((entry) => entry.withdrawnAt === undefined)).toBe(true);
      expect(stored.teamIds).toEqual(["t1", "t2", "t3", "t4"]);
      expect(await matchDocsOf(ownerDb(), id)).toHaveLength(6);
    });

    it("after the owner regenerates the scorer link, a phone on the old link is refused on its next write and cannot prove itself with the old key", async () => {
      const { id, key: oldKey } = await sharedWith([phoneA], input("round_robin"));
      const db = phoneDb(phoneA);
      const [first, second] = await matchDocsOf(db, id);
      await applyTournamentCommand(db, id, winFor(first, first.homeTeamId));

      const newKey = await regenerateScorerKey(ownerDb(), id);

      expect(newKey).not.toBe(oldKey);
      expect(await currentScorerKey(ownerDb(), id)).toBe(newKey);
      await expect(applyTournamentCommand(db, id, winFor(second, second.homeTeamId))).rejects.toMatchObject(REFUSED);
      await expect(proveScorer(db, id, phoneA, oldKey)).rejects.toMatchObject(REFUSED);
      expect((await matchDocsOf(ownerDb(), id)).find((m) => m.id === second.id)?.status).toBe("pending");

      // The new link works on the same phone.
      await proveScorer(db, id, phoneA, newKey);
      await applyTournamentCommand(db, id, winFor(second, second.homeTeamId));
      expect((await matchDocsOf(ownerDb(), id)).find((m) => m.id === second.id)?.status).toBe("completed");
    });

    it("the spectator link shows the tournament to a signed-out reader while on, and cuts it off when turned off", async () => {
      const db = ownerDb();
      const created = await createTournament(db, owner, input("round_robin"));
      await applyTournamentCommand(db, created.id, { type: "start" });
      await setSpectatorEnabled(db, created.id, true);
      const reader = modularFirestore(env().unauthenticatedContext());

      const seen = await when<Tournament | null>(
        (onChange, onError) => subscribeToTournament(reader, created.id, onChange, onError),
        (tournament) => tournament !== null,
      );
      const matches = await when<Match[]>(
        (onChange, onError) => subscribeToTournamentMatches(reader, created.id, onChange, onError),
        (list) => list.length === 6,
      );
      expect(seen).toMatchObject({ id: created.id, name: "Tuesday night", status: "live" });
      expect(matches.every((m) => m.tournamentId === created.id)).toBe(true);

      const cutOff = new Promise<never>((_resolve, reject) => {
        const unsubscribe = subscribeToTournament(
          reader,
          created.id,
          () => {},
          (error) => {
            unsubscribe();
            reject(error);
          },
        );
      });
      await setSpectatorEnabled(db, created.id, false);
      await expect(cutOff).rejects.toMatchObject(REFUSED);
      expect((await tournamentDocOf(db, created.id)).revision).not.toBe(created.revision);
    });

    it("deleting a tournament removes its scorer key and every phone's proof with it", async () => {
      const { id } = await sharedWith([phoneA, phoneB], input("round_robin"));

      await deleteTournament(ownerDb(), id);

      await env().withSecurityRulesDisabled(async (unrestricted) => {
        const raw = modularFirestore(unrestricted);
        expect((await getDoc(doc(raw, "tournaments", id, "private", "scorerKey"))).exists()).toBe(false);
        expect((await getDocs(collection(raw, "tournaments", id, "scorers"))).size).toBe(0);
        expect((await getDoc(doc(raw, "tournaments", id))).exists()).toBe(false);
      });
    });
  });
});
