import { Boxes } from "lucide-react";
import type { GuideChapter } from "./types";

export const models: GuideChapter = {
  id: "models",
  title: "Model types",
  icon: Boxes,
  intro: "The kinds of files that shape an image, and how they fit together.",
  topics: [
    {
      id: "checkpoint",
      title: "Checkpoint",
      summary:
        "The main model. It decides the overall look and everything the image can contain. Every generation uses exactly one.",
      points: [
        "Large files, usually 2 to 7 GB.",
        "Each one belongs to a base model family, such as SD 1.5 or SDXL. LoRAs and embeddings must match that family.",
        "Many checkpoints are merges: mixes of other checkpoints, tuned toward a style such as anime or photography.",
        "The first image after switching takes longer, because the checkpoint loads into memory.",
      ],
      folder: "webui\\models\\Stable-diffusion",
      forgelight: "The checkpoint picker sits in the prompt card. The badge (SD1, SDXL, FLUX) shows its family.",
      related: ["models/base-models", "getting-models/choosing"],
      keywords: ["model", "base", "merge", "ckpt"],
    },
    {
      id: "base-models",
      title: "Base model families",
      summary:
        "Checkpoints, LoRAs and embeddings are built for one family. Mixing families does not work: the add-on has no effect or makes a mess.",
      table: {
        head: ["Family", "Trained at", "Notes"],
        rows: [
          ["SD 1.5", "512 × 512", "Older and small. Huge library of add-ons."],
          ["SDXL", "1024 × 1024", "The main family today. Good detail and prompt understanding."],
          [
            "Pony",
            "1024 × 1024",
            "Built on SDXL. Tag prompts (short keywords) that start with quality tags such as score_9.",
          ],
          ["Illustrious, NoobAI", "1024 × 1024", "Built on SDXL. Anime and illustration, tag prompts."],
          ["Flux", "1024 × 1024", "Newer and much larger. Sentence prompts. Needs a lot of memory."],
        ],
      },
      points: [
        "The size a family was trained at is its native size. Other shapes with about the same number of pixels work too, such as 832 × 1216 for SDXL.",
        "Pony and Illustrious LoRAs are technically SDXL, but they work best on checkpoints of their own branch.",
        "Civitai shows the family as Base Model on every model page.",
      ],
      related: ["settings/size", "prompting/prompt-styles"],
      keywords: ["sd 1.5", "sd1", "sdxl", "pony", "illustrious", "noobai", "flux", "architecture", "family"],
    },
    {
      id: "lora",
      title: "LoRA",
      summary:
        "A small add-on that teaches a checkpoint one thing: a character, an art style, a concept or a pose. Several can be combined.",
      points: [
        "LoRA stands for Low-Rank Adaptation, the training method.",
        "Usually 10 to 300 MB.",
        "Strength sets how much it affects the image. Most work well between 0.5 and 1.",
        "Many need trigger words, special words from their training, in the prompt to show their effect.",
      ],
      folder: "webui\\models\\Lora",
      forgelight: "Add LoRA in the prompt card. Each LoRA becomes a chip with its own strength.",
      related: ["models/lycoris-dora", "prompting/trigger-words", "troubleshooting/no-effect"],
      keywords: ["lora", "add-on", "addon", "strength", "weight", "character", "style"],
    },
    {
      id: "lycoris-dora",
      title: "LyCORIS and DoRA",
      summary: "Variants of the LoRA, trained with different methods. They are used exactly like a LoRA.",
      points: [
        "LyCORIS is a collection of methods, with names such as LoHa and LoKr.",
        "DoRA (Weight-Decomposed Low-Rank Adaptation) is a newer method that can learn details more faithfully.",
        "Civitai lists them as separate types only for filtering. Forge handles all of them.",
      ],
      folder: "webui\\models\\Lora",
      forgelight: "They appear in the LoRA picker together with regular LoRAs.",
      related: ["models/lora"],
      keywords: ["loha", "lokr", "locon", "lycoris", "dora"],
    },
    {
      id: "embedding",
      title: "Embedding",
      summary:
        "A tiny file that packs a look or an idea into one new word. Writing that word in the prompt switches it on.",
      points: [
        "Also called Textual Inversion, after the training method.",
        "The name comes from how models read text: every word becomes a list of numbers, called an embedding. This file holds such a list for a new word.",
        "Usually only a few KB to a few hundred KB.",
        "Often used in the negative prompt, the list of things to avoid, to steer away from common flaws such as bad hands. These are called negative embeddings.",
        "Must match the checkpoint's family: an SD 1.5 embedding does nothing on an SDXL checkpoint.",
        "Forge reads this folder when a checkpoint loads, so a new file works after switching checkpoints or restarting Forge.",
      ],
      folder: "webui\\embeddings",
      forgelight: "No picker yet. Typing the file name without its extension into a prompt already uses it.",
      related: ["prompting/negative-prompt", "getting-models/file-formats"],
      keywords: ["textual inversion", "ti", "negative embedding", "easynegative", "pt"],
    },
    {
      id: "vae",
      title: "VAE",
      summary:
        "The model works on a compressed version of the image. The VAE turns that into visible pixels at the end of every image.",
      points: [
        "VAE stands for variational autoencoder, the name of the technique.",
        "Most checkpoints carry one inside (baked in), so nothing extra is needed.",
        "A separate VAE helps when images look gray, washed out or blotchy, or when the checkpoint page asks for one.",
        "SDXL VAE is the standard one for the SDXL family, already inside nearly every SDXL checkpoint.",
      ],
      folder: "webui\\models\\VAE",
      forgelight: "No VAE picker yet. The classic Forge page can set one.",
      related: ["troubleshooting/gray-images", "basics/how-an-image-is-made"],
      keywords: ["vae", "autoencoder", "baked", "decoder", "colors"],
    },
    {
      id: "upscaler",
      title: "Upscaler",
      summary: "A model that enlarges an image and sharpens its details while doing so.",
      points: [
        "Common ones: 4x-UltraSharp, Remacri, R-ESRGAN 4x+ Anime6B. Most belong to a family called ESRGAN, named after the method they use.",
        "Forge also has simple built-in resize methods such as Lanczos, which only stretch the image.",
        "Forge lists a new upscaler file after a restart.",
      ],
      folder: "webui\\models\\ESRGAN",
      forgelight: "Hires fix > Upscaler lists all of them.",
      related: ["settings/hires-fix"],
      keywords: ["esrgan", "ultrasharp", "remacri", "enlarge", "4x"],
    },
    {
      id: "other-types",
      title: "Other types on Civitai",
      summary: "Civitai lists more model types. Most are for other programs or for features outside Forgelight.",
      table: {
        head: ["Type", "What it is", "In Forge"],
        rows: [
          ["Hypernetwork", "An older add-on type, replaced by LoRAs", "No effect"],
          [
            "ControlNet, Poses, CLIP Vision",
            "Guide pose and composition from a reference image",
            "Yes, on the classic page",
          ],
          ["Detection", "Finds faces or hands to redraw them in more detail", "With the ADetailer extension"],
          ["Wildcards", "Word lists, one picked at random per image", "With the Dynamic Prompts extension"],
          ["Text Encoder, UNet, CLIP", "Separate parts of large models such as Flux", "Yes, on the classic page"],
          ["Motion", "Animation modules", "No"],
          ["Workflows, ComfyUI Workflows", "Recipes for ComfyUI, another image generation program", "No"],
          ["VLM, LLM", "Vision language models and large language models, for text tasks", "No"],
          ["Aesthetic Gradient", "An old add-on type", "No"],
        ],
      },
      related: ["models/checkpoint", "models/lora"],
      keywords: ["hypernetwork", "controlnet", "poses", "clip vision", "detection", "adetailer", "wildcards", "motion"],
    },
  ],
};
