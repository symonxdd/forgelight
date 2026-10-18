import { describe, expect, it } from "vitest";
import { nextVersion, releaseChangelog, unreleasedNotes } from "./releaseSteps.mjs";

const CHANGELOG = `# Changelog

## Unreleased

### 🌱 New

- **Added inpainting.** Parts of an image can be redrawn.

## 1.0.0 (2026-10-19)

- First release.
`;

describe("nextVersion", () => {
  it("raises one number and resets the ones after it", () => {
    expect(nextVersion("1.4.2", "patch")).toBe("1.4.3");
    expect(nextVersion("1.4.2", "minor")).toBe("1.5.0");
    expect(nextVersion("1.4.2", "major")).toBe("2.0.0");
    expect(nextVersion("0.1.0", "major")).toBe("1.0.0");
  });

  it("refuses versions it cannot read", () => {
    expect(() => nextVersion("1.0", "patch")).toThrow();
    expect(() => nextVersion("1.0.0-beta", "patch")).toThrow();
  });
});

describe("unreleasedNotes", () => {
  it("returns the notes between Unreleased and the next version", () => {
    expect(unreleasedNotes(CHANGELOG)).toBe("### 🌱 New\n\n- **Added inpainting.** Parts of an image can be redrawn.");
  });

  it("is empty when there is nothing to release", () => {
    expect(unreleasedNotes("# Changelog\n\n## Unreleased\n\n## 1.0.0 (2026-10-19)\n")).toBe("");
    expect(unreleasedNotes("# Changelog\n")).toBe("");
  });
});

describe("releaseChangelog", () => {
  it("names the version and opens a new Unreleased section", () => {
    const released = releaseChangelog(CHANGELOG, "1.1.0", "2026-11-02");
    expect(released).toContain("## Unreleased\n\n## 1.1.0 (2026-11-02)\n\n### 🌱 New");
    expect(unreleasedNotes(released)).toBe("");
  });

  it("refuses to release without notes", () => {
    expect(() => releaseChangelog("# Changelog\n\n## Unreleased\n", "1.1.0", "2026-11-02")).toThrow();
  });
});
