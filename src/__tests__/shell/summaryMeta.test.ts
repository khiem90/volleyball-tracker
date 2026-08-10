import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MB_OG_CREST_SVG,
  MB_OG_INK,
  MB_SUMMARY_META_FALLBACK,
  fetchSummaryMeta,
  shapeSummaryMeta,
  summaryCardLines,
  summaryDescription,
  summaryTitle,
} from "@/app/summary/[shareCode]/summaryMeta";

/* ===========================================================================
   THE SHARE CARD, AND THE THINGS IT MUST NEVER SAY

   `/summary/[shareCode]` is distributed by being pasted into a group chat, so
   its metadata is the one surface of this product that gets copied into other
   people's systems. Three properties are asserted here rather than assumed:

     1. it names the SAME champion the page names (register D-40 — the frozen
        `stats.winner` disagrees with the table on the shipped fixture);
     2. it carries no token, no uid and no credential of any kind;
     3. its palette still resolves to `--mb-*`, even though Satori forced the
        one place in `src/` that writes a Matchbook colour as a literal.
   =========================================================================== */

const ROOT = process.cwd();

/** A decoded `summaries` document, in the shape the REST reader produces. */
const doc = (over: Partial<Record<string, unknown>> = {}) => ({
  name: "Friday Night League",
  shareCode: "FRDAY2",
  creatorId: "u1",
  endedAt: Date.UTC(2026, 1, 7, 21, 30),
  teams: [
    { id: "t1", name: "Harbor Tide" },
    { id: "t2", name: "City Surge" },
    { id: "t3", name: "Iron Storm" },
  ],
  competition: {
    id: "c1",
    type: "round_robin",
    teamIds: ["t1", "t2", "t3"],
  },
  matches: [
    m("m1", "t1", "t2", 25, 18),
    m("m2", "t1", "t3", 25, 20),
    m("m3", "t2", "t3", 25, 22),
  ],
  ...over,
});

function m(
  id: string,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number
) {
  return {
    id,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    status: "completed",
    round: 1,
    isBye: false,
    winnerId: homeScore > awayScore ? homeTeamId : awayTeamId,
    completedAt: Date.UTC(2026, 1, 7, 20),
  };
}

describe("shapeSummaryMeta", () => {
  it("names the champion the final table names, not stats.winner", () => {
    /* `stats.winner` says City Surge; the table says Harbor Tide (2 wins). The
       card must agree with the page, which ranks with `rankTeams`. */
    const meta = shapeSummaryMeta(
      doc({ stats: { winner: { teamId: "t2", teamName: "City Surge", wins: 9 } } })
    );
    expect(meta?.champion).toBe("Harbor Tide");
    expect(meta?.levelAtTop).toBeNull();
    expect(meta?.teamCount).toBe(3);
    expect(meta?.matchCount).toBe(3);
    expect(meta?.formatLabel).toBe("Round Robin");
  });

  it("takes a bracket's champion from competition.winnerId", () => {
    const meta = shapeSummaryMeta(
      doc({
        competition: {
          id: "c1",
          type: "single_elimination",
          teamIds: ["t1", "t2", "t3"],
          winnerId: "t3",
        },
      })
    );
    expect(meta?.champion).toBe("Iron Storm");
  });

  it("names nobody, and says who was level, when the top line is shared", () => {
    const meta = shapeSummaryMeta(
      doc({
        matches: [m("m1", "t1", "t2", 25, 18), m("m2", "t2", "t1", 25, 18)],
        teams: [
          { id: "t1", name: "Harbor Tide" },
          { id: "t2", name: "City Surge" },
        ],
        competition: { id: "c1", type: "round_robin", teamIds: ["t1", "t2"] },
      })
    );
    expect(meta?.champion).toBeNull();
    expect(meta?.levelAtTop).toEqual({ count: 2, points: 3 });
    expect(summaryDescription(meta!)).toContain("2 teams level on 3 points");
  });

  it("names nobody at all when nothing was played", () => {
    const meta = shapeSummaryMeta(doc({ matches: [] }));
    expect(meta?.champion).toBeNull();
    expect(meta?.levelAtTop).toBeNull();
    expect(meta?.matchCount).toBe(0);
    expect(summaryDescription(meta!)).toContain("ended without a result recorded");
    expect(summaryCardLines(meta!).headline).toBe("No result recorded");
  });

  it("skips byes when counting matches", () => {
    const bye = { ...m("m4", "t1", "t3", 25, 0), isBye: true };
    expect(shapeSummaryMeta(doc({ matches: [...doc().matches, bye] }))?.matchCount).toBe(3);
  });

  it("refuses to shape a document with no event name", () => {
    expect(shapeSummaryMeta(doc({ name: "" }))).toBeNull();
    expect(shapeSummaryMeta({})).toBeNull();
  });
});

describe("the copy", () => {
  const meta = shapeSummaryMeta(doc())!;

  it("puts the result first, because every consumer truncates", () => {
    expect(summaryTitle(meta)).toBe("Friday Night League — Match Report");
    expect(summaryDescription(meta).startsWith("Harbor Tide won Friday Night League.")).toBe(
      true
    );
  });

  it("names the event, the winner and the shape of the day", () => {
    const d = summaryDescription(meta);
    expect(d).toContain("Friday Night League");
    expect(d).toContain("Harbor Tide");
    expect(d).toContain("3 teams");
    expect(d).toContain("3 matches");
    expect(d).toContain("Round Robin");
    expect(d).toContain("Feb 7, 2026");
  });

  it("never describes the page instead of the event", () => {
    for (const dead of ["View the", "Click here", "summary page", "Learn more"])
      expect(summaryDescription(meta)).not.toContain(dead);
    expect(MB_SUMMARY_META_FALLBACK.description).not.toContain("View the");
  });

  it("leaks no token, uid or credential", () => {
    const all = [
      summaryTitle(meta),
      summaryDescription(meta),
      summaryCardLines(meta).kicker,
      summaryCardLines(meta).headline,
      MB_SUMMARY_META_FALLBACK.title,
      MB_SUMMARY_META_FALLBACK.description,
    ].join(" ");
    for (const needle of ["admin", "token", "creatorId", "u1", "apiKey", "key="])
      expect(all.toLowerCase()).not.toContain(needle.toLowerCase());
  });
});

/* --------------------------------------------------------------- the read */

/** The REST envelope Firestore actually returns, hand-built from the API docs. */
const restEnvelope = () => [
  {
    document: {
      name: "projects/p/databases/(default)/documents/summaries/s1",
      fields: {
        name: { stringValue: "Friday Night League" },
        shareCode: { stringValue: "FRDAY2" },
        creatorId: { nullValue: null },
        endedAt: { integerValue: String(Date.UTC(2026, 1, 7, 21, 30)) },
        teams: {
          arrayValue: {
            values: [
              { mapValue: { fields: { id: { stringValue: "t1" }, name: { stringValue: "Harbor Tide" } } } },
              { mapValue: { fields: { id: { stringValue: "t2" }, name: { stringValue: "City Surge" } } } },
            ],
          },
        },
        competition: {
          mapValue: {
            fields: {
              id: { stringValue: "c1" },
              type: { stringValue: "round_robin" },
              teamIds: {
                arrayValue: {
                  values: [{ stringValue: "t1" }, { stringValue: "t2" }],
                },
              },
            },
          },
        },
        matches: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    id: { stringValue: "m1" },
                    homeTeamId: { stringValue: "t1" },
                    awayTeamId: { stringValue: "t2" },
                    homeScore: { integerValue: "25" },
                    awayScore: { integerValue: "18" },
                    status: { stringValue: "completed" },
                    round: { integerValue: "1" },
                    isBye: { booleanValue: false },
                    winnerId: { stringValue: "t1" },
                    completedAt: { integerValue: String(Date.UTC(2026, 1, 7, 20)) },
                  },
                },
              },
            ],
          },
        },
      },
    },
  },
];

describe("fetchSummaryMeta — unauthenticated REST runQuery (charter D-13)", () => {
  const ENV = { ...process.env };
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ENV };
  });

  const withConfig = () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "example-project";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "web-api-key";
  };

  it("decodes a real Firestore envelope end to end", async () => {
    withConfig();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(restEnvelope()), { status: 200 }))
    );
    const meta = await fetchSummaryMeta("frday2");
    expect(meta?.name).toBe("Friday Night League");
    /* `integerValue` arrives as a STRING; a card that printed "NaN teams"
       would be the first thing anyone saw of this product. */
    expect(meta?.matchCount).toBe(1);
    expect(meta?.champion).toBe("Harbor Tide");
    expect(meta?.endedShort).toBe("Feb 7, 2026");
  });

  it("sends no credential but the public web key, and asks for one document", async () => {
    withConfig();
    const spy = vi.fn(async () => new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", spy);
    await fetchSummaryMeta("frday2");

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(
      "https://firestore.googleapis.com/v1/projects/example-project/databases/(default)/documents:runQuery"
    );
    expect(url).toContain("key=web-api-key");
    /* No bearer token, no admin token, nothing that grants more than a
       stranger with the link already has. `firestore.rules` permits this read
       to `request.auth == null`. */
    expect(JSON.stringify(init.headers)).not.toMatch(/authorization|bearer/i);

    const body = JSON.parse(init.body as string);
    expect(body.structuredQuery.from).toEqual([{ collectionId: "summaries" }]);
    expect(body.structuredQuery.limit).toBe(1);
    /* Share codes are stored uppercase; the URL may be typed in any case. */
    expect(body.structuredQuery.where.fieldFilter.value.stringValue).toBe("FRDAY2");
  });

  it("falls back rather than throwing on an empty result, an error or no config", async () => {
    withConfig();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("[{}]", { status: 200 })));
    expect(await fetchSummaryMeta("nope")).toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 403 })));
    expect(await fetchSummaryMeta("frday2")).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      })
    );
    expect(await fetchSummaryMeta("frday2")).toBeNull();

    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await fetchSummaryMeta("frday2")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("the OG card cannot drift from the design tokens", () => {
  const css = readFileSync(join(ROOT, "src", "app", "globals.css"), "utf8");

  /** First declaration wins — `:root` is the top of the file. */
  const token = (name: string) => {
    const hit = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
    return hit?.[1].trim();
  };

  it.each([
    ["mb-paper", MB_OG_INK.paper],
    ["mb-navy", MB_OG_INK.navy],
    ["mb-coral", MB_OG_INK.coral],
    ["mb-coral-deep", MB_OG_INK.coralDeep],
    ["mb-ink-muted", MB_OG_INK.inkMuted],
    ["mb-rule", MB_OG_INK.rule],
  ])("%s still equals the token", (name, literal) => {
    expect(token(name)).toBe(literal);
  });

  it("inlines the real crest, byte for byte", () => {
    const onDisk = readFileSync(
      join(ROOT, "public", "assets", "matchbook", "brand", "crest.svg"),
      "utf8"
    );
    expect(MB_OG_CREST_SVG.replace(/\r\n/g, "\n")).toBe(onDisk.replace(/\r\n/g, "\n"));
  });
});
