import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./txt2img";
import { pickRemembered } from "./checkpointMemory";
import { describeSettings, isApplied, matchSampler, noteLines, recommend, recommendedLoraWeight } from "./recommended";

const samplers = ["DPM++ 2M", "DPM++ 2M SDE", "DPM++ SDE", "Euler a", "Euler", "DPM2 a", "UniPC"];
const schedulers = ["Automatic", "Uniform", "Karras", "Exponential", "SGM Uniform", "Align Your Steps"];
const upscalers = ["R-ESRGAN 4x+", "4x-UltraSharp", "Latent"];
const forge = { samplers, schedulers, upscalers };

describe("matchSampler", () => {
  it("keeps names Forge already uses", () => {
    expect(matchSampler("DPM++ 2M SDE", "Karras", samplers, schedulers)).toEqual({
      sampler: "DPM++ 2M SDE",
      scheduler: "Karras",
    });
  });

  it("splits a schedule written inside the sampler name", () => {
    expect(matchSampler("DPM++ 2M Karras", undefined, samplers, schedulers)).toEqual({
      sampler: "DPM++ 2M",
      scheduler: "Karras",
    });
    expect(matchSampler("DPM++ SDE SGM Uniform", undefined, samplers, schedulers)).toEqual({
      sampler: "DPM++ SDE",
      scheduler: "SGM Uniform",
    });
  });

  it("understands ComfyUI's spelling", () => {
    expect(matchSampler("euler_ancestral", "karras", samplers, schedulers)).toEqual({
      sampler: "Euler a",
      scheduler: "Karras",
    });
    expect(matchSampler("dpm_2_ancestral", undefined, samplers, schedulers).sampler).toBe("DPM2 a");
    expect(matchSampler("uni_pc", "sgm_uniform", samplers, schedulers)).toEqual({
      sampler: "UniPC",
      scheduler: "SGM Uniform",
    });
  });

  it("tells Euler and Euler a apart", () => {
    expect(matchSampler("Euler", undefined, samplers, schedulers).sampler).toBe("Euler");
  });

  it("leaves out samplers Forge doesn't have", () => {
    expect(matchSampler("res_multistep", "beta", samplers, schedulers)).toEqual({ scheduler: undefined });
  });
});

describe("recommend", () => {
  it("returns null without any settings", () => {
    expect(recommend([], forge)).toBeNull();
    expect(recommend([{ adetailer: true }], forge)).toBeNull();
  });

  it("takes the most common sampler and size and the middle steps and CFG", () => {
    const result = recommend(
      [
        { sampler: "Euler a", steps: 20, cfgScale: 4.5, width: 832, height: 1216 },
        { sampler: "Euler a", steps: 28, cfgScale: 5, width: 832, height: 1216 },
        { sampler: "DPM++ 2M Karras", steps: 30, cfgScale: 7, width: 1024, height: 1024 },
      ],
      forge,
    );
    expect(result).toEqual({
      examples: 3,
      settings: { sampler: "Euler a", steps: 28, cfgScale: 5, width: 832, height: 1216 },
      adetailer: false,
    });
  });

  it("takes the schedule that goes with the chosen sampler", () => {
    const result = recommend(
      [
        { sampler: "DPM++ 2M", scheduler: "Karras" },
        { sampler: "DPM++ 2M", scheduler: "Karras" },
        { sampler: "Euler a", scheduler: "Align Your Steps" },
      ],
      forge,
    );
    expect(result?.settings).toEqual({ sampler: "DPM++ 2M", scheduler: "Karras" });
  });

  it("rounds sizes to what Forge accepts and CFG to half steps", () => {
    const result = recommend([{ cfgScale: 4.2, width: 1070, height: 1377 }], forge);
    expect(result?.settings).toEqual({ cfgScale: 4, width: 1072, height: 1376 });
  });

  it("rounds to steps without floating point leftovers", () => {
    const result = recommend([{ steps: 20, hiresScale: 1.6, hiresDenoise: 0.35 }], forge);
    expect(result?.settings.hiresDenoise).toBe(0.35);
    expect(describeSettings(result?.settings ?? {}).hires).toBe("1.6× · detail 0.35");
  });

  it("fills in hires fix, without switching it on, only when most examples used it", () => {
    const used = recommend(
      [
        { steps: 20, hiresScale: 1.5, hiresUpscaler: "4x-UltraSharp", hiresDenoise: 0.4 },
        { steps: 20, hiresScale: 1.5, hiresUpscaler: "4x-UltraSharp", hiresDenoise: 0.45 },
        { steps: 20 },
      ],
      forge,
    );
    expect(used?.settings).toEqual({
      steps: 20,
      hiresScale: 1.5,
      hiresUpscaler: "4x-UltraSharp",
      hiresDenoise: 0.45,
    });
    const unused = recommend([{ steps: 20, hiresScale: 2 }, { steps: 20 }], forge);
    expect(unused?.settings).toEqual({ steps: 20 });
  });

  it("keeps the current upscaler when the examples used one that isn't installed", () => {
    const result = recommend([{ steps: 20, hiresScale: 2, hiresUpscaler: "4x_foolhardy_Remacri" }], forge);
    expect(result?.settings).toEqual({ steps: 20, hiresScale: 2 });
  });

  it("mentions ADetailer when most examples used it", () => {
    expect(recommend([{ steps: 20, adetailer: true }], forge)?.adetailer).toBe(true);
  });
});

describe("recommendedLoraWeight", () => {
  it("takes the middle strength", () => {
    expect(recommendedLoraWeight([{ loraWeight: 0.7 }, { loraWeight: 0.8 }, { loraWeight: 1 }, {}])).toBe(0.8);
    expect(recommendedLoraWeight([{ steps: 20 }])).toBeUndefined();
  });
});

describe("describeSettings", () => {
  it("writes the method and the size on two lines", () => {
    expect(
      describeSettings({
        sampler: "DPM++ 2M",
        scheduler: "Karras",
        steps: 28,
        cfgScale: 5,
        width: 832,
        height: 1216,
        hiresScale: 1.5,
        hiresUpscaler: "4x-UltraSharp",
        hiresDenoise: 0.4,
      }),
    ).toEqual({
      method: "DPM++ 2M Karras · 28 steps · CFG 5",
      size: "832 × 1216",
      hires: "1.5× · detail 0.4 · 4x-UltraSharp",
    });
  });

  it("leaves out what the examples don't say", () => {
    expect(describeSettings({ sampler: "Euler a", scheduler: "Automatic" })).toEqual({
      method: "Euler a",
      size: "",
      hires: "",
    });
  });
});

describe("isApplied", () => {
  it("compares only the recommended values", () => {
    const current = pickRemembered(DEFAULT_SETTINGS);
    expect(isApplied({ steps: current.steps, sampler: current.sampler }, current)).toBe(true);
    expect(isApplied({ steps: current.steps + 1 }, current)).toBe(false);
  });
});

describe("noteLines", () => {
  it("keeps every line and marks the ones about settings", () => {
    const notes = "Welcome to my model!\n\nRecommended: Euler a, 25 steps\n  CFG 4-6  \nJoin my Discord";
    expect(noteLines(notes)).toEqual([
      { text: "Welcome to my model!", settings: false, heading: false },
      { text: "Recommended: Euler a, 25 steps", settings: true, heading: false },
      { text: "CFG 4-6", settings: true, heading: false },
      { text: "Join my Discord", settings: false, heading: false },
    ]);
  });

  it("marks image sizes and leaves out divider lines", () => {
    expect(noteLines("1024 x 1024\n____________\n896×1152 (portrait)\n- - -")).toEqual([
      { text: "1024 x 1024", settings: true, heading: false },
      { text: "896×1152 (portrait)", settings: true, heading: false },
    ]);
  });

  it("treats short lines ending in a colon as headings", () => {
    expect(
      noteLines("Using the model:\nPlease avoid franchise tags: they were not trained.").map((l) => l.heading),
    ).toEqual([true, false]);
  });

  it("never marks long paragraphs, and handles no notes", () => {
    const story = `${"A story about how this model came to be. ".repeat(8)}It has many settings.`;
    expect(noteLines(story)[0]?.settings).toBe(false);
    expect(noteLines(undefined)).toEqual([]);
  });
});
