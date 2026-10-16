import type { Schemas } from "./client";

type Checkpoint = Schemas["SDModelItem"];

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/**
 * Finds the checkpoint matching Forge's `sd_model_checkpoint` setting, which may hold
 * a title ("name.safetensors [hash]"), a file name or a bare model name.
 */
export function findCheckpoint(checkpoints: readonly Checkpoint[], setting: string | null | undefined) {
  if (!setting) return undefined;
  return checkpoints.find(
    (c) =>
      c.title === setting ||
      c.title.split(" [")[0] === setting ||
      fileName(c.filename) === setting ||
      c.model_name === setting,
  );
}

/** A readable name: the model name without its folder or file extension. */
export function checkpointLabel(checkpoint: Checkpoint | undefined, setting?: string | null): string {
  if (checkpoint) return checkpoint.model_name;
  if (setting) return fileName(setting.split(" [")[0] ?? setting).replace(/\.(safetensors|ckpt)$/i, "");
  return "No checkpoint";
}
