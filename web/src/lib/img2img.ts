import { normalizeSize } from "./sizes";
import { commonFields, type GenerationSettings } from "./txt2img";

/** The pixel count a model family was trained at: SD 1.5 at 512 × 512, the rest around one megapixel. */
export function nativeArea(arch: string | undefined): number {
  return arch === "sd1" ? 512 * 512 : 1024 * 1024;
}

/**
 * A size with the starting image's shape and about `area` pixels, on Forge's 8-pixel grid.
 * Close to the model's native size, so the result looks right, whatever size the image was.
 */
export function fitToArea(width: number, height: number, area: number): { width: number; height: number } {
  const ratio = width / height;
  const fittedHeight = Math.sqrt(area / ratio);
  return { width: normalizeSize(fittedHeight * ratio), height: normalizeSize(fittedHeight) };
}

/**
 * An img2img request: the shared fields plus the starting image. Img2img has no hires fix.
 * "Crop and resize" (resize mode 1) keeps the image undistorted if the size was changed to
 * another shape; when the shapes match, it is the same as a plain resize.
 */
export function buildImg2imgRequest(settings: GenerationSettings, initImage: string, taskId: string) {
  return {
    ...commonFields(settings, taskId),
    init_images: [initImage],
    denoising_strength: settings.img2imgStrength,
    resize_mode: 1,
    include_init_images: false,
  };
}
