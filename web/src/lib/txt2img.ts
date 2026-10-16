import { normalizeSize } from "./sizes";

export interface GenerationSettings {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  scheduler: string;
  /** -1 means a new random seed for every generation. */
  seed: number;
  batchCount: number;
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  prompt: "",
  negativePrompt: "",
  width: 832,
  height: 1216,
  steps: 25,
  cfgScale: 5,
  sampler: "DPM++ 2M",
  scheduler: "Karras",
  seed: -1,
  batchCount: 1,
};

/**
 * Builds an explicit txt2img request. Two Forge shortcuts are deliberately avoided:
 * `infotext` crashes on every request in original Forge, and `override_settings`
 * leaves settings that were at their default value changed in memory afterwards.
 */
export function buildTxt2imgRequest(settings: GenerationSettings, taskId: string) {
  return {
    prompt: settings.prompt,
    negative_prompt: settings.negativePrompt,
    width: normalizeSize(settings.width),
    height: normalizeSize(settings.height),
    steps: settings.steps,
    cfg_scale: settings.cfgScale,
    sampler_name: settings.sampler,
    scheduler: settings.scheduler,
    seed: settings.seed,
    batch_size: 1,
    n_iter: settings.batchCount,
    // Images are saved to Forge's outputs folder exactly as the classic page does.
    save_images: true,
    send_images: true,
    force_task_id: taskId,
  };
}

export interface GeneratedImage {
  base64: string;
  seed: number;
  infotext: string;
}

interface ResultInfo {
  all_seeds?: number[];
  infotexts?: string[];
  index_of_first_image?: number;
}

/**
 * Pairs each returned image with its seed and settings text. When Forge adds an
 * overview grid for a batch, it comes first and is skipped.
 */
export function parseTxt2imgResult(images: readonly string[], infoJson: string): GeneratedImage[] {
  let info: ResultInfo = {};
  try {
    info = JSON.parse(infoJson) as ResultInfo;
  } catch {
    // Without info the images are still shown, just without settings.
  }
  const first = info.index_of_first_image ?? 0;
  const seeds = info.all_seeds ?? [];
  const infotexts = info.infotexts ?? [];
  return images.slice(first).map((base64, i) => ({
    base64,
    seed: seeds[i] ?? -1,
    infotext: infotexts[i + first] ?? "",
  }));
}

/** Turns Forge's error replies into something a person can act on. */
export function friendlyError(message: string): string {
  if (/out of memory|OutOfMemory/i.test(message)) {
    return "The graphics card ran out of memory. Try a smaller size or fewer images at once.";
  }
  if (/interrupted/i.test(message)) return "Generation was stopped.";
  return message || "Forge reported an error. Check the Forge console window for details.";
}
