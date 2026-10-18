import { describe, expect, it } from "vitest";
import { buildImg2imgRequest, fitToArea, nativeArea } from "./img2img";
import { DEFAULT_SETTINGS } from "./txt2img";

describe("fitToArea", () => {
  it("keeps the starting image's shape at about the native pixel count", () => {
    const { width, height } = fitToArea(3000, 2000, nativeArea("sdxl"));
    expect(width / height).toBeCloseTo(1.5, 1);
    expect(width * height).toBeGreaterThan(0.95 * 1024 * 1024);
    expect(width * height).toBeLessThan(1.05 * 1024 * 1024);
  });

  it("lands on Forge's 8-pixel grid", () => {
    const { width, height } = fitToArea(1000, 1333, nativeArea("sdxl"));
    expect(width % 8).toBe(0);
    expect(height % 8).toBe(0);
  });

  it("uses 512 × 512 for SD 1.5 checkpoints", () => {
    expect(fitToArea(800, 800, nativeArea("sd1"))).toEqual({ width: 512, height: 512 });
  });
});

describe("buildImg2imgRequest", () => {
  const request = buildImg2imgRequest(
    { ...DEFAULT_SETTINGS, prompt: "a cat", img2imgStrength: 0.45, hiresEnabled: true },
    "data:image/png;base64,AAAA",
    "task(y)",
  );

  it("sends the starting image and Strength as Forge's denoising strength", () => {
    expect(request.init_images).toEqual(["data:image/png;base64,AAAA"]);
    expect(request.denoising_strength).toBe(0.45);
    expect(request.prompt).toBe("a cat");
    expect(request.force_task_id).toBe("task(y)");
  });

  it("has no hires fix, which img2img doesn't support", () => {
    expect(request).not.toHaveProperty("enable_hr");
  });

  it("crops rather than stretches when the size has another shape", () => {
    expect(request.resize_mode).toBe(1);
  });
});
