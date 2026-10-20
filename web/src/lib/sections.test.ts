import { describe, expect, it } from "vitest";
import { sectionsSummary } from "./sections";

describe("sectionsSummary", () => {
  it("sums up which sections are shown", () => {
    expect(sectionsSummary([])).toBe("All shown");
    expect(sectionsSummary(["sampling"])).toBe("3 of 4 shown");
    expect(sectionsSummary(["size", "hires"])).toBe("2 of 4 shown");
    expect(sectionsSummary(["loras", "size", "sampling", "hires"])).toBe("All hidden");
  });
});
