import { useQuery } from "@tanstack/react-query";
import type { FoundModelInfo } from "../lib/newModels";
import { usePreferences } from "../stores/preferences";
import { request, type CivitaiInfo, type ModelEntry } from "./forgelight";

export interface FoundModel extends FoundModelInfo {
  stem: string;
  arch: ModelEntry["arch"];
  civitai: CivitaiInfo;
}

export interface MovedModel {
  /** The name in Forge's folder. */
  file: string;
  kind: FoundModel["kind"];
  targetLabel: string;
}

export const NEW_MODELS_KEY = ["new-models"];

/**
 * New checkpoints and LoRAs in Downloads and on the Desktop. Looked for every 30 seconds
 * and whenever the window comes back into focus, unless switched off in settings.
 */
export function useFoundModels() {
  const enabled = usePreferences((s) => s.findNewModels);
  return useQuery({
    queryKey: NEW_MODELS_KEY,
    queryFn: () => request<{ models: FoundModel[] }>("new-models"),
    enabled,
    select: (data) => data.models,
    refetchInterval: (query) => (query.state.data?.models.some((m) => m.civitai.status === "pending") ? 3000 : 30_000),
  });
}

export function moveModel(found: FoundModel): Promise<MovedModel> {
  return request<MovedModel>("new-models/move", { place: found.place, file: found.file, size: found.size });
}

export function setModelHidden(found: FoundModel, hidden: boolean): Promise<unknown> {
  return request("new-models/hide", { file: found.file, size: found.size, hidden });
}

export function revealModel(moved: MovedModel): Promise<unknown> {
  return request("new-models/reveal", { kind: moved.kind, file: moved.file });
}
