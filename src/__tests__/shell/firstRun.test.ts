import { describe, expect, it } from "vitest";
import { buildDashboard } from "@/components/matchbook/useMatchbookDashboard";
import { mbClosingSpan, mbContentsFor } from "@/components/matchbook/panels";
import type { AppState, Competition, Match, PersistentTeam } from "@/types/game";

/* ===========================================================================
   THE FIRST THIRTY SECONDS, AS A TEST

   Two defects on the Overview survived the whole programme because every
   critic before the last one judged the screen against a full fixture:

     G1  a brand-new account rendered EIGHT stacked "No X exists yet" panels
         over 2540px, five of them display headlines of identical size.
     G2  the loudest control on that screen read RECORD RESULT, on an account
         with zero teams and zero matches.

   Both were fixed, and neither was covered. This file covers them, because the
   thing that makes them regress is not a refactor of the composition — it is
   somebody adding a ninth panel, or an early return, and never opening the app
   on an empty account to see it.

   The stages below are the real progression, in order, and they are the same
   seven states the fix was measured against in the running app.
   =========================================================================== */

const T0 = 1_784_116_800_000;

const team = (id: string, name: string): PersistentTeam => ({
  id,
  name,
  color: "#e2553d",
  createdAt: T0,
});

const A = team("team-a", "Surge");
const B = team("team-b", "Tide");

const competition = (matchIds: string[]): Competition => ({
  id: "comp-x",
  name: "Friday Night",
  type: "round_robin",
  teamIds: [A.id, B.id],
  matchIds,
  status: "in_progress",
  createdAt: T0 + 1_000,
  config: {
    pointsForWin: 3,
    pointsForLoss: 0,
    allowTies: false,
    terminology: {
      venue: "court",
      venuePlural: "courts",
      match: "match",
      matchPlural: "matches",
    },
  },
});

const match = (over: Partial<Match> = {}): Match => ({
  id: "m-1",
  competitionId: "comp-x",
  homeTeamId: A.id,
  awayTeamId: B.id,
  homeScore: 0,
  awayScore: 0,
  status: "pending",
  round: 1,
  position: 1,
  createdAt: T0 + 2_000,
  ...over,
});

const state = (over: Partial<AppState> = {}): AppState => ({
  teams: [],
  competitions: [],
  matches: [],
  ...over,
});

/* --------------------------------------------------------------------------
   G2 — THE PRIMARY ACTION MUST BE PERFORMABLE

   Every one of these states was reachable on the shipped build and every one
   of them printed "Record Result". The label is asserted rather than merely
   the href, because the label is the defect: a button that reads RECORD RESULT
   is wrong on an empty account even if it happens to navigate somewhere real.
   -------------------------------------------------------------------------- */

describe("the masthead action tracks what the data allows", () => {
  const stages: [string, AppState, string, string][] = [
    ["nothing at all", state(), "Add Your First Team", "/teams"],
    ["one team", state({ teams: [A] }), "Add Another Team", "/teams"],
    [
      "two teams, no competition",
      state({ teams: [A, B] }),
      "Create a Competition",
      "/competitions/new",
    ],
    [
      "a competition with no schedule",
      state({ teams: [A, B], competitions: [competition([])] }),
      "Open the Competition",
      "/competitions/comp-x",
    ],
    [
      "a schedule, nothing played",
      state({
        teams: [A, B],
        competitions: [competition(["m-1"])],
        matches: [match()],
      }),
      "Start the First Match",
      "/competitions/comp-x",
    ],
    [
      "a match in progress",
      state({
        teams: [A, B],
        competitions: [competition(["m-1"])],
        matches: [match({ status: "in_progress", homeScore: 12, awayScore: 9 })],
      }),
      "Record Result",
      "/competitions",
    ],
    [
      "a match completed",
      state({
        teams: [A, B],
        competitions: [competition(["m-1"])],
        matches: [
          match({
            status: "completed",
            homeScore: 25,
            awayScore: 19,
            winnerId: A.id,
            completedAt: T0 + 9_000,
          }),
        ],
      }),
      "Record Result",
      "/competitions",
    ],
  ];

  for (const [name, appState, label, href] of stages) {
    it(`offers "${label}" with ${name}`, () => {
      const view = buildDashboard(appState);
      expect(view.primaryAction.label).toBe(label);
      expect(view.primaryAction.href).toBe(href);
    });
  }

  it("never offers Record Result before a match exists in any state", () => {
    for (const [, appState, label] of stages) {
      const view = buildDashboard(appState);
      if (appState.matches.some((m) => m.status !== "pending")) continue;
      expect(view.primaryAction.label).not.toBe("Record Result");
      expect(label).not.toBe("Record Result");
    }
  });
});

/* --------------------------------------------------------------------------
   G1 — THE SCREEN MUST NOT STACK EQUAL-WEIGHT EMPTY HEADLINES

   `isFirstRun` covers the five states before a match is played. The two after
   it are covered by the collapse, and those are the ones that regressed once
   already: keying the first-run composition on results rather than on matches
   fixed `matches.length === 1` and left `status === "in_progress"` sitting on
   five headlines.
   -------------------------------------------------------------------------- */

describe("no state stacks more than one empty headline", () => {
  it("renders the first-run composition until something is played", () => {
    expect(buildDashboard(state()).isFirstRun).toBe(true);
    expect(
      buildDashboard(
        state({
          teams: [A, B],
          competitions: [competition(["m-1"])],
          matches: [match()],
        })
      ).isFirstRun
    ).toBe(true);
  });

  it("leaves the first run the instant a match is live, and collapses instead", () => {
    const view = buildDashboard(
      state({
        teams: [A, B],
        competitions: [competition(["m-1"])],
        matches: [match({ status: "in_progress", homeScore: 12, awayScore: 9 })],
      })
    );
    expect(view.isFirstRun).toBe(false);
    /* The five panels that measured 2527px and five headlines in the app. */
    expect(view.muteSections).toEqual([
      "featured",
      "schedule",
      "bracket",
      "results",
      "leaders",
    ]);
    /* Two or more is what arms the collapse, so this state is covered. */
    expect(view.muteSections.length).toBeGreaterThanOrEqual(2);
  });

  it("still collapses once the first result is in", () => {
    const view = buildDashboard(
      state({
        teams: [A, B],
        competitions: [competition(["m-1"])],
        matches: [
          match({
            status: "completed",
            homeScore: 25,
            awayScore: 19,
            winnerId: A.id,
            completedAt: T0 + 9_000,
          }),
        ],
      })
    );
    expect(view.muteSections).toEqual(["live", "schedule", "bracket"]);
  });

  it("names every withheld panel in the index, and nothing else", () => {
    const view = buildDashboard(
      state({
        teams: [A, B],
        competitions: [competition(["m-1"])],
        matches: [match({ status: "in_progress" })],
      })
    );
    const rows = mbContentsFor(view.muteSections);
    expect(rows).toHaveLength(view.muteSections.length);
    expect(rows.map((r) => r.term)).toEqual([
      "Match of the Day",
      "Upcoming Schedule",
      "Championship Bracket",
      "Recent Results",
      "Team Leaders",
    ]);
    /* A promise with no sentence explaining it is a headline again. */
    for (const row of rows) expect(row.gloss.length).toBeGreaterThan(0);
  });

  it("withholds nothing on a populated account", () => {
    const played = (id: string, home: string, away: string, at: number): Match =>
      match({
        id,
        homeTeamId: home,
        awayTeamId: away,
        status: "completed",
        homeScore: 25,
        awayScore: 19,
        winnerId: home,
        completedAt: at,
      });
    const teams = [A, B, team("team-c", "Storm"), team("team-d", "Apex")];
    const view = buildDashboard(
      state({
        teams,
        competitions: [
          {
            ...competition(["m-1", "m-2", "m-3", "m-4"]),
            teamIds: teams.map((t) => t.id),
          },
        ],
        matches: [
          played("m-1", "team-a", "team-b", T0 + 10),
          played("m-2", "team-c", "team-d", T0 + 20),
          played("m-3", "team-a", "team-c", T0 + 30),
          match({ id: "m-4", homeTeamId: "team-b", awayTeamId: "team-d" }),
          match({ id: "m-5", homeTeamId: "team-a", awayTeamId: "team-d", status: "in_progress" }),
        ],
      })
    );
    expect(view.isFirstRun).toBe(false);
    expect(view.muteSections).toEqual([]);
  });
});

/* --------------------------------------------------------------------------
   THE INDEX MUST CLOSE THE ROW IT LANDS IN

   Withholding panels breaks a tiling that was exact only by arithmetic. Every
   case below was confirmed against the running app by measuring each grid
   row's trailing gap at 1440 — all zero.
   -------------------------------------------------------------------------- */

describe("mbClosingSpan closes the last row of a 12-column grid", () => {
  it("gives the index a full row when the last one is already flush", () => {
    expect(mbClosingSpan([7, 5])).toBe(12);
    expect(mbClosingSpan([8, 4])).toBe(12);
    expect(mbClosingSpan([4, 4, 4])).toBe(12);
    expect(mbClosingSpan([])).toBe(12);
  });

  it("fills the remainder when one is worth filling", () => {
    // Overview, first match live: standings widened to 8, live 4, readiness 4.
    expect(mbClosingSpan([8, 4, 4])).toBe(8);
    // Event console, schedule generated: 7+5, 8+4, then details alone.
    expect(mbClosingSpan([7, 5, 8, 4, 4])).toBe(8);
  });

  it("takes a row of its own rather than a sliver", () => {
    // 7+4 leaves one column — too narrow for a panel, so the index drops down.
    expect(mbClosingSpan([7, 4])).toBe(12);
    expect(mbClosingSpan([5, 5])).toBe(12);
  });

  it("never returns a span that cannot exist in the grid", () => {
    const widths = [4, 5, 7, 8];
    for (const a of widths)
      for (const b of widths)
        for (const c of widths) {
          const span = mbClosingSpan([a, b, c]);
          expect(span).toBeGreaterThanOrEqual(4);
          expect(span).toBeLessThanOrEqual(12);
        }
  });
});
