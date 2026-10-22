import { Download } from "lucide-react";
import type { GuideChapter } from "./types";

export const gettingModels: GuideChapter = {
  id: "getting-models",
  title: "Getting models",
  icon: Download,
  intro: "Where models come from, which files are safe, and where they go.",
  topics: [
    {
      id: "civitai",
      title: "Civitai",
      summary: "The largest community site for sharing image models, along with images made with them.",
      points: [
        "Most models download for free. Some need a free account, and a few are paid for a limited time (Early Access).",
        "A model page lists its versions, base model family, file size, trigger words and often recommended settings.",
        "Many images show their generation data: the models and settings used to make them.",
        "civitai.com and civitai.red show the same models; civitai.red also shows mature preview images.",
      ],
      forgelight:
        "Forgelight looks up each local model on Civitai once, for its name, family, trigger words and the settings of the creator's example images, and links to its page. The Recommended card beside the image turns those settings into one Apply button; a LoRA shows the strength its creator used.",
      related: ["recreating/generation-data", "getting-models/choosing"],
      keywords: ["civitai", "download", "community", "site"],
    },
    {
      id: "hugging-face",
      title: "Hugging Face",
      summary:
        "A large site for AI models of every kind. Official base models are published here, for example SDXL by Stability AI and Flux by Black Forest Labs, the companies that made them.",
      points: [
        "Fewer community styles than Civitai, more official releases and technical files.",
        "Some official models ask to accept a license on the page before downloading.",
      ],
      keywords: ["huggingface", "hf", "official", "stability ai", "black forest labs"],
    },
    {
      id: "other-sources",
      title: "Other sources",
      summary: "A few more places offer free models, each with a narrower focus.",
      points: [
        "OpenModelDB (openmodeldb.info): a catalog of upscalers, with example comparisons.",
        "Tensor.Art and SeaArt: community sites with online generators. Downloads depend on what each creator allows.",
        "A creator's own website or GitHub page (a site where developers share code), for some tools and upscalers.",
      ],
      related: ["models/upscaler"],
      keywords: ["openmodeldb", "tensor.art", "seaart", "github"],
    },
    {
      id: "choosing",
      title: "Choosing a model",
      summary: "A few checks on the model page save a lot of trial and error.",
      steps: [
        "Check the base model family. It has to match the checkpoint in use.",
        "Look at the example images and their generation data. They show what the model is good at.",
        "Read the description for recommended settings: sampler, steps, CFG scale, size. The Settings chapter explains each.",
        "Pick the SafeTensors file when there is a choice.",
        "For checkpoints, prefer a pruned fp16 version if offered: a smaller file, same images.",
      ],
      points: [
        "Pruned means training leftovers were removed. fp16 (16-bit floating point) stores each number in half the space. Neither changes the images.",
      ],
      related: ["models/base-models", "getting-models/file-formats"],
      keywords: ["pruned", "fp16", "version", "pick"],
    },
    {
      id: "file-formats",
      title: "SafeTensors and PickleTensor",
      summary:
        "Model files come in two formats. SafeTensors only holds numbers. PickleTensor can also hold program code that runs when the file is opened.",
      table: {
        head: ["Format", "Extensions", "Risk"],
        rows: [
          ["SafeTensors", ".safetensors", "None: opening it cannot run anything"],
          ["PickleTensor", ".pt, .ckpt, .bin", "Can contain hidden code that runs on opening"],
        ],
      },
      points: [
        "PickleTensor uses the pickle format of Python, the programming language Forge is written in. Pickle was designed to save whole program objects, code included.",
        "Forge opens these files without a safety check, so a harmful file would run its code.",
        "Civitai scans uploads, which lowers the risk without removing it.",
        "Prefer SafeTensors. For a PickleTensor file, choose well-known creators with many downloads and a passed scan.",
      ],
      related: ["models/embedding"],
      keywords: ["pickle", "pickletensor", "safetensors", "malware", "virus", "security", "safe", "ckpt", "pt"],
    },
    {
      id: "folders",
      title: "Where files go",
      summary:
        "Each type has its own folder. The paths below start in the folder Forge is installed in. After adding a file, Forge needs to notice it.",
      table: {
        head: ["Type", "Folder", "Shows up"],
        rows: [
          ["Checkpoint", "webui\\models\\Stable-diffusion", "Refresh button in the checkpoint picker"],
          ["LoRA, LyCORIS, DoRA", "webui\\models\\Lora", "Refresh button in the LoRA picker"],
          ["Embedding", "webui\\embeddings", "After switching checkpoints or a restart"],
          ["VAE", "webui\\models\\VAE", "Classic page, refresh next to the list"],
          ["Upscaler", "webui\\models\\ESRGAN", "After a Forge restart"],
        ],
      },
      points: ["Subfolders work, for keeping things tidy."],
      forgelight:
        "Forgelight looks in the Downloads folder and on the Desktop, not the folders inside them, for checkpoints and LoRAs that Forge doesn't have yet. It offers each one in a card beside the image and at the top of the model lists, and Move to Forge moves it into the right folder. Nothing moves without that click.",
      keywords: ["folder", "path", "install", "where", "directory", "refresh", "move", "downloads", "desktop", "new"],
    },
  ],
};
