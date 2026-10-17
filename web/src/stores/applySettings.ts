import type { Schemas } from "../api/client";
import { forgePost } from "../api/client";
import { findCheckpoint } from "../api/checkpoints";
import { queryClient } from "../api/queryClient";
import { modelFromInfotext, parseInfotext, settingsFromInfotext } from "../lib/infotext";
import { matchCheckpoint } from "../lib/matchCheckpoint";
import { cancelExpectedSwitch, expectCheckpointSwitch } from "./checkpointMemory";
import { useSession } from "./session";
import { useSettings } from "./settings";

/**
 * Fills in every setting from generation data. When the data names a checkpoint
 * that is installed, it is selected too, the same as picking it by hand.
 */
export async function applyGenerationData(text: string): Promise<void> {
  const { setNotice, job } = useSession.getState();
  const parsed = parseInfotext(text);
  const model = modelFromInfotext(parsed);
  const checkpoints = queryClient.getQueryData<Schemas["SDModelItem"][]>(["sd-models"]) ?? [];
  const options = queryClient.getQueryData<Record<string, unknown>>(["options"]);
  const match = model.name || model.hash ? matchCheckpoint(checkpoints, model) : undefined;
  const current = findCheckpoint(checkpoints, options?.sd_model_checkpoint as string | undefined);
  const switching = match !== undefined && current?.title !== match.title && job.status !== "running";

  // These settings go with the checkpoint switched to below, not the one still selected.
  if (switching) expectCheckpointSwitch(match.model_name);
  useSettings.getState().update(settingsFromInfotext(parsed));

  if (!model.name && !model.hash) return setNotice({ tone: "info", text: "Settings applied." });
  if (!match) {
    return setNotice({
      tone: "warning",
      text: `Settings applied. The checkpoint ${model.name ?? model.hash} isn't installed, so the current one stays selected.`,
    });
  }
  if (current?.title === match.title) return setNotice({ tone: "info", text: "Settings applied." });
  if (job.status === "running") {
    return setNotice({
      tone: "warning",
      text: `Settings applied. Switch to ${match.model_name} once the current generation finishes.`,
    });
  }
  try {
    await forgePost("/sdapi/v1/options", { sd_model_checkpoint: match.title });
  } catch (error) {
    cancelExpectedSwitch();
    throw error;
  }
  await queryClient.invalidateQueries({ queryKey: ["options"] });
  setNotice({ tone: "info", text: `Settings applied and checkpoint switched to ${match.model_name}.` });
}
