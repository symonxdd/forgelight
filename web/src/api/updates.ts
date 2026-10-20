import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "./forgelight";

/** How this copy was installed, which decides how it updates. */
export type InstallKind = "git" | "zip" | "developer";

export interface ReleaseInfo {
  version: string;
  /** Publication date, YYYY-MM-DD. */
  date: string | null;
  /** The release's notes from CHANGELOG.md, in Markdown. */
  notes: string;
  /** The release's page on GitHub. */
  url: string | null;
}

export interface UpdateState {
  kind: InstallKind;
  installed: string | null;
  /** The daily check is switched on. */
  auto: boolean;
  checking: boolean;
  /** Unix seconds of the last successful check. */
  checkedAt: number | null;
  /** Why the last check failed, when it did. */
  error: string | null;
  skipped: string | null;
  /** Releases newer than the installed version, newest first. */
  releases: ReleaseInfo[];
}

export interface InstallResult {
  version: string | null;
  /** The update changed files Forge reads only at startup. */
  restartNeeded: boolean;
}

const KEY = ["forgelight-updates"];

/**
 * The extension's update state. Asking it is free: it goes to GitHub at most once a day,
 * and only with the daily check on. While a check runs, the answer is looked at sooner.
 */
export function useUpdates() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => request<UpdateState>("updates"),
    staleTime: 60_000,
    refetchInterval: (query) => (query.state.data?.checking ? 2000 : 3_600_000),
  });
}

function useUpdatesChange<T>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: T) => request<UpdateState>(path, body),
    onSuccess: (state) => queryClient.setQueryData(KEY, state),
  });
}

export function useCheckUpdates() {
  return useUpdatesChange<Record<string, never>>("updates/check");
}

export function useSetAutoCheck() {
  return useUpdatesChange<{ enabled: boolean }>("updates/auto");
}

export function useSkipVersion() {
  return useUpdatesChange<{ version: string | null }>("updates/skip");
}

/** Downloads and installs a version. Only ever sent when Update is clicked. */
export function useInstallUpdate() {
  return useMutation({
    mutationFn: (version: string) => request<InstallResult>("updates/install", { version }),
  });
}
