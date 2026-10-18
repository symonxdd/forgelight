import { Repeat } from "lucide-react";
import type { GuideChapter } from "./types";

export const recreating: GuideChapter = {
  id: "recreating",
  title: "Recreating an image",
  icon: Repeat,
  intro: "Getting close to an image seen online, and what matters most for it.",
  topics: [
    {
      id: "generation-data",
      title: "Generation data",
      summary:
        "The recipe of an image: prompt, negative prompt, models and settings. Forge saves it inside every image file it makes.",
      points: [
        "On Civitai, an image page shows it under Generation data, with Resources used listing the models.",
        "Images saved by Forge carry it too, readable on the classic page in the PNG Info tab.",
        "Some sites strip this data when an image is uploaded, so not every image has it.",
      ],
      forgelight: "Use these settings, in the image details of the viewer and the Library, applies an image's recipe.",
      related: ["recreating/what-matters"],
      keywords: ["generation data", "metadata", "png info", "infotext", "parameters", "recipe"],
    },
    {
      id: "what-matters",
      title: "What matters most",
      summary: "Not every listed resource is needed. In order of importance:",
      table: {
        head: ["Resource", "Needed?"],
        rows: [
          ["Checkpoint", "Essential: sets the whole look"],
          ["LoRAs", "Essential, at the same strengths: characters and styles come from them"],
          ["Embeddings", "Only those of the same family as the checkpoint; others did nothing anyway"],
          ["Upscaler", "Small effect on fine detail during hires fix"],
          ["VAE", "Rarely: most checkpoints already contain the right one"],
        ],
      },
      points: [
        "A missing embedding named in a prompt is read as plain words, which changes the image slightly.",
        "The exact model version matters: v1 and v2 of the same checkpoint can look quite different.",
      ],
      related: ["models/embedding", "models/vae"],
      keywords: ["resources used", "required", "missing", "versions"],
    },
    {
      id: "steps",
      title: "Step by step",
      summary: "A checklist for rebuilding an image from its generation data.",
      steps: [
        "Download the same checkpoint version and select it.",
        "Download the LoRAs and add them at the listed strengths.",
        "Copy the prompt and negative prompt as they are, including odd words such as trigger words.",
        "Set sampler, schedule type, steps, CFG scale and size to the listed values.",
        "Enter the seed.",
        "If hires fix values are listed (upscaler, upscale by, denoising strength), switch it on with those.",
      ],
      related: ["recreating/why-different", "prompting/lora-syntax"],
      keywords: ["checklist", "how to", "copy"],
    },
    {
      id: "why-different",
      title: "Why results still differ",
      summary: "With everything matched, the result is usually very close, but rarely identical.",
      points: [
        "Civitai's own online generator runs different software than Forge, so the same seed draws different noise.",
        "Graphics card models and software versions cause tiny differences that can grow while the image is made.",
        "Samplers with “a” or “SDE” in the name react to these differences the most.",
        "Missing resources, or a newer version of a model, shift the result further.",
      ],
      keywords: ["different", "not the same", "identical", "mismatch"],
    },
  ],
};
