import { describe, expect, it } from "vitest";
import { splitTeamName } from "@/components/matchbook/TeamName";

/* The F15 rule, pinned. `splitTeamName` decides where a team name may lose
   characters when its column is too narrow, and the property that matters is
   not "it looks nicer" — it is that two teams whose names differ only at the
   END still produce two different renders. The fixture that found the defect
   holds exactly that pair. */

const WOLVES_B = "Wolverhampton Wanderers Athletic Club B";
const WOLVES_C = "Wolverhampton Wanderers Athletic Club C";

describe("splitTeamName", () => {
  it("pins the last token so two near-identical names stay distinguishable", () => {
    const [headB, tailB] = splitTeamName(WOLVES_B);
    const [headC, tailC] = splitTeamName(WOLVES_C);

    // The heads collide — that is the part the ellipsis is allowed to eat.
    expect(headB).toBe(headC);
    // The tails do not, and they are what survives at every width.
    expect(tailB).toBe(" B");
    expect(tailC).toBe(" C");
    expect(tailB).not.toBe(tailC);
  });

  it("never loses a character: head + tail is the trimmed name", () => {
    for (const name of [
      WOLVES_B,
      "Ríptïde Ünïted Fóotball & Sócial Clüb",
      "AB",
      "Apex",
      "  Storm  ",
      "Northside Community Volleyball Association",
    ]) {
      const [head, tail] = splitTeamName(name);
      expect(head + tail).toBe(name.trim());
    }
  });

  it("refuses to split a single-token name", () => {
    expect(splitTeamName("Apex")).toEqual(["Apex", ""]);
    expect(splitTeamName("AB")).toEqual(["AB", ""]);
    expect(splitTeamName("")).toEqual(["", ""]);
  });

  it("refuses a tail long enough to starve the head", () => {
    // 13 characters plus its space is past the cap, so no pinning happens and
    // the name truncates normally rather than rendering as its ending alone.
    expect(splitTeamName("Riverside Thunderbirdss")).toEqual([
      "Riverside Thunderbirdss",
      "",
    ]);
    // 11 characters plus its space is inside the cap.
    expect(splitTeamName("Riverside Thunderbird")).toEqual([
      "Riverside",
      " Thunderbird",
    ]);
  });

  it("refuses a head too short to be worth keeping", () => {
    expect(splitTeamName("The Bees")).toEqual(["The Bees", ""]);
    expect(splitTeamName("Kent Bees")).toEqual(["Kent", " Bees"]);
  });

  it("is deterministic — same input, same split, no width involved", () => {
    expect(splitTeamName(WOLVES_B)).toEqual(splitTeamName(WOLVES_B));
  });
});
