import { describe, expect, it } from "vitest";
import { splitTeamName } from "@/components/matchbook/TeamName";
import { crestForTeam } from "@/components/matchbook/types";

/* ---------------------------------------------------------------------------
   THE REALISTIC ROSTER, PINNED IN THE REPOSITORY

   For the whole programme the visual harness seeded eight teams called Surge,
   Tide, Storm, Apex, Flare, Peak, Nova and Riptide. None was longer than seven
   characters and none was two words, so every screen in this app was designed,
   screenshotted and audited against names no real club has.

   A naive walker added one team called "Westhill Wanderers" and the app broke:
   `documentElement.scrollWidth` went to 396 against a 390 viewport and 397
   against 320, and because `html { overflow-x: hidden }` suppresses the scroll,
   the fixed bottom navigation could not be reached at all — 144px below the
   fold at 320, unscrollable. Thirty audited routes had reported zero overflow,
   because the harness measured the fixture and the fixture was a fantasy.

   The fixture was regenerated (`<SCRATCH>/pw/gen-fixture.mts`) but the
   scratchpad is wiped between sessions, so the corpus itself lives here, in the
   tree, where it survives. These are the same eight names, and this file exists
   to do two things:

     1. stop the corpus quietly reverting to short single words — that is what
        the shape assertions are for. They are not testing the app; they are
        testing that we are still testing the app against real input;
     2. hold the pure name-handling layer to it. Anything that can be asserted
        about a long club name WITHOUT a browser belongs here rather than in a
        Playwright sweep, because it runs in every `vitest run`.

   Layout consequences — overflow, chrome reachability, text drawn through text
   — cannot be measured in jsdom. Those are `audit.mjs`: OVERFLOW (both scroll
   widths), WIDTHS (invariant 31) and TEXTOVER.
   --------------------------------------------------------------------------- */

/** The default roster of `gen-fixture.mts`, in fixture order. */
const ROSTER = [
  "Westhill Wanderers",
  "Riverside Rovers VBC",
  "Redbridge Rovers VBC",
  "Northgate Thunderbirds",
  "Ashford & District Spikers",
  "St Brendan's Panthers",
  "Kingsbridge Community Vipers",
  "Mount Pleasant Community Volleyball Club",
] as const;

/** The two that differ only in their first word. Ambiguity, on purpose. */
const SHARED_SUFFIX_PAIR = ["Riverside Rovers VBC", "Redbridge Rovers VBC"] as const;

describe("the realistic team-name corpus", () => {
  it("is made of real club names, not one-word fixtures", () => {
    for (const name of ROSTER) {
      expect(name.length).toBeGreaterThanOrEqual(18);
      expect(name.split(/\s+/).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("carries the four stresses the old roster could not", () => {
    // the walker's own name, the one that broke the navigation
    expect(ROSTER).toContain("Westhill Wanderers");
    // a 40-character monster
    expect(Math.max(...ROSTER.map((n) => n.length))).toBeGreaterThanOrEqual(40);
    // punctuation that has to survive escaping and typography
    expect(ROSTER.some((n) => n.includes("&"))).toBe(true);
    expect(ROSTER.some((n) => n.includes("'"))).toBe(true);
  });

  it("holds two names that differ only in their first word", () => {
    const [a, b] = SHARED_SUFFIX_PAIR;
    expect(ROSTER).toContain(a);
    expect(ROSTER).toContain(b);
    expect(a).not.toBe(b);
    // everything after the first word is identical, so nothing downstream can
    // tell them apart by their ending
    expect(a.split(" ").slice(1).join(" ")).toBe(b.split(" ").slice(1).join(" "));
    // and they open on the same letter, so a one-character abbreviation collides
    expect(a[0]).toBe(b[0]);
  });
});

describe("splitTeamName against real club names", () => {
  it("never loses a character from any of them", () => {
    for (const name of ROSTER) {
      const [head, tail] = splitTeamName(name);
      expect(head + tail).toBe(name);
    }
  });

  it("keeps the shared-suffix pair distinguishable", () => {
    const [headA, tailA] = splitTeamName(SHARED_SUFFIX_PAIR[0]);
    const [headB, tailB] = splitTeamName(SHARED_SUFFIX_PAIR[1]);

    /* This is the inverse of the case `teamName.test.ts` pins. There, two names
       differed at the END and the pinned tail was what saved them. Here they
       differ at the START, so the tails are identical by construction and the
       HEAD is the only thing carrying the difference — which means the head may
       be shortened but must never be shortened to nothing, and the two must not
       collapse to the same rendered string. */
    expect(tailA).toBe(tailB);
    expect(headA).not.toBe(headB);
    // the difference has to survive an aggressive truncation, not just exist
    expect(headA.slice(0, 3)).not.toBe(headB.slice(0, 3));
  });

  it("leaves a head worth reading on the 40-character name", () => {
    const monster = ROSTER[7];
    const [head, tail] = splitTeamName(monster);
    expect(head + tail).toBe(monster);
    expect(head.length).toBeGreaterThan(8);
  });
});

describe("crestForTeam against real club names", () => {
  it("resolves every one to a real crest in the pack", () => {
    for (const name of ROSTER) {
      const path = crestForTeam(`team-${name}`, name);
      expect(path).toMatch(/^\/assets\/matchbook\/teams\/[a-z]+\.svg$/);
    }
  });

  it("is deterministic — the same name always wears the same crest", () => {
    for (const name of ROSTER) {
      expect(crestForTeam("id-a", name)).toBe(crestForTeam("id-b", name));
    }
  });

  /* Not asserted, and deliberately: that the eight land on eight DIFFERENT
     crests. None of these names contains a pack slug, so all eight are hashed
     over eight buckets and collide by the birthday bound — this roster lands on
     five distinct crests. That is what an arbitrary real roster does, it is the
     documented behaviour of `crestForTeam`, and pinning a spread here would
     invite someone to "fix" the fixture by renaming clubs until the hash was
     happy, which is the same mistake as the eight short names in a new
     costume. */
});
