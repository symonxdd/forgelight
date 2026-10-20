import { describe, expect, it } from "vitest";
import { inlineParts, parseNotes } from "./releaseNotes";

describe("parseNotes", () => {
  it("reads headings, list items and paragraphs from CHANGELOG notes", () => {
    const notes =
      "\n### 🌱 New\n\n- **Added a viewer.** It zooms.\n- Added favorites\n  that stay.\n\nA closing line.\n";
    expect(parseNotes(notes)).toEqual([
      { kind: "heading", text: "🌱 New" },
      { kind: "item", text: "**Added a viewer.** It zooms." },
      { kind: "item", text: "Added favorites that stay." },
      { kind: "paragraph", text: "A closing line." },
    ]);
  });

  it("handles Windows line endings and empty notes", () => {
    expect(parseNotes("### Fixed\r\n- One\r\n")).toEqual([
      { kind: "heading", text: "Fixed" },
      { kind: "item", text: "One" },
    ]);
    expect(parseNotes("")).toEqual([]);
  });
});

describe("inlineParts", () => {
  it("splits bold text from plain text", () => {
    expect(inlineParts("**Bold.** Then plain.")).toEqual([
      { text: "Bold.", bold: true },
      { text: " Then plain.", bold: false },
    ]);
  });

  it("leaves an unmatched marker as typed", () => {
    expect(inlineParts("2 ** 3")).toEqual([{ text: "2 ** 3", bold: false }]);
  });
});
