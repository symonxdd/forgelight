import { DEFAULT_SETTINGS, type GenerationSettings } from "./txt2img";

/** The Size, Sampling and Hires fix settings, which each checkpoint remembers for itself. */
export type RememberedSettings = Pick<
  GenerationSettings,
  | "width"
  | "height"
  | "steps"
  | "cfgScale"
  | "sampler"
  | "scheduler"
  | "hiresEnabled"
  | "hiresScale"
  | "hiresUpscaler"
  | "hiresDenoise"
>;

export function pickRemembered(s: RememberedSettings): RememberedSettings {
  return {
    width: s.width,
    height: s.height,
    steps: s.steps,
    cfgScale: s.cfgScale,
    sampler: s.sampler,
    scheduler: s.scheduler,
    hiresEnabled: s.hiresEnabled,
    hiresScale: s.hiresScale,
    hiresUpscaler: s.hiresUpscaler,
    hiresDenoise: s.hiresDenoise,
  };
}

export function sameRemembered(a: RememberedSettings, b: RememberedSettings): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.steps === b.steps &&
    a.cfgScale === b.cfgScale &&
    a.sampler === b.sampler &&
    a.scheduler === b.scheduler &&
    a.hiresEnabled === b.hiresEnabled &&
    a.hiresScale === b.hiresScale &&
    a.hiresUpscaler === b.hiresUpscaler &&
    a.hiresDenoise === b.hiresDenoise
  );
}

/** A stored entry, or undefined when anything in it is missing or of the wrong type. */
export function parseRemembered(value: unknown): RememberedSettings | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const numbers = [v.width, v.height, v.steps, v.cfgScale].every((n) => typeof n === "number" && Number.isFinite(n));
  if (!numbers || typeof v.sampler !== "string" || typeof v.scheduler !== "string") return undefined;
  // Entries saved before Hires fix existed had it off.
  const hires = {
    hiresEnabled: typeof v.hiresEnabled === "boolean" ? v.hiresEnabled : DEFAULT_SETTINGS.hiresEnabled,
    hiresScale: typeof v.hiresScale === "number" ? v.hiresScale : DEFAULT_SETTINGS.hiresScale,
    hiresUpscaler: typeof v.hiresUpscaler === "string" ? v.hiresUpscaler : DEFAULT_SETTINGS.hiresUpscaler,
    hiresDenoise: typeof v.hiresDenoise === "number" ? v.hiresDenoise : DEFAULT_SETTINGS.hiresDenoise,
  };
  return pickRemembered({ ...(v as unknown as RememberedSettings), ...hires });
}

/**
 * What to load after switching to a checkpoint: what was last used with it. Nothing
 * when it has no memory yet, when that memory matches already, or when the settings
 * on screen came along with the switch (from an image's settings).
 */
export function settingsToLoad(
  saved: RememberedSettings | undefined,
  current: RememberedSettings,
  keepCurrent: boolean,
): RememberedSettings | null {
  if (keepCurrent || !saved || sameRemembered(saved, current)) return null;
  return saved;
}
