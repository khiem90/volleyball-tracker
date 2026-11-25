// @vitest-environment node
import { describe, expect, it } from "vitest";
import { boldSide } from "@/lib/scoreLine";

describe("the side a score line shows in bold", () => {
  it("is the side ahead on the score", () => {
    expect(boldSide(21, 15)).toBe("home");
    expect(boldSide(7, 9)).toBe("away");
  });

  it("is neither side while the score is level", () => {
    expect(boldSide(12, 12)).toBeNull();
    expect(boldSide(0, 0)).toBeNull();
  });

  /* A forfeit and an instant win both end a match with no points played. */
  it("is the winner when the match has one, whatever the score says", () => {
    expect(boldSide(0, 0, "away")).toBe("away");
    expect(boldSide(3, 5, "home")).toBe("home");
  });

  it("is neither side when there is no score and no winner", () => {
    expect(boldSide(null, null)).toBeNull();
    expect(boldSide(undefined, undefined)).toBeNull();
  });

  it("is the winner of a match that has no score to show", () => {
    expect(boldSide(null, null, "home")).toBe("home");
  });
});
