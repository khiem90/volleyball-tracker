// @vitest-environment node
import {
  collection,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  applyTournamentCommand,
  queueTournamentCommand,
  ReversedCommandError,
} from "@/lib/commandQueue";
import { EngineError } from "@/lib/engine";
import { addQuickMatch } from "@/lib/quickMatches";
import {
  proveScorer,
  regenerateScorerKey,
  setSpectatorEnabled,
  StaleScorerLinkError,
  subscribeToScorerKey,
} from "@/lib/sharing";
import {
  createTournament,
  deleteTournament,
  duplicateInput,
  renameTournament,
  subscribeToAccountMatches,
  subscribeToTournament,
  subscribeToTournamentMatches,
  subscribeToTournaments,
  type NewTournamentInput,
  type TournamentSnapshot,
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

/** The tournament and matches as a phone's screen shows them. */
const copyOf = async (db: Firestore, tournamentId: string): Promise<TournamentSnapshot> => ({
  tournament: await tournamentDocOf(db, tournamentId),
  matches: await matchDocsOf(db, tournamentId),
});

/** Watches `done`, so a test can ask whether the server had answered yet. */
const acknowledgement = (done: Promise<void>) => {
  let settled = false;
  const wait = done.then(() => {
    settled = true;
  });
  return { settled: () => settled, wait };
};

/**
 * A live subscription to a tournament's matches that stays open across
 * writes, so what a phone's own listener shows can be awaited step by step:
 * `until` resolves with the first snapshot from now on that satisfies `ready`.
 */
const watchMatches = (db: Firestore, tournamentId: string) => {
  let latest: Match[] | null = null;
  let waiting: { ready: (list: Match[]) => boolean; resolve: (list: Match[]) => void } | null = null;
  const unsubscribe = subscribeToTournamentMatches(db, tournamentId, (list) => {
    latest = list;
    if (waiting && waiting.ready(list)) {
      const { resolve } = waiting;
      waiting = null;
      resolve(list);
    }
  });
  return {
    until: (ready: (list: Match[]) => boolean): Promise<Match[]> =>
      new Promise((resolve, reject) => {
        if (latest && ready(latest)) return resolve(latest);
        waiting = { ready, resolve };
        setTimeout(() => {
          waiting = null;
          reject(new Error("subscription never reached the expected state"));
        }, 5000);
      }),
    stop: unsubscribe,
  };
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

    it("a write built on the pre-start copy cannot undo a result the engine just saved", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));
      const started = await applyTournamentCommand(db, created.id, { type: "start" });

      // Someone with the pre-start copy writes it back, naming the revision
      // they built on as every write does; the rules see it has moved on.
      await expect(
        setDoc(doc(db, "tournaments", created.id), {
          ...created,
          name: "Back to draft",
          basedOn: created.revision,
          revision: "a-revision-built-on-the-draft",
        }),
      ).rejects.toMatchObject({ code: "permission-denied" });

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
      expect({
        ...after,
        name: before.name,
        revision: before.revision,
        basedOn: before.basedOn,
        updatedAt: before.updatedAt,
      }).toEqual(before);
      expect(await matchDocsOf(db, created.id)).toEqual(matchesBefore);
    });

    it("every write that moves the revision says which revision it was built on", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));

      await applyTournamentCommand(db, created.id, { type: "start" });
      const started = await tournamentDocOf(db, created.id);
      expect(started.basedOn).toBe(created.revision);

      await renameTournament(db, created.id, "Wednesday night");
      const renamed = await tournamentDocOf(db, created.id);
      expect(renamed.basedOn).toBe(started.revision);

      await setSpectatorEnabled(db, created.id, true);
      const shared = await tournamentDocOf(db, created.id);
      expect(shared.basedOn).toBe(renamed.revision);

      const [match] = await matchDocsOf(db, created.id);
      await applyTournamentCommand(db, created.id, {
        type: "complete_match",
        matchId: match.id,
        homeScore: 25,
        awayScore: 20,
      });
      const played = await tournamentDocOf(db, created.id);
      expect(played.basedOn).toBe(shared.revision);
      expect(played.revision).not.toBe(shared.revision);
    });

    it("a rename racing a result loses neither", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));
      await applyTournamentCommand(db, created.id, { type: "start" });
      const [match] = await matchDocsOf(db, created.id);

      await Promise.all([
        applyTournamentCommand(db, created.id, {
          type: "complete_match",
          matchId: match.id,
          homeScore: 25,
          awayScore: 19,
        }),
        renameTournament(db, created.id, "Renamed mid-match"),
      ]);

      const stored = await tournamentDocOf(db, created.id);
      expect(stored.name).toBe("Renamed mid-match");
      expect(stored.status).toBe("live");
      expect((await matchDocsOf(db, created.id)).find((m) => m.id === match.id)).toMatchObject({
        status: "completed",
        winnerId: match.homeTeamId,
      });
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

  describe("every command through the queue", () => {
    it("a Start shows its first matches locally before the server has answered, and they land after", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"));
      const matches = watchMatches(db, created.id);

      const applied = await queueTournamentCommand(db, created.id, { type: "start" });
      const ack = acknowledgement(applied.done);

      expect(ack.settled()).toBe(false);
      expect(applied.outcome.tournament.status).toBe("live");
      expect(applied.outcome.createdMatchIds).toHaveLength(6);
      const shown = await matches.until((list) => list.length === 6);
      matches.stop();
      expect(shown.map((m) => m.id).sort()).toEqual([...applied.outcome.createdMatchIds].sort());

      await ack.wait;
      const stored = await tournamentDocOf(db, created.id);
      expect(stored.status).toBe("live");
      expect(stored.basedOn).toBe(created.revision);
      expect(await matchDocsOf(db, created.id)).toHaveLength(6);
    });

    it("an End completes the tournament locally before the server has answered, and the document follows", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, rotationInput("win2out"), { start: true });
      const live = await when<Tournament | null>(
        (onChange, onError) => subscribeToTournament(db, created.id, onChange, onError),
        (t) => t?.status === "live",
      );

      const applied = await queueTournamentCommand(db, created.id, { type: "end" });
      const ack = acknowledgement(applied.done);

      expect(ack.settled()).toBe(false);
      expect(applied.outcome.tournament.status).toBe("completed");
      const shown = await when<Tournament | null>(
        (onChange, onError) => subscribeToTournament(db, created.id, onChange, onError),
        (t) => t?.status === "completed",
      );
      expect(shown?.completedAt).toEqual(expect.any(Number));

      await ack.wait;
      const stored = await tournamentDocOf(db, created.id);
      expect(stored.status).toBe("completed");
      expect(stored.basedOn).toBe(live!.revision);
    });

    it("a correction shows the new score locally before the server has answered, and the match document follows", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(db, owner, input("round_robin"), { start: true });
      const matches = watchMatches(db, created.id);
      const [match] = await matches.until((list) => list.length === 6);
      await applyTournamentCommand(db, created.id, {
        type: "complete_match",
        matchId: match.id,
        homeScore: 25,
        awayScore: 20,
      });

      const applied = await queueTournamentCommand(db, created.id, {
        type: "correct_result",
        matchId: match.id,
        homeScore: 21,
        awayScore: 25,
      });
      const ack = acknowledgement(applied.done);

      expect(ack.settled()).toBe(false);
      const shown = await matches.until(
        (list) => list.find((m) => m.id === match.id)?.winnerId === match.awayTeamId,
      );
      matches.stop();
      expect(shown.find((m) => m.id === match.id)).toMatchObject({ homeScore: 21, awayScore: 25 });

      await ack.wait;
      expect((await matchDocsOf(db, created.id)).find((m) => m.id === match.id)).toMatchObject({
        status: "completed",
        homeScore: 21,
        awayScore: 25,
        winnerId: match.awayTeamId,
      });
    });

    it("two phones finishing matches on different courts from the scoring page both move on at once, and both results land", async () => {
      const ownerDb = modularFirestore(env().authenticatedContext(owner));
      const created = await createTournament(ownerDb, owner, rotationInput("win2out"), { start: true });
      const key = (
        await when<string | null>(
          (onChange, onError) => subscribeToScorerKey(ownerDb, created.id, onChange, onError),
          (k) => k !== null,
        )
      )!;
      const phones = ["phone-a-uid", "phone-b-uid"].map((uid) =>
        modularFirestore(env().authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } })),
      );
      await Promise.all([
        proveScorer(phones[0], created.id, "phone-a-uid", key),
        proveScorer(phones[1], created.id, "phone-b-uid", key),
      ]);
      const basis = await copyOf(ownerDb, created.id);
      const court1 = basis.matches.find((m) => m.court === 1)!;
      const court2 = basis.matches.find((m) => m.court === 2)!;

      // Each phone shows the same copy; each scoring page confirms a result and
      // leaves as soon as its own phone has applied it.
      const [onA, onB] = await Promise.all([
        queueTournamentCommand(
          phones[0],
          created.id,
          { type: "complete_match", matchId: court1.id, homeScore: 25, awayScore: 20 },
          { basis },
        ),
        queueTournamentCommand(
          phones[1],
          created.id,
          { type: "complete_match", matchId: court2.id, homeScore: 18, awayScore: 25 },
          { basis },
        ),
      ]);
      const acks = [acknowledgement(onA.done), acknowledgement(onB.done)];

      expect(acks.map((ack) => ack.settled())).toEqual([false, false]);
      expect(onA.outcome.matchWrites).toContainEqual(
        expect.objectContaining({ kind: "update", matchId: court1.id, changes: expect.objectContaining({ status: "completed" }) }),
      );
      expect(onB.outcome.matchWrites).toContainEqual(
        expect.objectContaining({ kind: "update", matchId: court2.id, changes: expect.objectContaining({ status: "completed" }) }),
      );

      await Promise.all(acks.map((ack) => ack.wait));
      const after = await matchDocsOf(ownerDb, created.id);
      expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
      expect(after.find((m) => m.id === court2.id)).toMatchObject({ status: "completed", winnerId: "t4" });
      expect(after.filter((m) => m.status === "pending").map((m) => m.court).sort()).toEqual([1, 2]);
      expect((await tournamentDocOf(ownerDb, created.id)).win2outState?.queue.sort()).toEqual(["t2", "t3"]);
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

    const winOn = (match: Match, winnerId: string) => ({
      type: "instant_win" as const,
      matchId: match.id,
      winnerId,
    });

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
      await expect(applyTournamentCommand(db, id, winFor(second, second.homeTeamId))).rejects.toBeInstanceOf(
        StaleScorerLinkError,
      );
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
    describe("the command queue", () => {
      it("the court moves on in the phone's own subscription before the server acknowledges the result", async () => {
        const db = modularFirestore(env().authenticatedContext(owner));
        const created = await createTournament(db, owner, rotationInput("win2out"), { start: true });
        const matches = watchMatches(db, created.id);
        const before = await matches.until((list) => list.length === 2);
        const court1 = before.find((m) => m.court === 1)!;

        let acknowledged = false;
        let acknowledgedWhenSeen: boolean | null = null;
        const applied = await queueTournamentCommand(db, created.id, {
          type: "instant_win",
          matchId: court1.id,
          winnerId: "t1",
        });
        const done = applied.done.then(() => {
          acknowledged = true;
        });
        const seen = await matches.until((list) => {
          if (list.length !== 3) return false;
          acknowledgedWhenSeen = acknowledged;
          return true;
        });
        matches.stop();

        expect(acknowledgedWhenSeen).toBe(false);
        expect(seen.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
        expect(seen.find((m) => m.id === applied.outcome.createdMatchIds[0])).toMatchObject({
          court: 1,
          homeTeamId: "t1",
          status: "pending",
        });
        await done;
        expect(await matchDocsOf(db, created.id)).toHaveLength(3);
      });

      it("two phones recording the same court end with one result, and the loser learns its court was already recorded", async () => {
        const { id } = await sharedWith([phoneA, phoneB], rotationInput("win2out"));
        const basis = await copyOf(ownerDb(), id);
        const court1 = basis.matches.find((m) => m.court === 1)!;

        // Both phones show the same copy and tap at the same moment.
        const settled = await Promise.allSettled([
          applyTournamentCommand(phoneDb(phoneA), id, winOn(court1, "t1"), { basis }),
          applyTournamentCommand(phoneDb(phoneB), id, winOn(court1, "t2"), { basis }),
        ]);

        expect(settled.map((s) => s.status).sort()).toEqual(["fulfilled", "rejected"]);
        const lost = settled.find((s) => s.status === "rejected") as PromiseRejectedResult;
        expect(lost.reason).toBeInstanceOf(ReversedCommandError);
        expect(lost.reason).toMatchObject({ court: 1, reversed: true });
        expect(lost.reason.cause).toBeInstanceOf(EngineError);
        const stoodFor = settled[0].status === "fulfilled" ? "t1" : "t2";
        const after = await matchDocsOf(ownerDb(), id);
        expect(after).toHaveLength(3);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: stoodFor });
        expect(after.filter((m) => m.court === 1 && m.status === "pending")).toHaveLength(1);
        expect(
          (await tournamentDocOf(ownerDb(), id)).win2outState?.courts.find((c) => c.courtNumber === 1)?.teamIds[0],
        ).toBe(stoodFor);
      });

      it("two phones tapping wins on different courts at the same moment both land, and neither is taken back", async () => {
        const { id } = await sharedWith([phoneA, phoneB], rotationInput("win2out"));
        const basis = await copyOf(ownerDb(), id);
        const court1 = basis.matches.find((m) => m.court === 1)!;
        const court2 = basis.matches.find((m) => m.court === 2)!;

        // Both phones show the same copy and tap at the same moment, each on its own court.
        const [onA, onB] = await Promise.all([
          queueTournamentCommand(phoneDb(phoneA), id, winOn(court1, "t1"), { basis }),
          queueTournamentCommand(phoneDb(phoneB), id, winOn(court2, "t4"), { basis }),
        ]);
        await Promise.all([onA.done, onB.done]);

        const after = await matchDocsOf(ownerDb(), id);
        expect(after).toHaveLength(4);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
        expect(after.find((m) => m.id === court2.id)).toMatchObject({ status: "completed", winnerId: "t4" });
        expect(after.filter((m) => m.status === "pending").map((m) => m.court).sort()).toEqual([1, 2]);
        const stored = await tournamentDocOf(ownerDb(), id);
        expect(stored.win2outState?.courts.map((c) => c.teamIds[0])).toEqual(["t1", "t4"]);
        expect(stored.win2outState?.queue.sort()).toEqual(["t2", "t3"]);
      });

      it("a result built on a stale copy is refused and lands on replay when its court is untouched", async () => {
        const { id } = await sharedWith([phoneA], rotationInput("win2out"));
        const stale = await copyOf(ownerDb(), id);
        const court1 = stale.matches.find((m) => m.court === 1)!;
        const court2 = stale.matches.find((m) => m.court === 2)!;
        await applyTournamentCommand(ownerDb(), id, winOn(court2, "t4"));

        // The phone has not seen court 2's result yet when it records court 1.
        await applyTournamentCommand(phoneDb(phoneA), id, winOn(court1, "t1"), { basis: stale });

        const after = await matchDocsOf(ownerDb(), id);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
        expect(after.find((m) => m.id === court2.id)).toMatchObject({ status: "completed", winnerId: "t4" });
        expect(after.filter((m) => m.status === "pending").map((m) => m.court).sort()).toEqual([1, 2]);
        expect((await tournamentDocOf(ownerDb(), id)).win2outState?.queue.sort()).toEqual(["t2", "t3"]);
      });

      it("two taps in a row on one phone are both built on the first's result, before the server has answered", async () => {
        const { id } = await sharedWith([phoneA], rotationInput("win2out"));
        const db = phoneDb(phoneA);
        const court1 = (await matchDocsOf(db, id)).find((m) => m.court === 1)!;

        // The first tap puts t1 against the first team in the queue; the
        // second is tapped on that match before the first has been answered.
        const first = await queueTournamentCommand(db, id, winOn(court1, "t1"));
        const next = first.outcome.createdMatchIds[0];
        const second = await queueTournamentCommand(db, id, { type: "instant_win", matchId: next, winnerId: "t5" });
        await Promise.all([first.done, second.done]);

        expect(second.outcome.tournament.basedOn).toBe(first.outcome.tournament.revision);
        const after = await matchDocsOf(ownerDb(), id);
        expect(after).toHaveLength(4);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
        expect(after.find((m) => m.id === next)).toMatchObject({
          status: "completed",
          homeTeamId: "t1",
          awayTeamId: "t5",
          winnerId: "t5",
        });
        expect(after.find((m) => m.id === second.outcome.createdMatchIds[0])).toMatchObject({
          court: 1,
          homeTeamId: "t5",
          awayTeamId: "t6",
          status: "pending",
        });
        expect((await tournamentDocOf(ownerDb(), id)).revision).toBe(second.outcome.tournament.revision);
      });

      it("a phone whose link the owner regenerated finds every result it has in flight failing with the stale-link error", async () => {
        const { id } = await sharedWith([phoneA], rotationInput("win2out"));
        const db = phoneDb(phoneA);
        const before = await matchDocsOf(db, id);
        const court1 = before.find((m) => m.court === 1)!;
        await applyTournamentCommand(db, id, winOn(before.find((m) => m.court === 2)!, "t3"));

        await regenerateScorerKey(ownerDb(), id);

        const first = await queueTournamentCommand(db, id, winOn(court1, "t1"));
        const second = await queueTournamentCommand(db, id, {
          type: "instant_win",
          matchId: first.outcome.createdMatchIds[0],
          winnerId: "t1",
        });
        await expect(first.done).rejects.toBeInstanceOf(StaleScorerLinkError);
        await expect(second.done).rejects.toBeInstanceOf(StaleScorerLinkError);

        const after = await matchDocsOf(ownerDb(), id);
        expect(after).toHaveLength(3);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "pending" });
      });

      it("a phone with no copy of the tournament is not told it is gone: its result waits for the server's copy and lands", async () => {
        const { id } = await sharedWith([phoneA], rotationInput("win2out"));
        const court1 = (await matchDocsOf(ownerDb(), id)).find((m) => m.court === 1)!;
        // This phone has never read the tournament, so its cache holds no
        // copy; while it has no signal, the cache is all its listeners can
        // answer from, and they answer that there is no such document.
        const db = phoneDb(phoneA);
        await disableNetwork(db);

        const applied = queueTournamentCommand(db, id, winOn(court1, "t1"));
        await enableNetwork(db);
        const win = await applied;
        await win.done;

        expect(win.outcome.tournament.basedOn).toBe((await copyOf(ownerDb(), id)).tournament.basedOn);
        const after = await matchDocsOf(ownerDb(), id);
        expect(after).toHaveLength(3);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
        expect(after.find((m) => m.id === win.outcome.createdMatchIds[0])).toMatchObject({ court: 1, status: "pending" });
      });

      it("after the engine refuses a command on an idle queue, the next command is built on the caller's copy, since the queue holds none", async () => {
        const { id } = await sharedWith([phoneA], rotationInput("win2out"));
        const db = phoneDb(phoneA);
        const matches = watchMatches(db, id);
        const before = await matches.until((list) => list.length === 2);
        const court1 = before.find((m) => m.court === 1)!;
        const court2 = before.find((m) => m.court === 2)!;

        // A tap for a team that is not on the court, with no copy passed in,
        // so the queue has to find one of its own before it can refuse it.
        await expect(queueTournamentCommand(db, id, winOn(court1, "t9"))).rejects.toBeInstanceOf(EngineError);

        // The owner records court 2, and this phone sees it land; the copy
        // its next tap is built on is the one from before.
        const stale = await copyOf(db, id);
        await applyTournamentCommand(ownerDb(), id, winOn(court2, "t4"));
        await matches.until((list) => list.find((m) => m.id === court2.id)?.status === "completed");
        matches.stop();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const win = await queueTournamentCommand(db, id, winOn(court1, "t1"), { basis: stale });
        await win.done;

        expect(win.outcome.tournament.basedOn).toBe(stale.tournament.revision);
        const after = await matchDocsOf(ownerDb(), id);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
        expect(after.find((m) => m.id === court2.id)).toMatchObject({ status: "completed", winnerId: "t4" });
        expect(after.filter((m) => m.status === "pending").map((m) => m.court).sort()).toEqual([1, 2]);
      });
    });

    describe("undo through the queue", () => {
      const undoOn = (match: Match) => ({ type: "undo_result" as const, matchId: match.id });

      it("a win followed at once by its undo goes back on the phone before the server answers, and lands as unplayed", async () => {
        const { id } = await sharedWith([phoneA], rotationInput("win2out"));
        const db = phoneDb(phoneA);
        const before = await copyOf(db, id);
        const court1 = before.matches.find((m) => m.court === 1)!;
        const matches = watchMatches(db, id);
        await matches.until((list) => list.length === 2);

        // The undo is tapped while the win is still on its way to the server.
        let acknowledged = false;
        let acknowledgedWhenBack: boolean | null = null;
        const win = await queueTournamentCommand(db, id, winOn(court1, "t1"));
        const winDone = win.done.then(() => {
          acknowledged = true;
        });
        const undo = await queueTournamentCommand(db, id, undoOn(court1));
        await matches.until((list) => {
          if (list.length !== 2 || list.find((m) => m.id === court1.id)?.status !== "pending") return false;
          acknowledgedWhenBack = acknowledged;
          return true;
        });
        matches.stop();
        await Promise.all([winDone, undo.done]);

        expect(acknowledgedWhenBack).toBe(false);
        expect(undo.outcome.tournament.basedOn).toBe(win.outcome.tournament.revision);
        const after = await matchDocsOf(ownerDb(), id);
        expect(after).toHaveLength(2);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({
          status: court1.status,
          homeScore: court1.homeScore,
          awayScore: court1.awayScore,
        });
        expect(after.find((m) => m.id === court1.id)?.winnerId).toBeUndefined();
        const stored = await tournamentDocOf(ownerDb(), id);
        expect(stored.revision).toBe(undo.outcome.tournament.revision);
        expect(stored.win2outState?.queue).toEqual(before.tournament.win2outState?.queue);
        expect(stored.win2outState?.courts).toEqual(before.tournament.win2outState?.courts);
      });

      it("a win that loses a race takes the undo queued behind it down with it, so the result that stood is not undone", async () => {
        const { id } = await sharedWith([phoneA, phoneB], rotationInput("win2out"));
        const stale = await copyOf(ownerDb(), id);
        const court1 = stale.matches.find((m) => m.court === 1)!;
        // Phone B's result reaches the server first. Phone A has not seen it
        // when it taps the other team, then taps Undo straight away.
        await applyTournamentCommand(phoneDb(phoneB), id, winOn(court1, "t2"));
        const db = phoneDb(phoneA);
        const win = await queueTournamentCommand(db, id, winOn(court1, "t1"), { basis: stale });
        const undo = await queueTournamentCommand(db, id, undoOn(court1));

        const [winDone, undoDone] = await Promise.allSettled([win.done, undo.done]);

        expect(winDone.status).toBe("rejected");
        expect((winDone as PromiseRejectedResult).reason).toBeInstanceOf(ReversedCommandError);
        expect((winDone as PromiseRejectedResult).reason).toMatchObject({ court: 1, reversed: true });
        expect(undoDone.status).toBe("rejected");
        expect((undoDone as PromiseRejectedResult).reason).toBeInstanceOf(ReversedCommandError);
        expect((undoDone as PromiseRejectedResult).reason).toMatchObject({ court: 1, reversed: true });
        const after = await matchDocsOf(ownerDb(), id);
        expect(after).toHaveLength(3);
        expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t2" });
        expect(after.filter((m) => m.court === 1 && m.status === "pending")).toHaveLength(1);
        expect(
          (await tournamentDocOf(ownerDb(), id)).win2outState?.courts.find((c) => c.courtNumber === 1)?.teamIds[0],
        ).toBe("t2");
      });
    });

    describe("offline results land in order", () => {
      const OFFLINE_TIMEOUT = 20_000;

      /** The tournament as a phone's own subscription shows it once `ready` holds. */
      const shownTournament = (db: Firestore, id: string, ready: (t: Tournament) => boolean) =>
        when<Tournament | null>(
          (onChange, onError) => subscribeToTournament(db, id, onChange, onError),
          (t) => t !== null && ready(t),
        );

      it(
        "a phone with no signal keeps recording across courts, and on reconnect its results land in tap order as it showed them",
        async () => {
          const { id } = await sharedWith([phoneA], rotationInput("win2out"));
          const db = phoneDb(phoneA);
          const before = await copyOf(db, id);
          const court1 = before.matches.find((m) => m.court === 1)!;
          const court2 = before.matches.find((m) => m.court === 2)!;
          const matches = watchMatches(db, id);
          await matches.until((list) => list.length === 2);

          let shownMatches: Match[];
          let shownCopy: Tournament | null;
          let acks: ReturnType<typeof acknowledgement>[];
          let wins: Awaited<ReturnType<typeof queueTournamentCommand>>[];
          try {
            await disableNetwork(db);

            // Court 1, court 2, then court 1 again on the match the first win put on.
            const first = await queueTournamentCommand(db, id, winOn(court1, "t1"), { basis: before });
            const second = await queueTournamentCommand(db, id, winOn(court2, "t3"));
            const third = await queueTournamentCommand(db, id, {
              type: "instant_win",
              matchId: first.outcome.createdMatchIds[0],
              winnerId: "t5",
            });
            wins = [first, second, third];
            acks = wins.map((win) => acknowledgement(win.done));

            shownMatches = await matches.until(
              (list) => list.length === 5 && list.filter((m) => m.status === "completed").length === 3,
            );
            shownCopy = await shownTournament(db, id, (t) => t.revision === third.outcome.tournament.revision);
            // A breath for any acknowledgement that could have slipped through.
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(acks.map((ack) => ack.settled())).toEqual([false, false, false]);
          } finally {
            matches.stop();
            await enableNetwork(db);
          }

          await Promise.all(acks.map((ack) => ack.wait));

          expect(wins[1].outcome.tournament.basedOn).toBe(wins[0].outcome.tournament.revision);
          expect(wins[2].outcome.tournament.basedOn).toBe(wins[1].outcome.tournament.revision);
          const after = await matchDocsOf(ownerDb(), id);
          expect(after).toHaveLength(5);
          expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t1" });
          expect(after.find((m) => m.id === court2.id)).toMatchObject({ status: "completed", winnerId: "t3" });
          expect(after.find((m) => m.id === wins[0].outcome.createdMatchIds[0])).toMatchObject({
            status: "completed",
            homeTeamId: "t1",
            awayTeamId: "t5",
            winnerId: "t5",
          });
          const byId = (list: Match[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
          expect(byId(after)).toEqual(byId(shownMatches));
          const stored = await tournamentDocOf(ownerDb(), id);
          expect(stored.revision).toBe(wins[2].outcome.tournament.revision);
          expect(stored.win2outState).toEqual(shownCopy!.win2outState);
          expect(stored.win2outState?.courts.map((c) => c.teamIds[0])).toEqual(["t5", "t3"]);
        },
        OFFLINE_TIMEOUT,
      );

      it(
        "a reconnecting phone's result on a court another phone recorded meanwhile is taken back, and its result on an untouched court lands",
        async () => {
          const { id } = await sharedWith([phoneA, phoneB], rotationInput("win2out"));
          const db = phoneDb(phoneA);
          const before = await copyOf(db, id);
          const court1 = before.matches.find((m) => m.court === 1)!;
          const court2 = before.matches.find((m) => m.court === 2)!;

          let onCourt1: Awaited<ReturnType<typeof queueTournamentCommand>>;
          let onCourt2: Awaited<ReturnType<typeof queueTournamentCommand>>;
          try {
            await disableNetwork(db);
            onCourt1 = await queueTournamentCommand(db, id, winOn(court1, "t1"), { basis: before });
            onCourt2 = await queueTournamentCommand(db, id, winOn(court2, "t4"));
            // Phone B records court 1 while A has no signal.
            await applyTournamentCommand(phoneDb(phoneB), id, winOn(court1, "t2"));
          } finally {
            await enableNetwork(db);
          }

          const [first, second] = await Promise.allSettled([onCourt1.done, onCourt2.done]);

          expect(first.status).toBe("rejected");
          expect((first as PromiseRejectedResult).reason).toBeInstanceOf(ReversedCommandError);
          expect((first as PromiseRejectedResult).reason).toMatchObject({ court: 1, reversed: true });
          expect((first as PromiseRejectedResult).reason.cause).toBeInstanceOf(EngineError);
          expect(second.status).toBe("fulfilled");
          const after = await matchDocsOf(ownerDb(), id);
          expect(after).toHaveLength(4);
          expect(after.find((m) => m.id === court1.id)).toMatchObject({ status: "completed", winnerId: "t2" });
          expect(after.find((m) => m.id === court2.id)).toMatchObject({ status: "completed", winnerId: "t4" });
          expect(after.filter((m) => m.status === "pending").map((m) => m.court).sort()).toEqual([1, 2]);
          const stored = await tournamentDocOf(ownerDb(), id);
          expect(stored.win2outState?.courts.map((c) => c.teamIds[0])).toEqual(["t2", "t4"]);
          expect(stored.win2outState?.queue.sort()).toEqual(["t1", "t3"]);
        },
        OFFLINE_TIMEOUT,
      );
    });
  });
});
