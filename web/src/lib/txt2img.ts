import { promptWithLoras, type LoraSlot } from "./loras";
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
  /** Added to the prompt as <lora:name:weight> tags only when the request is built. */
  loras: LoraSlot[];
  /** Hires fix: a second pass that redraws the image at a larger size. */
  hiresEnabled: boolean;
  hiresScale: number;
  hiresUpscaler: string;
  /** Forge's "denoising strength": how much the second pass may change. */
  hiresDenoise: number;
  /** Image to image: how much the new image may differ from the starting image (Forge's denoising strength). */
  img2imgStrength: number;
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
  loras: [],
  hiresEnabled: false,
  hiresScale: 1.5,
  hiresUpscaler: "R-ESRGAN 4x+",
  hiresDenoise: 0.4,
  img2imgStrength: 0.6,
};

/** The size after hires fix, computed the way Forge does. */
export function hiresSize(width: number, height: number, scale: number): { width: number; height: number } {
  return {
    width: Math.floor(normalizeSize(width) * scale),
    height: Math.floor(normalizeSize(height) * scale),
  };
}

/**
 * Hires fix fields. Forge needs a few spelled out: `hr_additional_modules` must be a
 * list, and without `hr_cfg` the second pass runs at CFG 1, ignoring the negative prompt.
 */
function hiresFields(settings: GenerationSettings) {
  if (!settings.hiresEnabled) return { enable_hr: false };
  return {
    enable_hr: true,
    hr_scale: settings.hiresScale,
    hr_upscaler: settings.hiresUpscaler,
    denoising_strength: settings.hiresDenoise,
    hr_second_pass_steps: 0,
    hr_resize_x: 0,
    hr_resize_y: 0,
    hr_cfg: settings.cfgScale,
    hr_sampler_name: settings.sampler,
    hr_scheduler: settings.scheduler,
    hr_checkpoint_name: "Use same checkpoint",
    hr_additional_modules: ["Use same choices"],
    hr_prompt: "",
    hr_negative_prompt: "",
  };
}

/**
 * The fields txt2img and img2img requests share. Two Forge shortcuts are deliberately
 * avoided: `infotext` crashes on every request in original Forge, and `override_settings`
 * leaves settings that were at their default value changed in memory afterwards.
 */
export function commonFields(settings: GenerationSettings, taskId: string) {
  return {
    prompt: promptWithLoras(settings.prompt, settings.loras),
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

export function buildTxt2imgRequest(settings: GenerationSettings, taskId: string) {
  return { ...commonFields(settings, taskId), ...hiresFields(settings) };
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
    return "The graphics card ran out of memory. Try a smaller size, a lower Hires fix upscale, or fewer images at once.";
  }
  if (/interrupted/i.test(message)) return "Generation was stopped.";
  return message || "Forge reported an error. Check the Forge console window for details.";
}
