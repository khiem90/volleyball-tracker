import { describe, expect, it } from "vitest";
import { saveMethod } from "@/lib/saveFile";

const csv = new File(["a,b"], "history.csv", { type: "text/csv" });
const sharesFiles = () => true;
const sharesNoFiles = () => false;

describe("saveMethod", () => {
  it("hands the file to the share sheet in an iPhone home screen app, where Save to Files keeps it", () => {
    expect(saveMethod({ standalone: true, canShare: sharesFiles }, csv)).toBe("share");
  });

  it("downloads in an iPhone Safari tab, which saves to its downloads", () => {
    expect(saveMethod({ standalone: false, canShare: sharesFiles }, csv)).toBe("download");
  });

  it("downloads in a home screen app that cannot share files", () => {
    expect(saveMethod({ standalone: true, canShare: sharesNoFiles }, csv)).toBe("download");
    expect(saveMethod({ standalone: true }, csv)).toBe("download");
  });

  it("downloads on Android and desktop browsers, which have no standalone flag, even when they can share files", () => {
    expect(saveMethod({ canShare: sharesFiles }, csv)).toBe("download");
    expect(saveMethod({}, csv)).toBe("download");
  });
});
