import { useCallback, useMemo } from "react";
import { useModels } from "../api/forgelight";
import { displayName, tidyName } from "../lib/modelNames";

/** Readable names for the checkpoints named in images, using Civitai's name when known. */
export function useModelLabels(): (name: string) => string {
  const models = useModels();
  const byStem = useMemo(
    () => new Map((models.data?.checkpoints ?? []).map((m) => [m.stem, displayName(m.stem, m.civitai).name])),
    [models.data],
  );
  return useCallback((name: string) => byStem.get(name) ?? tidyName(name), [byStem]);
}
