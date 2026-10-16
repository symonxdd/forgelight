import { describe, expect, it } from "vitest";
import { formatSeconds } from "./format";
import { currentLivePreview, livePreviewSettings } from "./livePreview";
import {
  looksLikeGenerationData,
  modelFromInfotext,
  paramValue,
  parseInfotext,
  settingsFromInfotext,
} from "./infotext";
import { matchCheckpoint } from "./matchCheckpoint";
import { matchPreset, normalizeSize } from "./sizes";
import { DEFAULT_SETTINGS, buildTxt2imgRequest, friendlyError, parseTxt2imgResult } from "./txt2img";
import { fitScale, zoomAt } from "./zoom";

describe("buildTxt2imgRequest", () => {
  const request = buildTxt2imgRequest({ ...DEFAULT_SETTINGS, prompt: "a cat", width: 830 }, "task(x)");

  it("sends explicit fields and never the broken infotext shortcut", () => {
    expect(request).not.toHaveProperty("infotext");
    expect(request.prompt).toBe("a cat");
    expect(request.sampler_name).toBe("DPM++ 2M");
    expect(request.force_task_id).toBe("task(x)");
  });

  it("rounds sizes onto Forge's 8-pixel grid", () => {
    expect(request.width).toBe(832);
  });

  it("adds LoRAs to the prompt Forge receives", () => {
    const withLora = buildTxt2imgRequest(
      { ...DEFAULT_SETTINGS, prompt: "a cat", loras: [{ name: "x", weight: 0.6 }] },
      "t",
    );
    expect(withLora.prompt).toBe("a cat <lora:x:0.6>");
  });

  it("never asks Forge to change settings temporarily, since Forge doesn't always restore them", () => {
    expect(request).not.toHaveProperty("override_settings");
  });

  it("saves images like the classic page", () => {
    expect(request.save_images).toBe(true);
  });
});

describe("parseTxt2imgResult", () => {
  it("skips the overview grid Forge puts first for batches", () => {
    const info = JSON.stringify({ index_of_first_image: 1, all_seeds: [11, 12], infotexts: ["grid", "a", "b"] });
    expect(parseTxt2imgResult(["G", "A", "B"], info)).toEqual([
      { base64: "A", seed: 11, infotext: "a" },
      { base64: "B", seed: 12, infotext: "b" },
    ]);
  });

  it("still returns images when the info is unreadable", () => {
    expect(parseTxt2imgResult(["A"], "not json")).toEqual([{ base64: "A", seed: -1, infotext: "" }]);
  });
});

describe("parseInfotext", () => {
  const text =
    'a girl, smiling\nwith freckles\nNegative prompt: lowres, bad hands\nSteps: 19, Sampler: DPM++ 2M, Size: 832x1216, Lora hashes: "a: 1, b: 2", Seed: 42';
  const parsed = parseInfotext(text);

  it("separates prompt, negative prompt and settings", () => {
    expect(parsed.prompt).toBe("a girl, smiling\nwith freckles");
    expect(parsed.negativePrompt).toBe("lowres, bad hands");
    expect(paramValue(parsed, "Steps")).toBe("19");
    expect(paramValue(parsed, "Seed")).toBe("42");
  });

  it("keeps quoted values that contain commas", () => {
    expect(paramValue(parsed, "Lora hashes")).toBe("a: 1, b: 2");
  });

  it("turns an image's settings back into generation settings", () => {
    const settings = settingsFromInfotext(
      parseInfotext(
        "cat\nNegative prompt: dog\nSteps: 19, Sampler: DPM++ 2M, Schedule type: Karras, CFG scale: 2.5, Seed: 7, Size: 832x1216, Clip skip: 2",
      ),
    );
    expect(settings).toEqual({
      prompt: "cat",
      negativePrompt: "dog",
      steps: 19,
      sampler: "DPM++ 2M",
      scheduler: "Karras",
      cfgScale: 2.5,
      seed: 7,
      width: 832,
      height: 1216,
      loras: [],
    });
  });

  it("turns LoRA tags in an image's prompt into LoRA entries", () => {
    const settings = settingsFromInfotext(parseInfotext("1boy, <lora:Eren-yeager:0.8>, smiling\nSteps: 20, Seed: 1"));
    expect(settings.prompt).toBe("1boy, smiling");
    expect(settings.loras).toEqual([{ name: "Eren-yeager", weight: 0.8 }]);
  });

  it("handles a prompt with no negative prompt", () => {
    const plain = parseInfotext("just a prompt\nSteps: 5, Seed: 1");
    expect(plain.prompt).toBe("just a prompt");
    expect(plain.negativePrompt).toBe("");
  });
});

describe("sizes", () => {
  it("clamps and rounds typed sizes", () => {
    expect(normalizeSize(1219)).toBe(1216);
    expect(normalizeSize(10)).toBe(256);
    expect(normalizeSize(99999)).toBe(2048);
  });

  it("recognizes presets", () => {
    expect(matchPreset(832, 1216)?.label).toBe("2:3");
    expect(matchPreset(800, 800)).toBeUndefined();
  });
});

describe("zoom", () => {
  it("fits the whole image inside the viewport", () => {
    expect(fitScale(832, 1216, 900, 900, 0)).toBeCloseTo(900 / 1216);
  });

  it("keeps the point under the cursor fixed while zooming", () => {
    const view = { scale: 1, x: 0, y: 0 };
    const next = zoomAt(view, 2, 100, 50);
    // The image point that was under the cursor ((100 - 0) / 1 = 100) is still under it.
    expect((100 - next.x) / next.scale).toBeCloseTo(100);
    expect((50 - next.y) / next.scale).toBeCloseTo(50);
  });
});

describe("live preview setting", () => {
  it("recognizes Forge's current setting", () => {
    expect(currentLivePreview(true, 10)).toBe("10");
    expect(currentLivePreview(true, 1.0)).toBe("1");
    expect(currentLivePreview(false, 1)).toBe("off");
    expect(currentLivePreview(true, 7)).toBeUndefined();
  });

  it("only touches Forge's preview settings", () => {
    expect(livePreviewSettings("3")).toEqual({ live_previews_enable: true, show_progress_every_n_steps: 3 });
    expect(livePreviewSettings("off")).toEqual({ live_previews_enable: false });
  });
});

describe("messages", () => {
  it("explains out-of-memory errors in plain words", () => {
    expect(friendlyError("CUDA out of memory. Tried to allocate")).toMatch(/ran out of memory/);
  });

  it("formats remaining time", () => {
    expect(formatSeconds(6.4)).toBe("6 s");
    expect(formatSeconds(72)).toBe("1 min 12 s");
  });
});

describe("pasted generation data", () => {
  it("recognizes settings copied from an image", () => {
    expect(looksLikeGenerationData("a cat\nNegative prompt: dog\nSteps: 30, Sampler: Euler a, Seed: 5")).toBe(true);
  });

  it("ignores ordinary prompts, even ones mentioning steps", () => {
    expect(looksLikeGenerationData("steps of a temple, 1girl, sitting")).toBe(false);
    expect(looksLikeGenerationData("a staircase\nSteps: many")).toBe(false);
  });

  it("finds the checkpoint by hash first, then by name", () => {
    const installed = [
      { title: "a.safetensors [aaa]", model_name: "animeMix_v2", hash: "f116b0c78f", sha256: null, filename: "a" },
      { title: "b.safetensors", model_name: "photoReal_v1", hash: null, sha256: null, filename: "b" },
    ];
    expect(matchCheckpoint(installed, { hash: "F116B0C78F", name: "renamed" })?.model_name).toBe("animeMix_v2");
    expect(matchCheckpoint(installed, { name: "photoReal_v1" })?.model_name).toBe("photoReal_v1");
    expect(matchCheckpoint(installed, { name: "missing" })).toBeUndefined();
  });

  it("reads the model from the settings text", () => {
    const parsed = parseInfotext("x\nSteps: 5, Model hash: F116B0C78F, Model: animeMix_v2");
    expect(modelFromInfotext(parsed)).toEqual({ name: "animeMix_v2", hash: "f116b0c78f" });
  });
});
