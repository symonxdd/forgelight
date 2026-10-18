import { LifeBuoy } from "lucide-react";
import type { GuideChapter } from "./types";

export const troubleshooting: GuideChapter = {
  id: "troubleshooting",
  title: "Troubleshooting",
  icon: LifeBuoy,
  intro: "Common problems, their usual causes and what to try.",
  topics: [
    {
      id: "out-of-memory",
      title: "Out of memory",
      summary:
        "Forge reports “CUDA out of memory” when an image needs more graphics memory than is free. CUDA is the NVIDIA software that runs the calculations. Nothing is damaged; the image just fails.",
      points: [
        "Lower the size or the hires fix Upscale by value.",
        "Make one image at a time instead of a batch.",
        "Close other programs that use the graphics card, such as games or video editors.",
        "If it keeps happening, restarting Forge frees all memory.",
      ],
      related: ["hardware/graphics-memory", "settings/hires-fix"],
      keywords: ["cuda", "oom", "out of memory", "vram", "crash", "error"],
    },
    {
      id: "slow",
      title: "Very slow images",
      summary: "Some slowness is expected; a few causes make it much worse.",
      points: [
        "The first image after picking a checkpoint includes loading it. Later ones are faster.",
        "When graphics memory is tight, Forge moves model parts back and forth to system memory. This works, but slowly.",
        "Size, steps and hires fix each add time. Hires fix often doubles it.",
        "Laptops on battery power usually slow the graphics card down a lot.",
      ],
      related: ["hardware/speed", "hardware/graphics-memory"],
      keywords: ["slow", "speed", "time", "loading", "battery"],
    },
    {
      id: "gray-images",
      title: "Gray, washed-out or black images",
      summary: "Usually a VAE problem: the last stage that turns the result into pixels.",
      points: [
        "Washed out or gray: the checkpoint may lack a VAE. Use the one its page recommends.",
        "Black image: a VAE from the wrong family, such as an SD 1.5 VAE on an SDXL checkpoint, or the other way around.",
        "Some older SDXL VAEs also turn images black; a fixed version, often named fp16-fix, solves it.",
      ],
      related: ["models/vae"],
      keywords: ["gray", "grey", "washed out", "black", "faded", "nan", "vae"],
    },
    {
      id: "no-effect",
      title: "LoRA or embedding has no effect",
      summary: "Most often a family mismatch, a missing trigger word or a strength set too low.",
      points: [
        "Check the base model family on its Civitai page against the checkpoint.",
        "Add its trigger words to the prompt.",
        "Try a strength around 0.8 to 1.",
        "Check the file is in the right folder, then refresh the list.",
      ],
      related: ["models/base-models", "prompting/trigger-words", "getting-models/folders"],
      keywords: ["lora not working", "no effect", "ignored", "embedding not working"],
    },
    {
      id: "doubled-subjects",
      title: "Doubled heads or extra people",
      summary: "The image size is far from the model's native size, so the model fills the space with repeats.",
      points: [
        "Stay near the native size of the family.",
        "For a bigger result, use hires fix instead of a bigger starting size.",
      ],
      related: ["settings/size", "settings/hires-fix"],
      keywords: ["two heads", "duplicate", "extra people", "repeated", "twins"],
    },
    {
      id: "bad-hands",
      title: "Bad hands and faces",
      summary: "Small details such as hands and faces in the distance are hard for every model.",
      points: [
        "Hires fix redraws them at a larger size, which helps a lot.",
        "Negative prompt entries such as bad hands, extra fingers help a little.",
        "Several seeds with the same prompt often include a clean one.",
      ],
      related: ["settings/hires-fix", "prompting/negative-prompt"],
      keywords: ["hands", "fingers", "faces", "anatomy", "eyes"],
    },
    {
      id: "not-connected",
      title: "Forge not running or API off",
      summary: "The status at the top right shows whether Forgelight reaches Forge.",
      points: [
        "Forge not running: start it with the Forgelight desktop shortcut. The page reconnects by itself.",
        "Forge API is off: Forge was started without the --api launch option (a setting given to Forge as it starts). The desktop shortcut always adds it.",
        "Forge failed to start: its command window shows the error and stays open to read.",
      ],
      related: ["basics/forge"],
      keywords: ["offline", "not running", "api off", "connect", "start", "shortcut"],
    },
  ],
};
