import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { findCheckpoint } from "./checkpoints";
import { ForgeError, forgeGet, forgePost } from "./client";

export type ConnectionState = "connecting" | "connected" | "api-off" | "offline";

/** Polls Forge so the interface notices when it starts, stops or runs without --api. */
export function useConnection(): ConnectionState {
  const { status, error } = useQuery({
    queryKey: ["connection"],
    queryFn: ({ signal }) => forgeGet("/sdapi/v1/samplers", signal),
    refetchInterval: 4000,
    retry: false,
  });
  if (status === "pending") return "connecting";
  if (status === "success") return "connected";
  return error instanceof ForgeError && error.status === 404 ? "api-off" : "offline";
}

export function useCheckpoints(enabled: boolean) {
  return useQuery({
    queryKey: ["sd-models"],
    queryFn: ({ signal }) => forgeGet("/sdapi/v1/sd-models", signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useSamplers() {
  return useQuery({
    queryKey: ["samplers"],
    queryFn: ({ signal }) => forgeGet("/sdapi/v1/samplers", signal),
    staleTime: Infinity,
    select: (samplers) => samplers.map((s) => s.name),
  });
}

export function useSchedulers() {
  return useQuery({
    queryKey: ["schedulers"],
    queryFn: ({ signal }) => forgeGet("/sdapi/v1/schedulers", signal),
    staleTime: Infinity,
    // Forge's own dropdown and the settings text in images use the label ("Karras").
    select: (schedulers) => schedulers.map((s) => s.label),
  });
}

/**
 * Picks the checkpoint Forge uses, the same as choosing it in the classic page.
 * Forge loads the file at the next generation, not now.
 */
export function useSetCheckpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => forgePost("/sdapi/v1/options", { sd_model_checkpoint: title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["options"] }),
  });
}

/** Forge's settings, kept fresh so changes made in the classic page show up here too. */
export function useOptions(enabled = true) {
  return useQuery({
    queryKey: ["options"],
    queryFn: ({ signal }) => forgeGet("/sdapi/v1/options", signal),
    enabled,
    refetchInterval: 10_000,
  });
}

/**
 * Changes Forge settings, exactly like changing them in Forge's own settings page:
 * they apply to the classic page too and are saved. Only ever called from a control
 * the user operates.
 */
export function useSetOptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: Record<string, unknown>) => forgePost("/sdapi/v1/options", changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["options"] }),
  });
}

export function useCurrentCheckpoint(enabled: boolean) {
  const checkpoints = useCheckpoints(enabled);
  const options = useOptions(enabled);
  const setting = options.data?.sd_model_checkpoint as string | null | undefined;
  return {
    setting,
    checkpoint: findCheckpoint(checkpoints.data ?? [], setting),
    isLoading: checkpoints.isPending || options.isPending,
  };
}
