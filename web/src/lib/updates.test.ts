import { describe, expect, it } from "vitest";
import type { UpdateState } from "../api/updates";
import { checkedAgo, pageOutdated, showsNotice } from "./updates";

const release = { version: "1.3.0", date: "2026-10-25", notes: "", url: null };

function state(changes: Partial<UpdateState> = {}): UpdateState {
  return {
    kind: "zip",
    installed: "1.2.0",
    auto: true,
    checking: false,
    checkedAt: 0,
    error: null,
    skipped: null,
    releases: [release],
    ...changes,
  };
}

describe("showsNotice", () => {
  it("shows a newer release", () => {
    expect(showsNotice(state())).toBe(true);
  });

  it("stays quiet when up to date, skipped, unknown or a developer copy", () => {
    expect(showsNotice(state({ releases: [] }))).toBe(false);
    expect(showsNotice(state({ skipped: "1.3.0" }))).toBe(false);
    expect(showsNotice(undefined)).toBe(false);
    expect(showsNotice(state({ kind: "developer" }))).toBe(false);
  });

  it("shows again when a release newer than the skipped one appears", () => {
    const newer = { ...release, version: "1.4.0" };
    expect(showsNotice(state({ skipped: "1.3.0", releases: [newer, release] }))).toBe(true);
  });
});

describe("pageOutdated", () => {
  it("flags a developer copy whose page was built from an older version", () => {
    expect(pageOutdated(state({ kind: "developer", installed: "1.2.0" }), "1.1.0")).toBe(true);
    expect(pageOutdated(state({ kind: "developer", installed: "1.2.0" }), "1.2.0")).toBe(false);
  });

  it("ignores released copies", () => {
    expect(pageOutdated(state({ installed: "1.2.0" }), "1.1.0")).toBe(false);
  });
});

describe("checkedAgo", () => {
  const now = 1_000_000 * 1000;
  it("names the time since the last check", () => {
    expect(checkedAgo(1_000_000 - 10, now)).toBe("just now");
    expect(checkedAgo(1_000_000 - 60, now)).toBe("1 minute ago");
    expect(checkedAgo(1_000_000 - 3 * 3600, now)).toBe("3 hours ago");
    expect(checkedAgo(1_000_000 - 2 * 86_400, now)).toBe("2 days ago");
  });
});
