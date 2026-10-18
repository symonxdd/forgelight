import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ForgeError, forgePost } from "./client";

export interface CivitaiInfo {
  status: "found" | "not_found" | "pending" | "error";
  name?: string;
  version?: string;
  type?: string;
  baseModel?: string;
  nsfw?: boolean;
  trainedWords?: string[];
  url?: string;
}

export interface ModelEntry {
  kind: "checkpoint" | "lora";
  /** Forge's checkpoint title, used to select it. */
  title: string | null;
  file: string;
  stem: string;
  size: number;
  /** Model family read from the file itself: "sd1", "sdxl", "flux" or "unknown". */
  arch: "sd1" | "sdxl" | "flux" | "unknown";
  civitai: CivitaiInfo;
}

export interface StartupState {
  openOnStart: boolean;
  desktopShortcut: boolean;
}

export type LoadingStage = "unloading" | "reading" | "building" | "moving";

/** What Forge is doing to load a checkpoint, read by the extension from Forge's own thread. */
export interface LoadingState {
  /** The next generation loads the selected checkpoint first. */
  pending: boolean;
  checkpoint: string | null;
  stage: LoadingStage | null;
  /** 0 to 1 while reading the file or setting up the model's parts, otherwise null. */
  progress: number | null;
  /** While reading: whether the file is the checkpoint itself rather than an extra module. */
  isCheckpoint?: boolean;
}

/** Calls one of the extension's own endpoints under /forgelight/api/. */
export async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/forgelight/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `Forgelight returned ${response.status}`;
    try {
      message = ((await response.json()) as { detail?: string }).detail ?? message;
    } catch {
      // keep the generic message
    }
    throw new ForgeError(response.status, message);
  }
  return (await response.json()) as T;
}

/** Checkpoints and LoRAs with Civitai details. Polls while lookups are still running. */
export function useModels(enabled = true) {
  return useQuery({
    queryKey: ["forgelight-models"],
    queryFn: () => request<{ checkpoints: ModelEntry[]; loras: ModelEntry[] }>("models"),
    enabled,
    staleTime: 60_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const pending = data && [...data.checkpoints, ...data.loras].some((m) => m.civitai.status === "pending");
      return pending ? 3000 : false;
    },
  });
}

export function useStartup() {
  return useQuery({ queryKey: ["forgelight-startup"], queryFn: () => request<StartupState>("startup") });
}

const OPEN_ON_START = ["open-on-start"];

/**
 * Flips the switch at once and confirms with Forge in the background. Rapid clicks
 * are sent one after another, in order, and the true state is read back only once
 * the last one is done, so the switch never jumps back mid-way.
 */
export function useSetOpenOnStart() {
  const queryClient = useQueryClient();
  const key = ["forgelight-startup"];
  return useMutation({
    mutationKey: OPEN_ON_START,
    scope: { id: "open-on-start" },
    mutationFn: (enabled: boolean) => request<StartupState>("startup/open-on-start", { enabled }),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<StartupState>(key);
      if (previous) queryClient.setQueryData<StartupState>(key, { ...previous, openOnStart: enabled });
    },
    onSettled: () => {
      // This mutation still counts itself; anything above 1 means more clicks are queued.
      if (queryClient.isMutating({ mutationKey: OPEN_ON_START }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useCreateDesktopShortcut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => request<StartupState>("startup/desktop-shortcut", {}),
    onSuccess: (state) => queryClient.setQueryData(["forgelight-startup"], state),
  });
}

/** Shuts Forge down. The reply comes back before Forge exits. */
export function useStopForge() {
  return useMutation({ mutationFn: () => request<{ ok: boolean }>("forge/stop", {}) });
}

/** Asks Forge to rescan its Lora folder (new downloads), then reloads the list shown here. */
export function useRefreshLoras() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => forgePost("/sdapi/v1/refresh-loras"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["forgelight-models"] }),
  });
}

/** Asks Forge to rescan its checkpoint folder, then reloads the lists shown here. */
export function useRefreshCheckpoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => forgePost("/sdapi/v1/refresh-checkpoints"),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sd-models"] }),
        queryClient.invalidateQueries({ queryKey: ["forgelight-models"] }),
      ]),
  });
}
