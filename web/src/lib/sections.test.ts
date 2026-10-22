import { describe, expect, it } from "vitest";
import { sectionsSummary } from "./sections";

describe("sectionsSummary", () => {
  it("sums up which sections are shown", () => {
    expect(sectionsSummary([])).toBe("All shown");
    expect(sectionsSummary(["sampling"])).toBe("4 of 5 shown");
    expect(sectionsSummary(["size", "hires"])).toBe("3 of 5 shown");
    expect(sectionsSummary(["loras", "recommended", "size", "sampling", "hires"])).toBe("All hidden");
  });
});
