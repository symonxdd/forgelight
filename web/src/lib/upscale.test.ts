import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./txt2img";
import { buildEnhanceRequest, buildExtrasRequest, imageUpscalers, upscaleTarget } from "./upscale";

describe("upscaleTarget", () => {
  it("keeps Enhance on the 8-pixel grid", () => {
    expect(upscaleTarget({ width: 1216, height: 832 }, 1.5, "enhance")).toEqual({ width: 1824, height: 1248 });
    expect(upscaleTarget({ width: 1000, height: 750 }, 1.5, "enhance")).toEqual({ width: 1504, height: 1128 });
  });

  it("gives Upscale only the exact size", () => {
    expect(upscaleTarget({ width: 1000, height: 750 }, 1.5, "upscale")).toEqual({ width: 1500, height: 1125 });
  });
});

describe("imageUpscalers", () => {
  it("leaves out latent upscalers", () => {
    expect(imageUpscalers(["R-ESRGAN 4x+", "Lanczos", "Latent", "Latent (bicubic)"])).toEqual([
      "R-ESRGAN 4x+",
      "Lanczos",
    ]);
  });
});

describe("requests", () => {
  it("asks Extras for exactly the target size", () => {
    expect(buildExtrasRequest("data:x", { width: 1824, height: 1248 }, "R-ESRGAN 4x+")).toMatchObject({
      resize_mode: 1,
      upscaling_resize_w: 1824,
      upscaling_resize_h: 1248,
      upscaler_1: "R-ESRGAN 4x+",
    });
  });

  it("redraws one image at the target size and saves it", () => {
    const settings = { ...DEFAULT_SETTINGS, prompt: "a lake", batchCount: 4, seed: 7 };
    const request = buildEnhanceRequest(settings, "data:big", { width: 1824, height: 1248 }, 0.35, "task(1)");
    expect(request).toMatchObject({
      prompt: "a lake",
      width: 1824,
      height: 1248,
      n_iter: 1,
      seed: 7,
      init_images: ["data:big"],
      denoising_strength: 0.35,
      save_images: true,
      force_task_id: "task(1)",
    });
  });
});
