import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ForgeError } from "./client";

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
  civitai: CivitaiInfo;
}

export interface StartupState {
  openOnStart: boolean;
  desktopShortcut: boolean;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
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

export function useSetOpenOnStart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => request<StartupState>("startup/open-on-start", { enabled }),
    onSuccess: (state) => queryClient.setQueryData(["forgelight-startup"], state),
  });
}

export function useCreateDesktopShortcut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => request<StartupState>("startup/desktop-shortcut", {}),
    onSuccess: (state) => queryClient.setQueryData(["forgelight-startup"], state),
  });
}
