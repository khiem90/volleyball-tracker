import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ComponentType, ReactElement, ReactNode } from "react";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { MB_ROUTE_SKELETON, type MbSkeletonRouteSpec } from "@/components/matchbook/Loading";
import type { AppState, Competition, Match, PersistentTeam } from "@/types/game";
import type { SessionSummary } from "@/types/session";
import type { UserFormation } from "@/lib/volleyball/types";

/* ===========================================================================
   THE ZERO STATE, AS A NUMBER

   Three rounds have now each fixed the empty-account cliff on the routes their
   brief named and left it standing on every route it did not. The defect did
   not shrink between rounds; it MOVED, and grew:

     round 1   "eight stacked empty headlines on /"
     round 2   "/ and /competitions fixed; five headlines one tap away on
               /teams — reached by the very button the fix installed"
     round 3   fifteen headlines across five screens

   Measured in the browser, empty account, 390x844, counting the display lines
   an empty panel prints ("No teams exist yet", "No form exists yet", ...):

       route            document height    empty headlines
       /                        1117px         0   fixed in round 2
       /competitions             960px         1   fixed in round 2
       /teams                   1543px         5
       /summaries               1600px         6
       /quick-match             1195px         2
       /tools                   1798px         1

   It keeps coming back because NOTHING MEASURES IT. Every round's fix was
   verified by opening the two routes the brief named. This file opens every
   route in the app, on an account with nothing in it, and counts.

   ------------------------------------------------------------- the layer

   `firstRun.test.ts` and `skeletonSpec.test.ts` test view-models, which is the
   right layer for a rule ABOUT a view-model. This rule is not one. The number
   of empty headlines on a screen is a property of the COMPOSITION — of which
   panels `page.tsx` chooses to render and which it withholds — and no
   view-model in the app can be interrogated for it. `buildDashboard` knows
   `muteSections`; the decision to collapse at two of them lives in
   `src/app/page.tsx`, and `/teams` has no such view-model field at all,
   because `/teams` renders all six of its panels unconditionally. A
   view-model-layer test here would be a second copy of the composition written
   in the test file, and it would pass while the screen showed six shrugs.

   So this file renders the real page components against the real view-models,
   with the four leaf providers stubbed (`AppContext`, `AuthContext`,
   `SessionContext`, `next/navigation`) and nothing else. Everything between a
   provider and a pixel — every hook, every panel, every `PanelEmpty` — is the
   shipped code. The harness is calibrated against the browser twice over:

     the headline count  reproduces the six numbers above EXACTLY (see
                         `describe("the census reproduces the browser")`)
     the height model    reproduces all six document heights to within 1px
                         (see `describe("the height model is calibrated")`)

   That calibration is the whole argument for trusting a jsdom render here: it
   is not a proxy for the browser walk, it is the same six numbers.
   =========================================================================== */

/** The rubric's anchor: at most ONE equal-weight empty headline per screen. */
const EMPTY_HEADLINE_BUDGET = 1;

/**
 * A phone viewport, and the most paper an empty screen may spend.
 *
 * 1.5 screens is one screenful of content plus a scroll to confirm there is no
 * more. It is not a round number picked to be generous: the two screens the
 * walker singled out as correct measure 1117px (`/`) and 960px
 * (`/competitions`), so the budget clears the proven-good pair with 149px of
 * headroom and still refuses `/teams` (1543) and `/summaries` (1600).
 */
const PHONE_VIEWPORT = 844;
const EMPTY_HEIGHT_BUDGET = Math.round(PHONE_VIEWPORT * 1.5); // 1266

/* -------------------------------------------------------------- the account */

const T0 = 1_784_116_800_000;

const team = (id: string, name: string): PersistentTeam => ({
  id,
  name,
  color: "#e2553d",
  createdAt: T0,
});

const TEAMS = [
  team("team-a", "Surge"),
  team("team-b", "Tide"),
  team("team-c", "Storm"),
  team("team-d", "Apex"),
];

const COMPETITION: Competition = {
  id: "comp-x",
  name: "Friday Night",
  type: "round_robin",
  teamIds: TEAMS.map((t) => t.id),
  matchIds: ["m-1", "m-2", "m-3", "m-4", "m-5"],
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
};

const match = (over: Partial<Match> & Pick<Match, "id">): Match => ({
  competitionId: "comp-x",
  homeTeamId: "team-a",
  awayTeamId: "team-b",
  homeScore: 0,
  awayScore: 0,
  status: "pending",
  round: 1,
  position: 1,
  createdAt: T0 + 2_000,
  ...over,
});

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

/** Every panel on every console route has something to print against this. */
const POPULATED: AppState = {
  teams: TEAMS,
  competitions: [COMPETITION],
  matches: [
    played("m-1", "team-a", "team-b", T0 + 10_000),
    played("m-2", "team-c", "team-d", T0 + 20_000),
    played("m-3", "team-a", "team-c", T0 + 30_000),
    match({ id: "m-4", homeTeamId: "team-b", awayTeamId: "team-d", position: 2 }),
    match({
      id: "m-5",
      homeTeamId: "team-a",
      awayTeamId: "team-d",
      status: "in_progress",
      homeScore: 12,
      awayScore: 9,
      position: 3,
    }),
    /* A quick match — `competitionId: null` — so `/quick-match`'s own ledger
       has a row rather than borrowing the competition's. */
    played("qm-1", "team-b", "team-c", T0 + 40_000),
  ].map((m) => (m.id === "qm-1" ? { ...m, competitionId: null } : m)),
};

const EMPTY: AppState = { teams: [], competitions: [], matches: [] };

const SUMMARY: SessionSummary = {
  id: "sum-1",
  name: "Friday Night",
  creatorId: "u1",
  shareCode: "abc123",
  competition: COMPETITION,
  teams: TEAMS,
  matches: POPULATED.matches,
  createdAt: T0,
  endedAt: T0 + 90_000,
  stats: {
    totalMatches: 6,
    completedMatches: 4,
    totalTeams: 4,
    duration: 90_000,
    winner: { teamId: "team-a", teamName: "Surge", wins: 2 },
  },
};

const FORMATION = {
  id: "form-1",
  userId: "u1",
  name: "5-1 Base",
  createdAt: T0,
  updatedAt: T0,
} as unknown as UserFormation;

/* ------------------------------------------------------------- the harness

   Four providers and two data libraries are stubbed. Nothing else is: the page
   components, their hooks, `useMatchbookDashboard` / `useMatchbookTeams` /
   `useMatchbookHistory` / `useMatchbookCompete`, `Panel`, `PanelEmpty` and
   `MbStateBlock` are all the shipped modules.

   Every stub returns a value that is IDENTICAL ACROSS RENDERS. A stub that
   builds a fresh object each call gives `useEffect([user])` a new dependency
   on every pass, and the render never settles — which is how this harness
   first presented itself, as `/summaries` and `/tools` timing out at 5s.
   ------------------------------------------------------------------------- */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* Radix's dialogs observe their content box. jsdom has no `ResizeObserver`,
   and `/competitions/new` mounts one at first paint. */
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const H = vi.hoisted(() => {
  const noop = () => undefined;
  const box = {
    state: { teams: [], competitions: [], matches: [] } as AppState,
    path: "/",
    params: {} as Record<string, string>,
    summaries: [] as unknown[],
    formations: [] as unknown[],
  };

  /* The four reads that return a COLLECTION. A blanket `() => undefined` for
     them lands as `undefined.filter(...)` inside `useCompetitionDetailPage`,
     so they are served from the fixture rather than stubbed away. */
  const reads: Record<string, (id: string) => unknown> = {
    getTeamById: (id) => box.state.teams.find((t) => t.id === id),
    getCompetitionById: (id) => box.state.competitions.find((c) => c.id === id),
    getMatchById: (id) => box.state.matches.find((m) => m.id === id),
    getMatchesByCompetition: (id) =>
      box.state.matches.filter((m) => m.competitionId === id),
  };

  const app = new Proxy({ isSharedMode: false, canEdit: true } as Record<string, unknown>, {
    get: (target, key: string) =>
      key === "state" ? box.state : reads[key] ?? target[key] ?? noop,
  });

  const user = { uid: "u1", email: "walker@example.test", displayName: "Walker", photoURL: null };
  const auth = new Proxy(
    { user, isLoading: false, isConfigured: true, isGuest: false } as Record<string, unknown>,
    { get: (target, key: string) => (key in target ? target[key] : async () => undefined) }
  );

  const session = new Proxy(
    {
      session: null,
      role: "viewer",
      isLoading: false,
      error: null,
      isSharedMode: false,
      canEdit: false,
      isCreator: false,
    } as Record<string, unknown>,
    { get: (target, key: string) => (key in target ? target[key] : async () => undefined) }
  );

  const router = { push: noop, replace: noop, back: noop, forward: noop, refresh: noop, prefetch: noop };
  return { box, app, auth, session, router, noop };
});

/**
 * `next/link` renders an `<a>` with the props it was given, and then schedules
 * its own prefetch/visibility state update on a timer this harness does not
 * drive — hundreds of "not wrapped in act(...)" lines around a census that has
 * already been taken. The stand-in renders the same `<a>` with the same
 * `className`, `href` and children, which is all any assertion in this file
 * reads: nothing here counts links, and `.mb-panel` / the display line are
 * both outside one.
 */
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("@/context/AppContext", () => ({
  useApp: () => H.app,
  AppProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("@/context/SessionContext", () => ({
  useSession: () => H.session,
  SessionProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => H.router,
  usePathname: () => H.box.path,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => H.box.params,
  redirect: H.noop,
  notFound: H.noop,
}));
vi.mock("@/lib/sessions", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getCreatorSummaries: async () => H.box.summaries,
  deleteSummary: async () => undefined,
  getSummaryUrl: () => "https://example.test/summary/abc123",
}));
vi.mock("@/lib/volleyball/userFormations", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getUserFormations: async () => H.box.formations,
  subscribeToUserFormations: () => () => {},
}));

/* --------------------------------------------------------------- the count

   `text-balance` appears exactly once in `src/` — on `MbStateBlock`'s display
   line, the single component every empty headline in the app is drawn by, at
   both scales (`PanelEmpty` in a panel, `MbEmptyState` over a route). So this
   selector is not a guess about markup, it is that one chokepoint; and if the
   chokepoint moves, `describe("the counter is calibrated")` below fails rather
   than every route silently reporting zero.
   ------------------------------------------------------------------------- */
const HEADLINE_SELECTOR = "p.matchbook-display.text-balance";

/**
 * The same sentence, counted a second way, because the first way is gameable.
 *
 * `/quick-match` ships an empty state that is NOT a `PanelEmpty` — a
 * hand-rolled centred `<p>` reading "No teams exist yet — a quick match needs
 * two teams." It is the same shrug on the same screen and `HEADLINE_SELECTOR`
 * cannot see it, so a route could clear the headline budget by demoting five
 * `PanelEmpty`s to five paragraphs and changing nothing a reader experiences.
 *
 * This matches the SENTENCE instead of the markup: design language §5.7's copy
 * rule is `No <things> exist yet — <what makes them appear>`, so any element
 * whose text opens "No …" and reaches "yet" inside 64 characters is one,
 * however it is drawn. Only the innermost match counts, so a panel that
 * CONTAINS a shrug is not a second one.
 *
 * It deliberately does not match a not-found ("No such match report", "No
 * competition exists at this address"): those name a broken address, not an
 * account with nothing in it, and one of them is the whole screen.
 *
 * And it only looks INSIDE a panel. The masthead's subline is a fact about the
 * account — `/competitions` prints "No competitions yet" under its title and
 * `/quick-match` prints "No matches recorded yet" — and `/competitions` is the
 * screen the walker named as the model, so a rule that condemned it would be
 * the wrong rule. One line in a page's naming zone is not one of several
 * objects stacked in a column, which is the whole complaint.
 */
const SHRUG = /^no\b[\s\S]{0,64}?\byet\b/i;
const IN_PANEL = ".mb-panel";

const squash = (node: Element): string =>
  (node.textContent ?? "").replace(/\s+/g, " ").trim();

interface Census {
  /** Display lines drawn by `MbStateBlock` — the rubric's own number. */
  headlines: string[];
  /** "No … yet" sentences, however they are drawn. */
  shrugs: string[];
  panels: number;
}

const censusOf = (host: HTMLElement): Census => {
  const hits = Array.from(host.querySelectorAll("*")).filter(
    (el) => el.closest(IN_PANEL) !== null && SHRUG.test(squash(el))
  );
  return {
    headlines: Array.from(host.querySelectorAll(HEADLINE_SELECTOR)).map((node) =>
      squash(node)
    ),
    shrugs: hits
      .filter((el) => !hits.some((other) => other !== el && el.contains(other)))
      .map((el) => squash(el).slice(0, 64)),
    panels: host.querySelectorAll(".mb-panel").length,
  };
};

const renderToHost = async (node: ReactElement): Promise<HTMLElement> => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(node);
  });
  return host;
};

const walk = async (
  route: RouteEntry,
  state: AppState,
  extras: { summaries?: unknown[]; formations?: unknown[] } = {}
): Promise<Census> => {
  H.box.state = state;
  H.box.path = route.path;
  H.box.params = route.params ?? {};
  H.box.summaries = extras.summaries ?? [];
  H.box.formations = extras.formations ?? [];
  const Page = (await route.load()).default;
  const host = await renderToHost(<Page />);
  const census = censusOf(host);
  host.remove();
  return census;
};

/* ================================================================= the map

   Every `page.tsx` under `src/app`, with the loader that mounts it and the
   route params it is reached by. `describe("every route is on the map")`
   walks the filesystem and fails if this list is not exhaustive, so a screen
   added next round cannot arrive uncounted — which is the specific way each
   of the last three rounds' fixes stopped applying.

   Dynamic routes are given ids that DO NOT EXIST, because on an empty account
   that is what they are reached with. Their honest answer is one route-level
   "not found", which is one headline, which is inside the budget.
   ======================================================================== */

interface RouteEntry {
  /** The pathname the shell is told it is on. */
  path: string;
  /** The file, relative to `src/app`, this entry accounts for. */
  file: string;
  load: () => Promise<{ default: ComponentType }>;
  params?: Record<string, string>;
  /** Set for the six destinations `MatchbookShell` lists in its nav. */
  console?: boolean;
}

const MISSING = { id: "no-such-id", shareCode: "nosuch", shareId: "nosuch" };

const ROUTES: RouteEntry[] = [
  { path: "/", file: "page.tsx", load: () => import("@/app/page"), console: true },
  { path: "/teams", file: "teams/page.tsx", load: () => import("@/app/teams/page"), console: true },
  {
    path: "/quick-match",
    file: "quick-match/page.tsx",
    load: () => import("@/app/quick-match/page"),
    console: true,
  },
  {
    path: "/competitions",
    file: "competitions/page.tsx",
    load: () => import("@/app/competitions/page"),
    console: true,
  },
  {
    path: "/summaries",
    file: "summaries/page.tsx",
    load: () => import("@/app/summaries/page"),
    console: true,
  },
  { path: "/tools", file: "tools/page.tsx", load: () => import("@/app/tools/page"), console: true },
  {
    path: "/competitions/new",
    file: "competitions/new/page.tsx",
    load: () => import("@/app/competitions/new/page"),
  },
  { path: "/login", file: "login/page.tsx", load: () => import("@/app/login/page") },
  {
    path: "/competitions/no-such-id",
    file: "competitions/[id]/page.tsx",
    load: () => import("@/app/competitions/[id]/page"),
    params: MISSING,
  },
  {
    path: "/match/no-such-id",
    file: "match/[id]/page.tsx",
    load: () => import("@/app/match/[id]/page"),
    params: MISSING,
  },
  { path: "/match/guest", file: "match/guest/page.tsx", load: () => import("@/app/match/guest/page") },
  {
    path: "/session/nosuch",
    file: "session/[shareCode]/page.tsx",
    load: () => import("@/app/session/[shareCode]/page"),
    params: MISSING,
  },
  {
    path: "/summary/nosuch",
    file: "summary/[shareCode]/page.tsx",
    load: () => import("@/app/summary/[shareCode]/page"),
    params: MISSING,
  },
  {
    path: "/tools/volleyball-rotations",
    file: "tools/volleyball-rotations/page.tsx",
    load: () => import("@/app/tools/volleyball-rotations/page"),
  },
  {
    path: "/tools/volleyball-rotations/editor",
    file: "tools/volleyball-rotations/editor/page.tsx",
    load: () => import("@/app/tools/volleyball-rotations/editor/page"),
  },
  {
    path: "/tools/volleyball-rotations/my-formations",
    file: "tools/volleyball-rotations/my-formations/page.tsx",
    load: () => import("@/app/tools/volleyball-rotations/my-formations/page"),
  },
  {
    path: "/tools/volleyball-rotations/shared/nosuch",
    file: "tools/volleyball-rotations/shared/[shareId]/page.tsx",
    load: () => import("@/app/tools/volleyball-rotations/shared/[shareId]/page"),
    params: MISSING,
  },
];

const APP_DIR = join(process.cwd(), "src", "app");

const pageFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...pageFiles(full));
    else if (name === "page.tsx") out.push(relative(APP_DIR, full).split(sep).join("/"));
  }
  return out;
};

/* ===========================================================================
   1 — THE MAP IS THE WHOLE APP

   The reason the last three fixes each stopped at the edge of their brief is
   that nothing enumerated the routes. This does, from the filesystem.
   =========================================================================== */

describe("every route is on the map", () => {
  const onDisk = pageFiles(APP_DIR);
  const mapped = new Set(ROUTES.map((r) => r.file));

  it("counts every page in the app", () => {
    const missing = onDisk.filter((file) => !mapped.has(file));
    expect(
      missing,
      `these screens exist and are not counted — add them to ROUTES: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("names no page that does not exist", () => {
    const stale = [...mapped].filter((file) => !onDisk.includes(file));
    expect(stale, `ROUTES names ${stale.join(", ")}, which is not on disk`).toEqual([]);
  });

  it("covers every destination the shell's nav offers", async () => {
    const { MB_NAV_ALL } = await import("@/components/matchbook/BottomBar");
    const consoles = new Set(ROUTES.filter((r) => r.console).map((r) => r.path));
    for (const item of MB_NAV_ALL) expect(consoles.has(item.href), item.href).toBe(true);
  });
});

/* ===========================================================================
   2 — THE COUNTER IS CALIBRATED

   Every assertion below this point is a count of one CSS selector. If that
   selector stops matching, every route reports zero and every budget passes —
   the one failure mode that would make this file worse than useless. So the
   selector is exercised against the two components it exists to find, and
   against a panel that is not empty.
   =========================================================================== */

describe("the counter is calibrated", () => {
  it("finds the headline an empty panel prints", async () => {
    const { Panel, PanelEmpty } = await import("@/components/matchbook/Panel");
    const host = await renderToHost(
      <Panel title="Team Directory">
        <PanelEmpty message="No teams exist yet — add your first team to start the directory." />
      </Panel>
    );
    expect(censusOf(host).headlines).toEqual(["No teams exist yet"]);
    expect(censusOf(host).shrugs).toEqual(["No teams exist yet"]);
    expect(censusOf(host).panels).toBe(1);
    host.remove();
  });

  it("finds a hand-rolled prose empty that draws no headline at all", async () => {
    /* `/quick-match`'s Match Setup panel, verbatim: the same sentence as a
       centred paragraph. Nothing about it is a display line, so the headline
       count is honestly zero — and the shrug count is honestly one. */
    const { Panel } = await import("@/components/matchbook/Panel");
    const host = await renderToHost(
      <Panel title="Match Setup">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
          <p className="text-[0.85rem] text-mb-ink-muted">
            No teams exist yet — a quick match needs two teams.
          </p>
        </div>
      </Panel>
    );
    expect(censusOf(host).headlines).toEqual([]);
    expect(censusOf(host).shrugs).toEqual([
      "No teams exist yet — a quick match needs two teams.",
    ]);
    host.remove();
  });

  it("counts a shrug once, not once per ancestor", async () => {
    const { Panel, PanelEmpty } = await import("@/components/matchbook/Panel");
    const host = await renderToHost(
      <div>
        <Panel title="Fixtures">
          <PanelEmpty message="No fixtures exist yet — start a competition to schedule matches." />
        </Panel>
      </div>
    );
    expect(censusOf(host).shrugs).toEqual(["No fixtures exist yet"]);
    host.remove();
  });

  it("does not call a broken address an empty account", async () => {
    const { MbEmptyState } = await import("@/components/matchbook/EmptyState");
    const host = await renderToHost(
      <MbEmptyState tone="notfound" title="No such match report" body="Check the link." />
    );
    /* One headline, because a route-level state IS the screen. But not a
       shrug: nothing is missing from the account, the address is wrong. */
    expect(censusOf(host).headlines).toEqual(["No such match report"]);
    expect(censusOf(host).shrugs).toEqual([]);
    host.remove();
  });

  it("finds the headline a route-level empty state prints", async () => {
    const { MbEmptyState } = await import("@/components/matchbook/EmptyState");
    const host = await renderToHost(
      <MbEmptyState
        tone="notfound"
        title="No competition exists at this address"
        body="Check the link."
      />
    );
    expect(censusOf(host).headlines).toEqual(["No competition exists at this address"]);
    host.remove();
  });

  it("finds nothing in a panel that has something to say", async () => {
    const { Panel } = await import("@/components/matchbook/Panel");
    const host = await renderToHost(
      <Panel title="Standings">
        <p>Surge 9 pts</p>
      </Panel>
    );
    expect(censusOf(host).headlines).toEqual([]);
    expect(censusOf(host).shrugs).toEqual([]);
    expect(censusOf(host).panels).toBe(1);
    host.remove();
  });
});

/* ===========================================================================
   3 — THE CENSUS REPRODUCES THE BROWSER

   The six numbers the walker measured at 390px on an empty account, and the
   six this harness produces, are the same six numbers. This test is what
   licenses everything below it to be trusted as a measurement rather than as
   an opinion about JSX — it is pinned to the DEFECT, so it is expected to be
   deleted, not edited, once the budget below holds everywhere.
   =========================================================================== */

describe("the census reproduces the browser", () => {
  /* Browser, 390x844, empty account, git f25dba9. Ordered as the walk. */
  const WALK: [string, number][] = [
    ["/", 0],
    ["/competitions", 1],
    ["/teams", 5],
    ["/summaries", 6],
    ["/quick-match", 2],
    ["/tools", 1],
  ];

  it("agrees with the walk, or the walk has moved on", async () => {
    const seen: [string, number][] = [];
    for (const [path] of WALK) {
      const route = ROUTES.find((r) => r.path === path)!;
      seen.push([path, (await walk(route, EMPTY)).headlines.length]);
    }
    const drift = seen.filter(([path, n]) => {
      const was = WALK.find(([p]) => p === path)![1];
      return n !== was && n > EMPTY_HEADLINE_BUDGET;
    });
    /* A route that has been FIXED since the walk is not drift — it is the
       point. A route whose count changed and is still over budget is. */
    expect(
      drift,
      `these routes disagree with the browser walk and are still over budget: ` +
        drift.map(([p, n]) => `${p}=${n}`).join(", ")
    ).toEqual([]);
  }, 30_000);
});

/* ===========================================================================
   4 — Z14, THE BUDGET

   One equal-weight empty headline per screen, on an account with nothing in
   it. Not a house style: two identical display lines stacked in a column is
   the thing the original complaint was about, and it is the thing every round
   since has re-created somewhere else.

   `/competitions` is the model — one panel, one headline, one action — and it
   is what the other five are measured against.

   Both counts, at the same budget. The headline count is the rubric's own
   number; the shrug count is the same rule stated so that redrawing a
   `PanelEmpty` as a paragraph cannot satisfy it. A screen that passes one and
   fails the other has moved the defect, not fixed it.
   =========================================================================== */

const HOW = (route: string) =>
  `\n  The screens that pass do it by withholding the panels that have nothing ` +
  `to say and naming them in one ruled index instead — MbLedgerPanel / ` +
  `mbContentsFor / mbClosingSpan in src/components/matchbook/panels.tsx, ` +
  `composed in src/app/page.tsx and src/app/competitions/page.tsx. ` +
  `/competitions is the screen ${route} is measured against.`;

describe("no screen stacks empty headlines on a new account", () => {
  for (const route of ROUTES) {
    it(`${route.path} prints at most ${EMPTY_HEADLINE_BUDGET}`, async () => {
      const census = await walk(route, EMPTY);
      expect(
        census.headlines.length,
        `${route.path} prints ${census.headlines.length} empty headlines on an ` +
          `account with nothing in it:\n    ` +
          census.headlines.join("\n    ") +
          HOW(route.path)
      ).toBeLessThanOrEqual(EMPTY_HEADLINE_BUDGET);

      expect(
        census.shrugs.length,
        `${route.path} says "No … yet" ${census.shrugs.length} times on an ` +
          `account with nothing in it:\n    ` +
          census.shrugs.join("\n    ") +
          `\n  (Counted by the sentence, not by the markup, so demoting a ` +
          `PanelEmpty to a paragraph does not answer it.)` +
          HOW(route.path)
      ).toBeLessThanOrEqual(EMPTY_HEADLINE_BUDGET);
    }, 30_000);
  }
});

/* ===========================================================================
   5 — THE POPULATED SCREEN IS NOT COLLAPSED

   Every fix for the above is a conditional, and a conditional that reads the
   account wrong takes panels away from a reader who HAS data. That is a worse
   defect than the one being fixed, and it is silent.

   The panel count is not pinned to a literal here on purpose — compositions
   are being re-cut by the same round that reads this file, and a literal would
   fail for the right reason at the wrong moment. What is pinned is the pair of
   things a bad conditional actually breaks: a populated screen stays inside
   the same headline budget, and it never renders FEWER panels than the same
   screen renders with nothing in it.

   The budget rather than zero, because one of these panels is legitimately
   waiting on a SELECTION and not on data: `/quick-match`'s comparison panel
   reads "No comparison exists yet — select both teams to compare their form."
   on a fully populated account, which is a prompt and not a shrug. One is what
   §5.7 empty states are for; the budget is the same number at both ends.
   =========================================================================== */

describe("a populated account still gets its whole screen", () => {
  const CONSOLE = ROUTES.filter((r) => r.console);

  for (const route of CONSOLE) {
    it(`${route.path} stays in budget and loses no panels`, async () => {
      const full = await walk(route, POPULATED, {
        summaries: [SUMMARY],
        formations: [FORMATION],
      });
      const empty = await walk(route, EMPTY);

      expect(
        full.headlines.length,
        `${route.path} prints ${full.headlines.length} empty states on an account ` +
          `with four teams, a competition, four results, a live match and a ` +
          `quick match:\n    ${full.headlines.join("\n    ")}`
      ).toBeLessThanOrEqual(EMPTY_HEADLINE_BUDGET);
      expect(
        full.panels,
        `${route.path} renders ${full.panels} panels populated and ${empty.panels} ` +
          `empty — the collapse is firing on an account that has data`
      ).toBeGreaterThanOrEqual(empty.panels);
    }, 30_000);
  }
});

/* ===========================================================================
   6 — THE HEIGHT

   `MB_ROUTE_SKELETON` is the app's own record of measured page geometry: every
   number in it was read off a shipped page in a browser at 390x844 by
   `pw/mb-geom.mjs`, and invariant 27 binds it to stay that way. So the empty
   page's height is already in the repo as data, and does not need a browser
   here to be asserted on.

   `SHELL_RESERVE` is what sits below the last panel — the bottom bar's own
   reservation plus `<main>`'s closing padding — and it is measured, not
   assumed: with it, this model reproduces all six of the walker's document
   heights to within 1px. The calibration test below is the proof, and it is
   also the alarm if the shell's chrome is ever re-cut.
   =========================================================================== */

const GAP = 16;
const SHELL_RESERVE = 155;

/**
 * The arithmetic, over nothing but numbers: a lead, then one cell per grid
 * child stacked in a single column (which is what `grid-cols-1` makes every
 * one of these layouts at 390), each cell holding one or more panels, 16px
 * between every pair of boxes, and the shell's own reserve underneath.
 */
const heightOf = (lead: number, cells: number[][]): number =>
  lead +
  cells.reduce(
    (total, panels) =>
      total + panels.reduce((h, p) => h + p, 0) + GAP * (panels.length - 1),
    0
  ) +
  GAP * (cells.length - 1) +
  SHELL_RESERVE;

/** The document height this spec reserves at 390x844, in CSS px. The `tail`
 *  is `/quick-match`'s below-grid action bar, gapped like any other box. */
const phoneHeight = (spec: MbSkeletonRouteSpec): number =>
  heightOf(
    spec.lead,
    spec.cells.map((cell) => cell.panels.map((p) => p.h))
  ) + (spec.tail !== undefined ? spec.tail + GAP : 0);

/* ---------------------------------------------------------------------------
   THE FORMULA, PROVEN ONCE AND FROZEN

   The block below is not read from any source file. It is six specs copied out
   of `MB_ROUTE_SKELETON` AS IT STOOD AT git f25dba9, beside the six document
   heights the walker measured in a browser on the same commit. Nothing in the
   app can change it, which is the point: it proves that `heightOf` is the
   browser's own arithmetic, and it goes on proving it after every route in the
   table has been re-cut.

   The live table is checked separately, below, against numbers that have to be
   re-measured — and that check is an alarm about the TABLE. This one is the
   argument for believing the alarm.
   --------------------------------------------------------------------------- */
describe("the height formula reproduces the browser", () => {
  /* [route, lead, cells, browser scrollHeight at 390x844] — git f25dba9. */
  const FROZEN: [string, number, number[][], number][] = [
    ["/ (empty)", 156, [[349], [442]], 1117],
    ["/competitions (empty)", 120, [[442], [228]], 960],
    ["/teams (empty)", 134, [[153], [169, 153], [174], [274], [252]], 1543],
    ["/quick-match (empty)", 134, [[192], [293], [220], [153]], 1195],
    ["/summaries (empty)", 401, [[207, 153], [153, 153, 144, 153]], 1600],
    ["/tools (full)", 130, [[906], [249], [326]], 1798],
  ];

  for (const [name, lead, cells, browser] of FROZEN) {
    it(`predicts ${name} within 1px`, () => {
      expect(Math.abs(heightOf(lead, cells) - browser)).toBeLessThanOrEqual(1);
    });
  }

  it("is not fitting six numbers with six knobs", () => {
    /* One gap and one reserve, shared by all six, and the six documents range
       over 838px. A formula that happened to hit them by accident would not
       hold at that spread. */
    expect(GAP).toBe(16);
    expect(SHELL_RESERVE).toBe(155);
    const spread = Math.max(...FROZEN.map((f) => f[3])) - Math.min(...FROZEN.map((f) => f[3]));
    expect(spread).toBeGreaterThan(800);
  });
});

describe("the height model is calibrated", () => {
  /* Browser, 390x844, `document.documentElement.scrollHeight`, re-run with
     `pw/mb-geom.mjs --empty` after each route's empty composition was re-cut.
     `/tools` is measured on its `full` spec — it has no `empty` one, because
     the toolkit is the same page on every account.

     A document is never shorter than the viewport, so `scrollHeight` is the
     model floored at 844: `/quick-match` empty models 710px of content and the
     browser reports the screen it does not fill. Comparing the raw model
     against that would ask a page to be 844px tall, which is the opposite of
     what this file is for. */
  const MEASURED: [string, "full" | "empty", number][] = [
    /* Re-measured 2026-08-16 with the whole table (F2/D7.2): `/teams`'s empty
       composition and `/tools` both moved a few px in the round's re-cuts. */
    ["/", "empty", 1117],
    ["/competitions", "empty", 960],
    ["/teams", "empty", 990],
    ["/summaries", "empty", 844],
    ["/quick-match", "empty", 844],
    ["/tools", "full", 1250],
  ];

  for (const [route, variant, measured] of MEASURED) {
    it(`predicts ${route} (${variant}) within 2px of the browser`, () => {
      const entry = MB_ROUTE_SKELETON[route];
      const spec = variant === "empty" ? entry.empty : entry.full;
      expect(spec, `${route} has no ${variant} skeleton`).toBeDefined();
      const modelled = Math.max(phoneHeight(spec!), PHONE_VIEWPORT);
      expect(
        Math.abs(modelled - measured),
        `${route} models ${modelled}px against a browser-measured ${measured}px. ` +
          `Either the skeleton table is stale — re-run pw/mb-geom.mjs and ` +
          `pw/mb-geom.mjs --empty — or the shell's bottom reserve has moved off ` +
          `${SHELL_RESERVE}px.`
      ).toBeLessThanOrEqual(2);
    });
  }
});

describe("an empty screen fits in a screen and a half", () => {
  /* Only the routes that DECLARE an empty composition. `/tools` is static
     content on every account and is tall because it has something to say; a
     height budget there would be a budget on the toolkit, not on emptiness. */
  const COLLAPSING = Object.entries(MB_ROUTE_SKELETON).filter(([, e]) => e.empty);

  it("covers more than the two routes that were already fixed", () => {
    expect(COLLAPSING.length).toBeGreaterThanOrEqual(5);
  });

  for (const [route, entry] of COLLAPSING) {
    it(`${route} reserves at most ${EMPTY_HEIGHT_BUDGET}px`, () => {
      const modelled = phoneHeight(entry.empty!);
      expect(
        modelled,
        `${route} is ${modelled}px of paper on an account with nothing in it — ` +
          `${(modelled / PHONE_VIEWPORT).toFixed(1)} phone screens. ` +
          `/competitions does the same job in ${phoneHeight(
            MB_ROUTE_SKELETON["/competitions"].empty!
          )}px. If this route's empty composition was just re-cut, re-measure ` +
          `it with pw/mb-geom.mjs --empty before reading this number as a pass.`
      ).toBeLessThanOrEqual(EMPTY_HEIGHT_BUDGET);
    });
  }
});
