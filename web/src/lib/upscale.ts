import { normalizeSize } from "./sizes";
import { commonFields, type GenerationSettings } from "./txt2img";

/**
 * Enhance enlarges an existing image and redraws it lightly at the larger size, the same as
 * hires fix does for a new one. Upscale only enlarges it, without redrawing.
 */
export type UpscaleMethod = "enhance" | "upscale";

export interface Size {
  width: number;
  height: number;
}

/** The size after upscaling. Enhance stays on Forge's 8-pixel grid, which the model needs. */
export function upscaleTarget(size: Size, scale: number, method: UpscaleMethod): Size {
  const round = method === "enhance" ? normalizeSize : Math.round;
  return { width: round(size.width * scale), height: round(size.height * scale) };
}

/** Latent upscalers work inside the model during hires fix; they can't enlarge a finished image. */
export function isLatentUpscaler(name: string): boolean {
  return name.startsWith("Latent");
}

export const DEFAULT_UPSCALER = "R-ESRGAN 4x+";

/** The upscalers that can enlarge a finished image. */
export function imageUpscalers(all: readonly string[]): string[] {
  return all.filter((name) => !isLatentUpscaler(name));
}

/** Forge's Extras upscale, to exactly the target size. Forge returns the image and saves nothing. */
export function buildExtrasRequest(image: string, target: Size, upscaler: string) {
  return {
    image,
    resize_mode: 1,
    upscaling_resize_w: target.width,
    upscaling_resize_h: target.height,
    upscaling_crop: true,
    upscaler_1: upscaler,
    show_extras_results: true,
  };
}

/**
 * The redraw of an enlarged image: image to image at its own size with a low strength, one
 * image, saved by Forge like any other.
 */
export function buildEnhanceRequest(
  settings: GenerationSettings,
  enlarged: string,
  target: Size,
  strength: number,
  taskId: string,
) {
  return {
    ...commonFields({ ...settings, ...target, batchCount: 1 }, taskId),
    init_images: [enlarged],
    denoising_strength: strength,
    resize_mode: 0,
    include_init_images: false,
  };
}
