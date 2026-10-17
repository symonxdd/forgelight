import { describe, expect, it } from "vitest";
import { parseRemembered, pickRemembered, sameRemembered, settingsToLoad } from "./checkpointMemory";
import { DEFAULT_SETTINGS } from "./txt2img";

const current = pickRemembered(DEFAULT_SETTINGS);
const saved = { ...current, steps: 30, cfgScale: 7, sampler: "Euler a" };

describe("settingsToLoad", () => {
  it("loads what was last used with the checkpoint", () => {
    expect(settingsToLoad(saved, current, false)).toEqual(saved);
  });

  it("loads nothing for a new checkpoint, a match, or settings that came with the switch", () => {
    expect(settingsToLoad(undefined, current, false)).toBeNull();
    expect(settingsToLoad({ ...current }, current, false)).toBeNull();
    expect(settingsToLoad(saved, current, true)).toBeNull();
  });
});

describe("remembered settings", () => {
  it("keeps only Size, Sampling and Hires fix", () => {
    expect(Object.keys(pickRemembered(DEFAULT_SETTINGS)).sort()).toEqual(
      [
        "cfgScale",
        "height",
        "hiresDenoise",
        "hiresEnabled",
        "hiresScale",
        "hiresUpscaler",
        "sampler",
        "scheduler",
        "steps",
        "width",
      ].sort(),
    );
    const withOtherPrompt = { ...DEFAULT_SETTINGS, prompt: "different" };
    expect(sameRemembered(current, withOtherPrompt)).toBe(true);
  });

  it("rejects stored entries that are incomplete or of the wrong type", () => {
    expect(parseRemembered(saved)).toEqual(saved);
    expect(parseRemembered({ ...saved, steps: "30" })).toBeUndefined();
    expect(parseRemembered({ width: 832 })).toBeUndefined();
    expect(parseRemembered(null)).toBeUndefined();
  });

  it("reads entries saved before Hires fix existed, with Hires fix off", () => {
    const { hiresEnabled, hiresScale, hiresUpscaler, hiresDenoise, ...older } = saved;
    void [hiresEnabled, hiresScale, hiresUpscaler, hiresDenoise];
    expect(parseRemembered(older)).toMatchObject({ steps: 30, hiresEnabled: false, hiresScale: 1.5 });
  });
});
