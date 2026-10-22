import type { RememberedSettings } from "./checkpointMemory";
import { normalizeSize } from "./sizes";

/** The settings of one example image on a model's Civitai page, as the extension keeps them. */
export interface CivitaiExample {
  sampler?: string;
  scheduler?: string;
  steps?: number;
  cfgScale?: number;
  width?: number;
  height?: number;
  hiresScale?: number;
  hiresUpscaler?: string;
  hiresDenoise?: number;
  loraWeight?: number;
  /** The image also went through ADetailer, an extension that redraws faces. */
  adetailer?: boolean;
}

export interface Recommendation {
  /** How many example images carried settings. */
  examples: number;
  /** Only what the examples agree on enough to suggest; everything else stays as it is. */
  settings: Partial<RememberedSettings>;
  /** Most examples also used ADetailer, which Forgelight has no controls for. */
  adetailer: boolean;
}

/** "DPM++ 2M", "dpmpp_2m" and "k_dpmpp_2m" all become "dpmpp2m"; "ancestral" is shortened to "a". */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/^k_/, "")
    .replace(/\+\+/g, "pp")
    .replace(/ancestral/g, "a")
    .replace(/[^a-z0-9]/g, "");
}

function findName(options: readonly string[], raw: string): string | undefined {
  const wanted = normalize(raw);
  return options.find((option) => normalize(option) === wanted);
}

/**
 * Maps a sampler as written on Civitai to Forge's names. Older images name the schedule
 * inside the sampler ("DPM++ 2M Karras"), images from ComfyUI use its own spelling
 * ("dpmpp_2m"). Anything without a match in Forge is left out.
 */
export function matchSampler(
  sampler: string | undefined,
  scheduler: string | undefined,
  samplers: readonly string[],
  schedulers: readonly string[],
): { sampler?: string; scheduler?: string } {
  const matchedScheduler = scheduler ? findName(schedulers, scheduler) : undefined;
  if (!sampler) return { scheduler: matchedScheduler };
  const direct = findName(samplers, sampler);
  if (direct) return { sampler: direct, scheduler: matchedScheduler };
  for (const option of schedulers) {
    const suffix = new RegExp(`[\\s_]+${option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (!suffix.test(sampler)) continue;
    const base = findName(samplers, sampler.replace(suffix, ""));
    if (base) return { sampler: base, scheduler: matchedScheduler ?? option };
  }
  return { scheduler: matchedScheduler };
}

/** The most common value; on a tie, the one seen first. */
function mostCommon<T>(values: readonly T[], key: (value: T) => string = String): T | undefined {
  const counts = new Map<string, { value: T; count: number }>();
  for (const value of values) {
    const k = key(value);
    const entry = counts.get(k);
    if (entry) entry.count += 1;
    else counts.set(k, { value, count: 1 });
  }
  let best: { value: T; count: number } | undefined;
  for (const entry of counts.values()) if (!best || entry.count > best.count) best = entry;
  return best?.value;
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Rounds to a step such as 0.05. Dividing, not multiplying by the step, gives 0.35, not 0.35000000000000003. */
function roundTo(value: number, step: number): number {
  const perUnit = Math.round(1 / step);
  return Math.round(value * perUnit) / perUnit;
}

function defined<T>(values: readonly (T | undefined)[]): T[] {
  return values.filter((v): v is T => v !== undefined);
}

/**
 * The typical settings across a model's example images: the most common sampler and size,
 * the middle value for steps and CFG scale. When most examples used hires fix, its values are
 * filled in, but it is never switched on: images are tried at the base size first, and hires
 * fix is for the ones worth redrawing larger. Null when no example carried settings.
 */
export function recommend(
  examples: readonly CivitaiExample[],
  forge: { samplers: readonly string[]; schedulers: readonly string[]; upscalers: readonly string[] },
): Recommendation | null {
  const usable = examples.filter((e) => e.sampler || e.steps || e.cfgScale || (e.width && e.height));
  if (usable.length === 0) return null;
  const settings: Partial<RememberedSettings> = {};

  const methods = usable.map((e) => matchSampler(e.sampler, e.scheduler, forge.samplers, forge.schedulers));
  const sampler = mostCommon(defined(methods.map((m) => m.sampler)));
  if (sampler) {
    settings.sampler = sampler;
    const scheduler = mostCommon(defined(methods.filter((m) => m.sampler === sampler).map((m) => m.scheduler)));
    if (scheduler) settings.scheduler = scheduler;
  }

  const steps = median(defined(usable.map((e) => e.steps)).filter((n) => n >= 1 && n <= 150));
  if (steps !== undefined) settings.steps = Math.round(steps);
  const cfg = median(defined(usable.map((e) => e.cfgScale)).filter((n) => n >= 1 && n <= 30));
  if (cfg !== undefined) settings.cfgScale = roundTo(cfg, 0.5);

  const sizes = usable
    .filter((e) => e.width && e.height)
    .map((e) => ({ width: normalizeSize(e.width ?? 0), height: normalizeSize(e.height ?? 0) }));
  const size = mostCommon(sizes, (s) => `${s.width}x${s.height}`);
  if (size) Object.assign(settings, size);

  const hires = usable.filter((e) => e.hiresScale && e.hiresScale > 1);
  if (hires.length > usable.length / 2) {
    const scale = mostCommon(defined(hires.map((e) => e.hiresScale)));
    if (scale) settings.hiresScale = Math.min(4, roundTo(scale, 0.05));
    const upscaler = mostCommon(defined(hires.map((e) => e.hiresUpscaler)));
    const installed = upscaler ? findName(forge.upscalers, upscaler) : undefined;
    if (installed) settings.hiresUpscaler = installed;
    const denoise = median(defined(hires.map((e) => e.hiresDenoise)).filter((n) => n > 0 && n <= 1));
    if (denoise !== undefined) settings.hiresDenoise = roundTo(denoise, 0.05);
  }

  const adetailer = usable.filter((e) => e.adetailer).length > usable.length / 2;
  return { examples: usable.length, settings, adetailer };
}

/** The LoRA strength most examples used, or undefined when they don't say. */
export function recommendedLoraWeight(examples: readonly CivitaiExample[]): number | undefined {
  const weight = median(defined(examples.map((e) => e.loraWeight)).filter((n) => n > -4 && n <= 4));
  return weight === undefined ? undefined : roundTo(weight, 0.05);
}

/** The card's lines: how the image is made, its size, and hires fix values for when it is switched on. */
export function describeSettings(settings: Partial<RememberedSettings>): {
  method: string;
  size: string;
  hires: string;
} {
  const { sampler, scheduler, steps, cfgScale, width, height, hiresScale, hiresUpscaler, hiresDenoise } = settings;
  const method = [
    sampler && scheduler && scheduler !== "Automatic" ? `${sampler} ${scheduler}` : sampler,
    steps !== undefined ? `${steps} steps` : undefined,
    cfgScale !== undefined ? `CFG ${cfgScale}` : undefined,
  ];
  const hires = [
    hiresScale !== undefined ? `${hiresScale}×` : undefined,
    hiresDenoise !== undefined ? `detail ${hiresDenoise}` : undefined,
    hiresUpscaler,
  ];
  return {
    method: method.filter(Boolean).join(" · "),
    size: width && height ? `${width} × ${height}` : "",
    hires: hires.filter(Boolean).join(" · "),
  };
}

/** True when every recommended value is already in use. */
export function isApplied(settings: Partial<RememberedSettings>, current: RememberedSettings): boolean {
  return (Object.keys(settings) as (keyof RememberedSettings)[]).every((key) => settings[key] === current[key]);
}

const SETTINGS_WORDS =
  /\b(sampler|steps?|cfg|clip ?skip|resolution|size|hi-?res|upscal\w*|denois\w*|scheduler|schedule|karras|euler|dpm\+*|vae|recommend\w*|settings?|strength|weight)\b/i;

/**
 * The lines of a creator's description that talk about settings, so the card can show
 * the useful part of a long text. Falls back to the first lines when none do.
 */
export function notesExcerpt(notes: string | undefined, max = 8): string[] {
  const lines = (notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const relevant = lines.filter((line) => SETTINGS_WORDS.test(line) && line.length <= 300);
  return (relevant.length > 0 ? relevant : lines.filter((line) => line.length <= 300)).slice(0, max);
}
