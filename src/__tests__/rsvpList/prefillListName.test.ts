import { describe, expect, it } from "vitest";
import { prefillListName } from "@/lib/rsvpList";

const both = { person: "Dan from Tuesdays", team: "Spikers" };

describe("prefillListName", () => {
  it("starts a by-person RSVP from the remembered person name", () => {
    expect(prefillListName("people", both, "Daniel Okafor")).toBe("Dan from Tuesdays");
  });

  it("starts a by-team RSVP from the remembered team name", () => {
    expect(prefillListName("teams", both, "Daniel Okafor")).toBe("Spikers");
  });

  it("falls back to the account's display name for a person, and to nothing for a team", () => {
    const captainOnly = { person: null, team: "Spikers" };
    const personOnly = { person: "Dan from Tuesdays", team: null };

    expect(prefillListName("people", captainOnly, "Daniel Okafor")).toBe("Daniel Okafor");
    expect(prefillListName("people", captainOnly, null)).toBe("");
    // A team is not called after its captain, so neither of the person's names fills it.
    expect(prefillListName("teams", personOnly, "Daniel Okafor")).toBe("");
  });

  it("cuts a name to what an RSVP takes", () => {
    expect(prefillListName("teams", { person: null, team: "x".repeat(50) }, null)).toBe("x".repeat(40));
  });
});
