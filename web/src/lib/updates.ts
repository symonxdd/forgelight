import type { UpdateState } from "../api/updates";

/** Whether to show the dot and the notice: a newer release that has not been skipped. */
export function showsNotice(state: UpdateState | undefined): boolean {
  const latest = state?.releases[0];
  return !!latest && state.kind !== "developer" && latest.version !== state.skipped;
}

/**
 * In a developer copy, whether the open page matches the source's version: "reload" when a
 * newer build is already in page/, "rebuild" when the build itself is older than the source.
 */
export function pageStatus(state: UpdateState | undefined, pageVersion: string): "current" | "reload" | "rebuild" {
  if (state?.kind !== "developer" || !state.installed || state.installed === pageVersion) return "current";
  return state.built === state.installed ? "reload" : "rebuild";
}

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago". */
export function checkedAgo(checkedAt: number, nowMs: number): string {
  const seconds = Math.max(0, nowMs / 1000 - checkedAt);
  const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"} ago`;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return plural(Math.floor(seconds / 60), "minute");
  if (seconds < 86_400) return plural(Math.floor(seconds / 3600), "hour");
  return plural(Math.floor(seconds / 86_400), "day");
}
