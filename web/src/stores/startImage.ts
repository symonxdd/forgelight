import { create } from "zustand";
import type { ModelEntry } from "../api/forgelight";
import { queryClient } from "../api/queryClient";
import { fitToArea, nativeArea } from "../lib/img2img";
import { useSession } from "./session";
import { useSettings } from "./settings";

/** Larger images are scaled down first: Forge resizes to about one megapixel anyway. */
const MAX_SIDE = 4096;

export interface StartImage {
  /** For showing the thumbnail. */
  url: string;
  /** The PNG sent to Forge. */
  dataUrl: string;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

interface StartImageState {
  image: StartImage | null;
  /** The size before the first image was attached, brought back when it is removed. */
  sizeBefore: Size | null;
  /** The size fitted to the image; if the user changed it since, removal leaves it alone. */
  fitted: Size | null;
}

/**
 * The starting image for image to image. While one is attached, Generate makes a new
 * version of it. Kept in memory only: images are too large for the browser's storage.
 */
export const useStartImage = create<StartImageState>(() => ({ image: null, sizeBefore: null, fitted: null }));

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the image."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes any image the browser can open (honoring a photo's rotation) and redraws it as
 * a PNG, so Forge always receives one plain format.
 */
async function toPng(blob: Blob): Promise<StartImage> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not prepare the image."))), "image/png"),
  );
  return { url: URL.createObjectURL(png), dataUrl: await blobToDataUrl(png), width, height };
}

/** The selected checkpoint's model family, if known, for its native size. */
function currentArch(): string | undefined {
  const options = queryClient.getQueryData<Record<string, unknown>>(["options"]);
  const title = options?.sd_model_checkpoint;
  const models = queryClient.getQueryData<{ checkpoints: ModelEntry[] }>(["forgelight-models"]);
  return models?.checkpoints.find((c) => c.title === title)?.arch;
}

function sameSize(a: Size | null, b: Size): boolean {
  return a !== null && a.width === b.width && a.height === b.height;
}

/**
 * Attaches an image and fits the Size to its shape. A `confirmation` message, with Undo, is
 * shown for images that arrive without a deliberate click, such as pasted ones.
 */
export async function attachStartImage(blob: Blob, confirmation?: string): Promise<void> {
  const session = useSession.getState();
  let image: StartImage;
  try {
    image = await toPng(blob);
  } catch {
    session.setNotice({ tone: "warning", text: "That file isn't an image Forgelight can open." });
    return;
  }
  const previous = useStartImage.getState();
  const settings = useSettings.getState();
  const before: Size = { width: settings.width, height: settings.height };
  const fitted = fitToArea(image.width, image.height, nativeArea(currentArch()));
  useStartImage.setState({
    image,
    sizeBefore: previous.image ? previous.sizeBefore : before,
    fitted,
  });
  settings.update(fitted);
  if (confirmation) {
    session.setNotice({
      tone: "info",
      text: confirmation,
      action: {
        label: "Undo",
        run: () => {
          useStartImage.setState(previous);
          if (sameSize(fitted, useSettings.getState())) useSettings.getState().update(before);
        },
      },
    });
  }
}

/** Removes the image; the Size goes back to what it was, unless it was changed meanwhile. */
export function removeStartImage(): void {
  const { fitted, sizeBefore } = useStartImage.getState();
  if (sizeBefore && sameSize(fitted, useSettings.getState())) useSettings.getState().update(sizeBefore);
  useStartImage.setState({ image: null, sizeBefore: null, fitted: null });
}

/** Uses an image already in Forgelight (a result or a Library image) as the starting image. */
export async function startFromImage(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    await attachStartImage(await response.blob());
  } catch {
    useSession.getState().setNotice({ tone: "warning", text: "Couldn't load that image." });
  }
}
