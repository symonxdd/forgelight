import { SlidersHorizontal } from "lucide-react";
import type { GuideChapter } from "./types";

export const settings: GuideChapter = {
  id: "settings",
  title: "Settings",
  icon: SlidersHorizontal,
  intro: "What each generation setting does, with sensible starting values.",
  topics: [
    {
      id: "size",
      title: "Size",
      summary:
        "The width and height in pixels. Each model family has a native size it was trained at, and works best close to it.",
      points: [
        "SDXL-based models: about one megapixel (a million pixels), such as 1024 × 1024 or 832 × 1216.",
        "SD 1.5 models: about 512 × 512, such as 512 × 768.",
        "Much larger sizes tend to repeat subjects: two heads, extra people. Hires fix is the better route to large images.",
        "Larger images need more time and graphics memory.",
      ],
      forgelight: "Size presets keep the pixel count near one megapixel for any shape.",
      related: ["models/base-models", "settings/hires-fix", "troubleshooting/doubled-subjects"],
      keywords: ["width", "height", "resolution", "aspect ratio", "megapixel"],
    },
    {
      id: "steps",
      title: "Steps",
      summary:
        "How many times the noise is refined into the image. More steps add detail up to a point, then only time.",
      points: [
        "20 to 30 suits most SDXL checkpoints.",
        "Fast versions of models, named Lightning, Turbo or Hyper, need only 4 to 8.",
      ],
      related: ["settings/sampler"],
      keywords: ["steps", "iterations", "lightning", "turbo", "hyper"],
    },
    {
      id: "cfg-scale",
      title: "CFG scale",
      summary:
        "How strictly the image follows the prompt. CFG stands for Classifier-Free Guidance. Higher is more literal but can look harsh.",
      points: [
        "Most SDXL checkpoints: 3 to 7.",
        "Too high: oversaturated colors, harsh contrast, a burned look.",
        "Too low: soft, vague images that drift from the prompt.",
        "Fast models (Lightning, Turbo) usually want 1 to 2.",
      ],
      keywords: ["cfg", "guidance", "classifier-free guidance", "scale"],
    },
    {
      id: "sampler",
      title: "Sampler and schedule type",
      summary:
        "The sampler is the method that removes noise at each step. The schedule type decides how the removal is spread across the steps.",
      points: [
        "DPM++ 2M as sampler with Karras as schedule type is a dependable all-around choice.",
        "Euler a is simple and popular for anime models.",
        "Samplers with “a” (ancestral) or “SDE” (stochastic differential equation, the math behind them) in the name add fresh noise at each step, so the image keeps changing with the step count.",
        "Model pages often name a recommended pair. It is a good starting point.",
      ],
      related: ["settings/steps"],
      keywords: ["sampler", "scheduler", "schedule", "karras", "euler", "dpm", "ancestral", "sde"],
    },
    {
      id: "seed",
      title: "Seed",
      summary:
        "The number that creates the starting noise. The same seed with the same settings gives the same image again.",
      points: [
        "Random by default, so every image differs.",
        "Keeping a seed and changing one setting shows exactly what that setting does.",
        "Images in a batch (several made in a row) use the next seeds in a row.",
      ],
      forgelight: "The recycle button next to Seed reuses the seed of the image on screen.",
      related: ["recreating/steps"],
      keywords: ["seed", "random", "reproduce", "same image"],
    },
    {
      id: "hires-fix",
      title: "Hires fix",
      summary:
        "Hires is short for high resolution. Hires fix draws the image at the native size first, then enlarges it and draws over it again, for large images with clean detail.",
      points: [
        "Upscale by: 1.5 is a common choice. More needs more time and graphics memory.",
        "Upscaler: the model that does the enlarging. R-ESRGAN 4x+ suits most images, R-ESRGAN 4x+ Anime6B suits anime.",
        "Detail (denoising strength in Forge): how much the second pass may change. 0.3 to 0.5 suits most images.",
        "Above about 0.6, faces and hands may change noticeably.",
      ],
      related: ["models/upscaler", "settings/size", "troubleshooting/out-of-memory"],
      keywords: ["hires", "high resolution", "upscale", "denoising strength", "detail", "second pass"],
    },
    {
      id: "image-to-image",
      title: "Image to image",
      summary:
        "Starts from an existing image instead of pure noise, and makes a new version of it guided by the prompt. Often called img2img.",
      table: {
        head: ["Strength", "Result"],
        rows: [
          ["0.2 to 0.35", "Small touch-ups: cleaner details, same picture"],
          ["0.4 to 0.6", "A clear variation: same layout, new details and style"],
          ["0.65 to 0.85", "A new take: rough layout and colors stay"],
          ["0.9 and more", "Little of the starting image remains"],
        ],
      },
      points: [
        "Strength is called denoising strength in Forge: how much noise is added to the starting image before it is redrawn.",
        "The prompt should describe the result, including what stays the same.",
        "The new image takes the starting image's shape, at the checkpoint's native size.",
        "Hires fix is not available here. For a larger result, use a larger size or upscale afterwards.",
      ],
      forgelight:
        "Attach an image with the image button in the prompt card, by dropping or pasting it, or with Use as starting image on any result or Library image. Removing it goes back to text to image.",
      related: ["settings/size", "settings/seed"],
      keywords: [
        "img2img",
        "image to image",
        "starting image",
        "init image",
        "denoising strength",
        "strength",
        "variation",
      ],
    },
    {
      id: "clip-skip",
      title: "Clip skip",
      summary:
        "Skips the last processing layers of the text encoder, which is called CLIP. Some model pages recommend 2. Forge already uses 2 for SDXL-based models.",
      forgelight: "No control needed: Forge applies the right value for SDXL-based models by itself.",
      keywords: ["clip skip", "clip", "text encoder"],
    },
  ],
};
