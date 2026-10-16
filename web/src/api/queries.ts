import { useQuery } from "@tanstack/react-query";
import { findCheckpoint } from "./checkpoints";
import { ForgeError, forgeGet } from "./client";

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

export function useCurrentCheckpoint(enabled: boolean) {
  const checkpoints = useCheckpoints(enabled);
  const options = useQuery({
    queryKey: ["options"],
    queryFn: ({ signal }) => forgeGet("/sdapi/v1/options", signal),
    enabled,
    refetchInterval: 10_000,
  });
  const setting = options.data?.sd_model_checkpoint as string | null | undefined;
  return {
    setting,
    checkpoint: findCheckpoint(checkpoints.data ?? [], setting),
    isLoading: checkpoints.isPending || options.isPending,
  };
}
