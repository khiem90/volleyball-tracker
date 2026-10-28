import { describe, expect, it } from "vitest";
import {
  emptySetup,
  firstProblem,
  setupInput,
  setupProblems,
  type TournamentSetup,
} from "@/lib/creation";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { PersistentTeam } from "@/types/game";

const roster: PersistentTeam[] = [
  { id: "t1", name: "Aces", color: "#ef4444", createdAt: 1 },
  { id: "t2", name: "Blockers", color: "#3b82f6", createdAt: 2 },
  { id: "t3", name: "Chasers", color: "#22c55e", createdAt: 3 },
  { id: "t4", name: "Diggers", color: "#f59e0b", createdAt: 4 },
];

const setup = (changes: Partial<TournamentSetup>): TournamentSetup => ({
  ...emptySetup(),
  ...changes,
});

describe("setupProblems on the untouched page", () => {
  it("asks for a name and a format", () => {
    expect(setupProblems(emptySetup(), roster)).toEqual({
      name: "Give the tournament a name.",
      format: "Pick a format.",
    });
  });
});

describe("setupProblems and the teams", () => {
  it("says how many teams the format needs when too few are ticked", () => {
    const problems = setupProblems(
      setup({ name: "Tuesday night", format: "round_robin", teamIds: ["t1", "t2"] }),
      roster,
    );

    expect(problems).toEqual({ teams: "Round Robin needs at least 3 teams." });
  });

  it("needs two teams per court for a rotation format, in the tournament's own word for a court", () => {
    const base = { name: "Rotation night", format: "win2out" as const, teamIds: ["t1", "t2", "t3"] };

    expect(setupProblems(setup({ ...base, courts: 2 }), roster)).toEqual({
      teams: "Win 2 & Out on 2 courts needs at least 4 teams.",
    });
    expect(setupProblems(setup({ ...base, courts: 2, courtWord: "field" }), roster)).toEqual({
      teams: "Win 2 & Out on 2 fields needs at least 4 teams.",
    });
    expect(setupProblems(setup({ ...base, courts: 1 }), roster)).toEqual({});
  });

  it("does not count a ticked team that has since left the roster", () => {
    const problems = setupProblems(
      setup({ name: "Tuesday night", format: "round_robin", teamIds: ["t1", "t2", "gone"] }),
      roster,
    );

    expect(problems).toEqual({ teams: "Round Robin needs at least 3 teams." });
  });
});

describe("setupProblems and the RSVP section", () => {
  const ready = { name: "Friday night", format: "round_robin" as const, teamIds: ["t1", "t2", "t3"] };
  const friday7pm = Date.UTC(2026, 10, 7, 0, 0);
  const thursday6pm = Date.UTC(2026, 10, 5, 23, 0);

  it("asks for both times before the RSVP link can go on", () => {
    expect(setupProblems(setup({ ...ready, rsvpEnabled: true }), roster)).toEqual({
      scheduledAt: "Set the scheduled time before turning the RSVP link on.",
      opensAt: "Set when RSVPs open before turning the RSVP link on.",
    });
  });

  it("refuses an open time after the scheduled time and a capacity below one", () => {
    const problems = setupProblems(
      setup({ ...ready, scheduledAt: thursday6pm, opensAt: friday7pm, capacity: 0 }),
      roster,
    );

    expect(problems).toEqual({
      opensAt: "RSVPs must open before the scheduled time.",
      capacity: "Capacity must be at least 1.",
    });
    expect(firstProblem(problems)).toBe("RSVPs must open before the scheduled time.");
  });

  it("puts the RSVP problems after the name, format, and teams", () => {
    const problems = setupProblems(setup({ rsvpEnabled: true, capacity: 0 }), roster);

    expect(firstProblem(problems)).toBe("Pick a format.");
    expect(
      firstProblem(setupProblems(setup({ ...ready, rsvpEnabled: true, capacity: 0 }), roster)),
    ).toBe("Set the scheduled time before turning the RSVP link on.");
  });

  it("finds nothing wrong with the section left as the page opens", () => {
    expect(setupProblems(setup(ready), roster)).toEqual({});
  });
});

describe("setupInput", () => {
  it("carries the scheduled time with the owner's zone, and the RSVP settings", () => {
    const friday7pm = Date.UTC(2026, 10, 7, 0, 0);
    const thursday6pm = Date.UTC(2026, 10, 5, 23, 0);
    const input = setupInput(
      setup({
        name: "Friday night",
        format: "round_robin",
        teamIds: ["t1", "t2", "t3"],
        zone: "America/New_York",
        rsvpEnabled: true,
        capacity: 16,
        scheduledAt: friday7pm,
        opensAt: thursday6pm,
      }),
      roster,
    );

    expect(input.scheduledAt).toBe(friday7pm);
    expect(input.scheduledZone).toBe("America/New_York");
    expect(input.rsvp).toEqual({
      enabled: true,
      capacity: 16,
      opensAt: thursday6pm,
      closed: false,
    });
  });

  it("keeps the times of a night whose RSVP link stays off, and adds nothing when the section is untouched", () => {
    const friday7pm = Date.UTC(2026, 10, 7, 0, 0);
    const ready = { name: "Friday night", format: "round_robin" as const, teamIds: ["t1", "t2", "t3"] };

    const scheduledOnly = setupInput(setup({ ...ready, scheduledAt: friday7pm }), roster);
    expect(scheduledOnly.scheduledAt).toBe(friday7pm);
    expect(scheduledOnly.rsvp).toBeUndefined();

    const withOpenTime = setupInput(
      setup({ ...ready, scheduledAt: friday7pm, opensAt: friday7pm - 3_600_000, capacity: 8 }),
      roster,
    );
    expect(withOpenTime.rsvp).toEqual({
      enabled: false,
      capacity: 8,
      opensAt: friday7pm - 3_600_000,
      closed: false,
    });

    const untouched = setupInput(setup(ready), roster);
    expect(untouched).not.toHaveProperty("scheduledAt");
    expect(untouched).not.toHaveProperty("scheduledZone");
    expect(untouched).not.toHaveProperty("rsvp");
  });

  it("enters the ticked teams in tick order with the trimmed name", () => {
    const input = setupInput(
      setup({
        name: "  Rotation night ",
        format: "two_match_rotation",
        teamIds: ["t3", "t1", "t4", "t2"],
      }),
      roster,
    );

    expect(input.name).toBe("Rotation night");
    expect(input.format).toBe("two_match_rotation");
    expect(input.teams).toEqual([roster[2], roster[0], roster[3], roster[1]]);
  });

  it("keeps only the settings the format uses", () => {
    const rotation = setupInput(
      setup({
        name: "Rotation night",
        format: "two_match_rotation",
        teamIds: ["t1", "t2", "t3", "t4"],
        courts: 2,
        seriesLength: 5,
        instantWin: true,
        pointsForWin: 2,
        pointsForLoss: 1,
        courtWord: " Field ",
      }),
      roster,
    );

    expect(rotation.settings).toEqual({
      courts: 2,
      seriesLength: 1,
      instantWin: true,
      pointsForWin: 3,
      pointsForLoss: 0,
      terminology: { ...DEFAULT_TERMINOLOGY, venue: "field", venuePlural: "fields" },
    });

    const league = setupInput(
      setup({
        name: "League",
        format: "round_robin",
        teamIds: ["t1", "t2", "t3"],
        courts: 3,
        seriesLength: 3,
        instantWin: true,
        pointsForWin: 2,
        pointsForLoss: 1,
        courtWord: "",
      }),
      roster,
    );

    expect(league.settings).toEqual({
      courts: 1,
      seriesLength: 3,
      instantWin: true,
      pointsForWin: 2,
      pointsForLoss: 1,
      terminology: DEFAULT_TERMINOLOGY,
    });
  });

  it("gives the court word its plural, so a pitch has pitches", () => {
    const input = setupInput(
      setup({ name: "Cup", format: "single_elimination", teamIds: ["t1", "t2"], courtWord: "Pitch" }),
      roster,
    );

    expect(input.settings.terminology).toEqual({
      ...DEFAULT_TERMINOLOGY,
      venue: "pitch",
      venuePlural: "pitches",
    });
  });

  it("refuses a setup that still has a problem, naming it", () => {
    expect(() =>
      setupInput(setup({ name: "Tuesday night", format: "round_robin", teamIds: ["t1"] }), roster),
    ).toThrow("Round Robin needs at least 3 teams.");
    expect(() => setupInput(setup({ teamIds: ["t1", "t2", "t3"] }), roster)).toThrow(
      "Pick a format.",
    );
  });
});
