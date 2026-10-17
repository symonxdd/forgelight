import { useEffect } from "react";
import { useModels } from "../api/forgelight";
import { useCurrentCheckpoint } from "../api/queries";
import { displayName, tidyName } from "../lib/modelNames";
import { checkpointChanged } from "../stores/checkpointMemory";

/** Watches Forge's checkpoint, on both screens, and swaps in its remembered settings. */
export function useCheckpointMemory(connected: boolean): void {
  const { checkpoint } = useCurrentCheckpoint(connected);
  const models = useModels(connected);
  const key = checkpoint?.model_name;
  const entry = models.data?.checkpoints.find((m) => m.title === checkpoint?.title);
  const name = entry ? displayName(entry.stem, entry.civitai).name : tidyName(key ?? "");

  useEffect(() => {
    if (key) checkpointChanged(key, name);
  }, [key, name]);
}
