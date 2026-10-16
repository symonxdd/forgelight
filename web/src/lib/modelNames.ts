import type { CivitaiInfo } from "../api/forgelight";

/**
 * Turns a model file name into something readable when Civitai doesn't know it:
 * "blackPearlSDXL_v170" becomes "Black Pearl SDXL v170".
 */
export function tidyName(stem: string): string {
  const spaced = stem
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return spaced
    .split(" ")
    .map((word) =>
      word.length > 2 && /^[a-z]/.test(word) && !/^v\d/.test(word) ? word[0]!.toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

/** A short label for Civitai's base model, e.g. "SDXL 1.0" becomes "SDXL". */
export function baseModelLabel(baseModel: string | undefined): string | undefined {
  if (!baseModel) return undefined;
  return baseModel.replace(/\s+1\.0$/, "").replace(/^SD 1\.5$/, "SD 1.5");
}

/** The name to show for a model: Civitai's when known, otherwise the tidied file name. */
export function displayName(stem: string, civitai: CivitaiInfo | undefined): { name: string; detail?: string } {
  if (civitai?.status === "found" && civitai.name) return { name: civitai.name, detail: civitai.version };
  return { name: tidyName(stem) };
}
