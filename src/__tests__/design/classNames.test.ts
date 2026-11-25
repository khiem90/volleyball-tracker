// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

/*
 * cn() drops the earlier of two classes that set the same thing. It has to be
 * told the names of the type scale and the radius scale, or it takes
 * text-title for a color and rounded-card for nothing it knows.
 */

const typeSteps = ["page-title", "title", "body", "label", "caption", "tab", "score"];
const radiusSteps = ["card", "tile", "chip", "pill"];

describe("cn with the type scale", () => {
  it.each(typeSteps)("keeps text-%s beside a text color", (step) => {
    expect(cn(`text-${step}`, "text-ink")).toBe(`text-${step} text-ink`);
    expect(cn("text-ink-soft", `text-${step}`)).toBe(`text-ink-soft text-${step}`);
  });

  it.each(typeSteps)("lets text-%s replace an earlier size", (step) => {
    expect(cn("text-sm", `text-${step}`)).toBe(`text-${step}`);
    expect(cn(`text-${step}`, "text-[0.9rem]")).toBe("text-[0.9rem]");
  });

  it("lets a later text color replace an earlier one", () => {
    expect(cn("text-ink", "text-danger")).toBe("text-danger");
  });
});

describe("cn with the radius scale", () => {
  it.each(radiusSteps)("lets rounded-%s replace an earlier radius", (step) => {
    expect(cn("rounded-lg", `rounded-${step}`)).toBe(`rounded-${step}`);
    expect(cn(`rounded-${step}`, "rounded-none")).toBe("rounded-none");
  });

  it("lets one step replace another", () => {
    expect(cn("rounded-card", "rounded-pill")).toBe("rounded-pill");
    expect(cn("rounded-t-card", "rounded-t-tile")).toBe("rounded-t-tile");
  });
});
