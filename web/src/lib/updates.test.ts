import { describe, expect, it } from "vitest";
import type { UpdateState } from "../api/updates";
import { checkedAgo, pageStatus, showsNotice } from "./updates";

const release = { version: "1.3.0", date: "2026-10-25", notes: "", url: null };

function state(changes: Partial<UpdateState> = {}): UpdateState {
  return {
    kind: "zip",
    installed: "1.2.0",
    built: "1.2.0",
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

describe("pageStatus", () => {
  const developer = (built: string) => state({ kind: "developer", installed: "1.3.0", built });

  it("asks for a reload when the newer build is already there", () => {
    expect(pageStatus(developer("1.3.0"), "1.2.0")).toBe("reload");
  });

  it("asks for a build when the build is older than the source", () => {
    expect(pageStatus(developer("1.2.0"), "1.2.0")).toBe("rebuild");
  });

  it("stays quiet when the page matches, and for released copies", () => {
    expect(pageStatus(developer("1.3.0"), "1.3.0")).toBe("current");
    expect(pageStatus(state({ installed: "1.3.0" }), "1.2.0")).toBe("current");
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
