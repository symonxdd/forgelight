import { describe, expect, it } from "vitest";
import { TAGLINES, pickTagline } from "./taglines";

describe("pickTagline", () => {
  it("never repeats the tagline shown last time", () => {
    for (const last of TAGLINES) {
      for (const r of [0, 0.3, 0.6, 0.999]) expect(pickTagline(last, () => r)).not.toBe(last);
    }
  });

  it("can pick every tagline", () => {
    const seen = new Set(TAGLINES.map((_, i) => pickTagline(null, () => i / TAGLINES.length)));
    expect(seen.size).toBe(TAGLINES.length);
  });

  it("treats an unknown stored value like no previous tagline", () => {
    expect(TAGLINES).toContain(pickTagline("something else", () => 0.5));
  });
});
