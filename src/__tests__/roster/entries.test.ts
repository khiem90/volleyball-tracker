import { describe, expect, it } from "vitest";
import { editMixedTeam, entryTeams, fanOutTeamChange, planTeamDeletion } from "@/lib/entries";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
  DEFAULT_TERMINOLOGY,
} from "@/types/competition-config";
import type { Entry, PersistentTeam, Tournament, TournamentStatus } from "@/types/game";

const aces: Entry = { teamId: "aces", name: "Aces", color: "#ef4444" };
const blockers: Entry = { teamId: "blockers", name: "Blockers", color: "#3b82f6" };
const chasers: Entry = { teamId: "chasers", name: "Chasers", color: "#22c55e" };

const tournament = (id: string, status: TournamentStatus, entries: Entry[]): Tournament => ({
  id,
  ownerId: "owner-uid",
  name: `Night ${id}`,
  format: "round_robin",
  status,
  entries,
  teamIds: entries.map((entry) => entry.teamId),
  settings: {
    courts: 1,
    seriesLength: 1,
    instantWin: false,
    pointsForWin: DEFAULT_POINTS_FOR_WIN,
    pointsForLoss: DEFAULT_POINTS_FOR_LOSS,
    terminology: DEFAULT_TERMINOLOGY,
  },
  spectatorEnabled: false,
  revision: "r0",
  createdAt: 1,
  updatedAt: 1,
});

describe("fanOutTeamChange", () => {
  it("renames the team's entry in a draft and a live tournament and leaves the other entries alone", () => {
    const draft = tournament("draft", "draft", [aces, blockers]);
    const live = tournament("live", "live", [blockers, aces, chasers]);

    const updates = fanOutTeamChange("aces", { name: "Ace Hitters" }, [draft, live]);

    expect(updates.map((update) => update.tournamentId)).toEqual(["draft", "live"]);
    expect(updates[0].entries).toEqual([{ ...aces, name: "Ace Hitters" }, blockers]);
    expect(updates[1].entries).toEqual([blockers, { ...aces, name: "Ace Hitters" }, chasers]);
  });

  it("leaves a completed tournament as it was", () => {
    const completed = tournament("completed", "completed", [aces, blockers]);

    expect(fanOutTeamChange("aces", { name: "Ace Hitters" }, [completed])).toEqual([]);
  });

  it("skips tournaments the team is not entered in", () => {
    const other = tournament("other", "live", [blockers, chasers]);

    expect(fanOutTeamChange("aces", { name: "Ace Hitters" }, [other])).toEqual([]);
  });

  it("recolors the entry when a color is given and keeps its color when none is", () => {
    const live = tournament("live", "live", [aces]);

    const recolored = fanOutTeamChange("aces", { name: "Aces", color: "#eab308" }, [live]);
    const renamedOnly = fanOutTeamChange("aces", { name: "Ace Hitters" }, [live]);

    expect(recolored[0].entries).toEqual([{ ...aces, color: "#eab308" }]);
    expect(renamedOnly[0].entries).toEqual([{ ...aces, name: "Ace Hitters" }]);
  });

  it("keeps a withdrawn mark on the entry it renames", () => {
    const withdrawn: Entry = { ...aces, withdrawnAt: 42 };
    const live = tournament("live", "live", [withdrawn, blockers]);

    const updates = fanOutTeamChange("aces", { name: "Ace Hitters" }, [live]);

    expect(updates[0].entries[0]).toEqual({ ...withdrawn, name: "Ace Hitters" });
  });

  it("reports nothing when the entry already matches", () => {
    const live = tournament("live", "live", [aces, blockers]);

    expect(fanOutTeamChange("aces", { name: "Aces", color: "#ef4444" }, [live])).toEqual([]);
  });
});

describe("planTeamDeletion", () => {
  it("blocks a team in a live tournament and names that tournament", () => {
    const live = tournament("live", "live", [aces, blockers]);
    const draft = tournament("draft", "draft", [aces, chasers]);

    const plan = planTeamDeletion(["aces"], [live, draft]);

    expect(plan.deletable).toEqual([]);
    expect(plan.kept).toEqual([{ teamId: "aces", tournaments: [live] }]);
    expect(plan.draftUpdates).toEqual([]);
  });

  it("removes a deletable team from every draft it is entered in", () => {
    const first = tournament("first", "draft", [aces, blockers]);
    const second = tournament("second", "draft", [chasers, aces]);
    const untouched = tournament("untouched", "draft", [blockers, chasers]);

    const plan = planTeamDeletion(["aces"], [first, second, untouched]);

    expect(plan.deletable).toEqual(["aces"]);
    expect(plan.kept).toEqual([]);
    expect(plan.draftUpdates).toEqual([
      { tournamentId: "first", entries: [blockers], teamIds: ["blockers"] },
      { tournamentId: "second", entries: [chasers], teamIds: ["chasers"] },
    ]);
  });

  it("lets a team go that only appears in completed tournaments, and leaves those alone", () => {
    const completed = tournament("completed", "completed", [aces, blockers]);

    const plan = planTeamDeletion(["aces"], [completed]);

    expect(plan.deletable).toEqual(["aces"]);
    expect(plan.draftUpdates).toEqual([]);
  });

  it("deletes what it can from a selection and keeps the rest in their drafts", () => {
    const live = tournament("live", "live", [aces, blockers]);
    const draft = tournament("draft", "draft", [aces, blockers, chasers]);

    const plan = planTeamDeletion(["aces", "blockers", "chasers"], [live, draft]);

    expect(plan.deletable).toEqual(["chasers"]);
    expect(plan.kept).toEqual([
      { teamId: "aces", tournaments: [live] },
      { teamId: "blockers", tournaments: [live] },
    ]);
    expect(plan.draftUpdates).toEqual([
      { tournamentId: "draft", entries: [aces, blockers], teamIds: ["aces", "blockers"] },
    ]);
  });
});

/** Two mixed teams. No roster team has either id. */
const sharks: Entry = {
  teamId: "mixed-sharks",
  name: "Sharks",
  color: "#f97316",
  players: ["Ana", "Ben"],
};
const teamTwo: Entry = { teamId: "mixed-two", name: "Team 2", color: "#eab308", players: ["Cy"] };

describe("entryTeams", () => {
  /** The roster after Aces was renamed and recolored. */
  const roster: PersistentTeam[] = [
    { id: "aces", name: "Ace Hitters", color: "#8b5cf6", createdAt: 7 },
    { id: "blockers", name: "Blockers", color: "#3b82f6", createdAt: 8 },
  ];

  it.each<TournamentStatus>(["draft", "live", "completed"])(
    "shows a mixed team from its own entry while the tournament is %s",
    (status) => {
      const teams = entryTeams(tournament("night", status, [aces, sharks, teamTwo]), roster);

      expect(teams.slice(1)).toEqual([
        { id: "mixed-sharks", name: "Sharks", color: "#f97316", createdAt: 1 },
        { id: "mixed-two", name: "Team 2", color: "#eab308", createdAt: 1 },
      ]);
    },
  );

  it("shows a mixed team to someone with no roster at all, such as a spectator", () => {
    const teams = entryTeams(tournament("night", "live", [sharks]), []);

    expect(teams).toEqual([{ id: "mixed-sharks", name: "Sharks", color: "#f97316", createdAt: 1 }]);
  });

  it("shows a roster team beside it by the roster's name while live and by the entry's once completed", () => {
    const live = entryTeams(tournament("night", "live", [aces, sharks]), roster);
    const completed = entryTeams(tournament("night", "completed", [aces, sharks]), roster);

    expect(live[0]).toMatchObject({ name: "Ace Hitters", color: "#8b5cf6" });
    expect(completed[0]).toMatchObject({ name: "Aces", color: "#ef4444" });
  });
});

describe("a roster change in a tournament with mixed teams", () => {
  it("renames the roster team's entry and passes over the mixed teams", () => {
    const live = tournament("live", "live", [sharks, aces, teamTwo]);

    const [update] = fanOutTeamChange("aces", { name: "Ace Hitters" }, [live]);

    expect(update.entries).toEqual([sharks, { ...aces, name: "Ace Hitters" }, teamTwo]);
    expect(update.teamIds).toEqual(["mixed-sharks", "aces", "mixed-two"]);
  });

  it("recolors the roster team's entry and passes over the mixed teams", () => {
    const draft = tournament("draft", "draft", [aces, sharks]);

    const [update] = fanOutTeamChange("aces", { name: "Aces", color: "#f97316" }, [draft]);

    expect(update.entries).toEqual([{ ...aces, color: "#f97316" }, sharks]);
  });

  it("reaches no tournament that holds only mixed teams", () => {
    const live = tournament("live", "live", [sharks, teamTwo]);

    expect(fanOutTeamChange("aces", { name: "Sharks" }, [live])).toEqual([]);
  });

  it("deletes the roster team from a draft and keeps the mixed teams with their players", () => {
    const draft = tournament("draft", "draft", [sharks, aces, teamTwo]);

    const plan = planTeamDeletion(["aces"], [draft]);

    expect(plan.deletable).toEqual(["aces"]);
    expect(plan.draftUpdates).toEqual([
      {
        tournamentId: "draft",
        entries: [sharks, teamTwo],
        teamIds: ["mixed-sharks", "mixed-two"],
      },
    ]);
  });

  it("lets a roster team go when the only live tournament holds mixed teams", () => {
    const live = tournament("live", "live", [sharks, teamTwo]);

    const plan = planTeamDeletion(["aces"], [live]);

    expect(plan).toEqual({ deletable: ["aces"], kept: [], draftUpdates: [] });
  });
});

describe("editMixedTeam", () => {
  /** A withdrawn mixed team between a roster team and another mixed team. */
  const withdrawnSharks: Entry = { ...sharks, withdrawnAt: 5 };
  const entries = [aces, withdrawnSharks, teamTwo];

  describe("rename", () => {
    it("renames the mixed team, trimmed, and leaves its color, players, and withdrawal alone", () => {
      const edited = editMixedTeam(entries, {
        kind: "rename",
        teamId: "mixed-sharks",
        name: "  Net Ninjas ",
      });

      expect(edited).toEqual([aces, { ...withdrawnSharks, name: "Net Ninjas" }, teamTwo]);
    });

    it("refuses an empty team name", () => {
      expect(() => editMixedTeam(entries, { kind: "rename", teamId: "mixed-two", name: "   " })).toThrow(
        "A team needs a name.",
      );
    });

    it("refuses a roster team, which is renamed on the roster", () => {
      expect(() => editMixedTeam(entries, { kind: "rename", teamId: "aces", name: "Ace Hitters" })).toThrow(
        "Only a mixed team can be edited here.",
      );
    });

    it("refuses a team the tournament does not have", () => {
      expect(() => editMixedTeam(entries, { kind: "rename", teamId: "gone", name: "Ghosts" })).toThrow(
        "Only a mixed team can be edited here.",
      );
    });
  });

  describe("add a player", () => {
    it("adds the player, trimmed, to the end of the team", () => {
      const edited = editMixedTeam(entries, {
        kind: "add_player",
        teamId: "mixed-two",
        name: " Late Lou  ",
      });

      expect(edited).toEqual([aces, withdrawnSharks, { ...teamTwo, players: ["Cy", "Late Lou"] }]);
    });

    it("takes a second player under a name the team already has", () => {
      const edited = editMixedTeam(entries, { kind: "add_player", teamId: "mixed-two", name: "Cy" });

      expect(edited[2].players).toEqual(["Cy", "Cy"]);
    });

    it("refuses an empty player name", () => {
      expect(() => editMixedTeam(entries, { kind: "add_player", teamId: "mixed-two", name: " " })).toThrow(
        "A player needs a name.",
      );
    });

    it("refuses a roster team, which has no players", () => {
      expect(() => editMixedTeam(entries, { kind: "add_player", teamId: "aces", name: "Ana" })).toThrow(
        "Only a mixed team can be edited here.",
      );
    });
  });

  describe("remove a player", () => {
    it("removes the player and keeps the others in order", () => {
      const edited = editMixedTeam(entries, {
        kind: "remove_player",
        teamId: "mixed-sharks",
        player: { name: "Ana", index: 0 },
      });

      expect(edited).toEqual([aces, { ...withdrawnSharks, players: ["Ben"] }, teamTwo]);
    });

    it("keeps the team as a mixed team when its last player goes", () => {
      const edited = editMixedTeam(entries, {
        kind: "remove_player",
        teamId: "mixed-two",
        player: { name: "Cy", index: 0 },
      });

      expect(edited[2]).toEqual({ ...teamTwo, players: [] });
    });

    it("removes the one pointed at when two players share a name", () => {
      const twins = [{ ...sharks, players: ["Sam", "Ana", "Sam"] }];

      const edited = editMixedTeam(twins, {
        kind: "remove_player",
        teamId: "mixed-sharks",
        player: { name: "Sam", index: 2 },
      });

      expect(edited[0].players).toEqual(["Sam", "Ana"]);
    });

    it("finds the player by name when the team changed since the owner looked", () => {
      // Ben was second on the owner's screen. Ana has since been removed.
      const since = [{ ...sharks, players: ["Ben"] }];

      const edited = editMixedTeam(since, {
        kind: "remove_player",
        teamId: "mixed-sharks",
        player: { name: "Ben", index: 1 },
      });

      expect(edited[0].players).toEqual([]);
    });

    it("refuses a player the team no longer has", () => {
      expect(() =>
        editMixedTeam(entries, {
          kind: "remove_player",
          teamId: "mixed-sharks",
          player: { name: "Zed", index: 0 },
        }),
      ).toThrow("That player is no longer on the team.");
    });
  });

  describe("move a player", () => {
    it("moves the player to the end of the other mixed team", () => {
      const edited = editMixedTeam(entries, {
        kind: "move_player",
        teamId: "mixed-sharks",
        player: { name: "Ana", index: 0 },
        toTeamId: "mixed-two",
      });

      expect(edited).toEqual([
        aces,
        { ...withdrawnSharks, players: ["Ben"] },
        { ...teamTwo, players: ["Cy", "Ana"] },
      ]);
    });

    it("leaves the team in with nobody on it when its only player moves", () => {
      const edited = editMixedTeam(entries, {
        kind: "move_player",
        teamId: "mixed-two",
        player: { name: "Cy", index: 0 },
        toTeamId: "mixed-sharks",
      });

      expect(edited.map((entry) => entry.players)).toEqual([undefined, ["Ana", "Ben", "Cy"], []]);
    });

    it("changes nothing when the player is moved to the team they are on", () => {
      const edited = editMixedTeam(entries, {
        kind: "move_player",
        teamId: "mixed-sharks",
        player: { name: "Ben", index: 1 },
        toTeamId: "mixed-sharks",
      });

      expect(edited).toEqual(entries);
    });

    it("refuses a move to a roster team", () => {
      expect(() =>
        editMixedTeam(entries, {
          kind: "move_player",
          teamId: "mixed-sharks",
          player: { name: "Ana", index: 0 },
          toTeamId: "aces",
        }),
      ).toThrow("Only a mixed team can be edited here.");
    });

    it("refuses a player the team no longer has", () => {
      expect(() =>
        editMixedTeam(entries, {
          kind: "move_player",
          teamId: "mixed-two",
          player: { name: "Ana", index: 0 },
          toTeamId: "mixed-sharks",
        }),
      ).toThrow("That player is no longer on the team.");
    });
  });

  it("returns new entries and leaves the ones it was given as they were", () => {
    const before = structuredClone(entries);

    editMixedTeam(entries, { kind: "add_player", teamId: "mixed-two", name: "Lou" });

    expect(entries).toEqual(before);
  });
});
