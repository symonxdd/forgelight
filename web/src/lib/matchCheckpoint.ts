import type { Schemas } from "../api/client";

type Checkpoint = Schemas["SDModelItem"];

/**
 * Finds an installed checkpoint by the hash or name in an image's settings text.
 * The hash is most reliable; Forge only knows it for checkpoints it has loaded before.
 */
export function matchCheckpoint(
  checkpoints: readonly Checkpoint[],
  model: { name?: string; hash?: string },
): Checkpoint | undefined {
  const hash = model.hash?.toLowerCase();
  if (hash) {
    const byHash = checkpoints.find((c) => c.hash?.toLowerCase() === hash || c.sha256?.toLowerCase().startsWith(hash));
    if (byHash) return byHash;
  }
  const name = model.name?.toLowerCase();
  if (!name) return undefined;
  return checkpoints.find(
    (c) => c.model_name.toLowerCase() === name || c.model_name.toLowerCase().endsWith(`_${name}`),
  );
}
