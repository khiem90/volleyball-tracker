// @vitest-environment node
import { describe, expect, it } from "vitest";
import { TOURNAMENT_STATUS } from "@/lib/tournamentStatus";

/*
 * How a tournament's status is drawn. Green is for what is live. A draft and a
 * completed tournament are plain grey chips, and no status is red, because red
 * is for destructive actions.
 */
describe("a tournament's status", () => {
  it("keeps the three words", () => {
    expect(TOURNAMENT_STATUS.live.label).toBe("Live");
    expect(TOURNAMENT_STATUS.draft.label).toBe("Draft");
    expect(TOURNAMENT_STATUS.completed.label).toBe("Completed");
  });

  it("draws live as a green chip with the live dot", () => {
    expect(TOURNAMENT_STATUS.live.tone).toBe("action");
    expect(TOURNAMENT_STATUS.live.live).toBe(true);
  });

  it("draws draft and completed as grey chips with no dot", () => {
    for (const status of [TOURNAMENT_STATUS.draft, TOURNAMENT_STATUS.completed]) {
      expect(status.tone).toBe("fill");
      expect(status.live).toBe(false);
    }
  });
});
