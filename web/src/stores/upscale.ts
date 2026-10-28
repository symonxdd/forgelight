import { create } from "zustand";
import { DEFAULT_UPSCALER, isLatentUpscaler, type UpscaleMethod } from "../lib/upscale";
import { applyGenerationData } from "./applySettings";
import { useSession } from "./session";
import { useSettings } from "./settings";
import { removeStartImage, useStartImage } from "./startImage";

export interface UpscaleSource {
  /** For showing the thumbnail. */
  url: string;
  /** The PNG sent to Forge. */
  dataUrl: string;
  /** The image's real size, read from the file. */
  width: number;
  height: number;
  /** Its settings text, kept in the upscaled copy. */
  infotext: string;
  /** Its file name, which an upscaled copy's name repeats. */
  name: string;
}

interface UpscaleState {
  source: UpscaleSource | null;
  method: UpscaleMethod;
  enhanceScale: number;
  upscaleScale: number;
  upscaler: string;
  /** How much Enhance may redraw (Forge's denoising strength). */
  strength: number;
  update: (changes: Partial<Omit<UpscaleState, "update" | "source">>) => void;
}

/**
 * An existing image to enlarge. While one is attached, Generate upscales it instead of
 * making a new image. Kept in memory only, like the starting image.
 */
export const useUpscale = create<UpscaleState>((set) => ({
  source: null,
  method: "enhance",
  enhanceScale: 1.5,
  upscaleScale: 2,
  upscaler: DEFAULT_UPSCALER,
  strength: 0.4,
  update: (changes) => set(changes),
}));

// A starting image and an image to upscale exclude each other: attaching one drops the other.
useStartImage.subscribe((state) => {
  if (state.image && useUpscale.getState().source) useUpscale.setState({ source: null });
});

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the image."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Attaches an image for upscaling, from the Library or this session. Its prompt and settings
 * are filled in, as Enhance redraws with them, and the card starts from the Hires fix values.
 */
export async function attachUpscale(image: { url: string; infotext: string; name: string }): Promise<void> {
  const { showNotice } = useSession.getState();
  let source: UpscaleSource;
  try {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    source = {
      url: image.url,
      dataUrl: await blobToDataUrl(blob),
      width: bitmap.width,
      height: bitmap.height,
      infotext: image.infotext,
      name: image.name,
    };
    bitmap.close();
  } catch {
    showNotice({ tone: "warning", text: "Couldn't load that image." });
    return;
  }
  removeStartImage();
  if (image.infotext) await applyGenerationData(image.infotext).catch(() => undefined);
  const hires = useSettings.getState();
  useUpscale.setState({
    source,
    enhanceScale: hires.hiresScale,
    upscaler: isLatentUpscaler(hires.hiresUpscaler) ? DEFAULT_UPSCALER : hires.hiresUpscaler,
    strength: hires.hiresDenoise,
  });
}

export function removeUpscale(): void {
  useUpscale.setState({ source: null });
}
