export interface SizePreset {
  label: string;
  width: number;
  height: number;
}

/** SDXL-friendly sizes around one megapixel, the resolutions SDXL-based checkpoints are trained on. */
export const SIZE_PRESETS: readonly SizePreset[] = [
  { label: "1:1", width: 1024, height: 1024 },
  { label: "2:3", width: 832, height: 1216 },
  { label: "3:4", width: 896, height: 1152 },
  { label: "9:16", width: 768, height: 1344 },
  { label: "3:2", width: 1216, height: 832 },
  { label: "4:3", width: 1152, height: 896 },
  { label: "16:9", width: 1344, height: 768 },
];

export const MIN_SIZE = 256;
export const MAX_SIZE = 2048;
export const SIZE_STEP = 8;

/** Forge works in multiples of 8 pixels; clamp and round any typed value onto that grid. */
export function normalizeSize(value: number): number {
  if (!Number.isFinite(value)) return MIN_SIZE;
  const rounded = Math.round(value / SIZE_STEP) * SIZE_STEP;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, rounded));
}

export function matchPreset(width: number, height: number): SizePreset | undefined {
  return SIZE_PRESETS.find((p) => p.width === width && p.height === height);
}
