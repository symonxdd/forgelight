import { Cpu } from "lucide-react";
import type { GuideChapter } from "./types";

export const hardware: GuideChapter = {
  id: "hardware",
  title: "Hardware",
  icon: Cpu,
  intro: "What a computer needs for image generation, and what each part affects.",
  topics: [
    {
      id: "graphics-memory",
      title: "Graphics memory (VRAM)",
      summary:
        "The memory on the graphics card, called VRAM (video RAM). It decides which models run comfortably and how large images can be.",
      points: [
        "The model and the image being made both have to fit, with some room to work.",
        "Forge was built to cope with little VRAM: what does not fit is kept in system memory and moved over as needed, which is slower.",
        "Other programs on the graphics card take a share too.",
      ],
      related: ["hardware/what-runs", "troubleshooting/out-of-memory"],
      keywords: ["vram", "video memory", "gpu memory", "graphics card", "gb"],
    },
    {
      id: "what-runs",
      title: "What runs on which card",
      summary: "A rough guide by graphics memory, for NVIDIA cards with Forge.",
      table: {
        head: ["VRAM", "Comfortable", "Possible, but slow"],
        rows: [
          ["4 GB", "SD 1.5", "SDXL"],
          ["6 GB", "SD 1.5, SDXL at native size", "SDXL with large hires fix, compressed Flux"],
          ["8 GB", "SDXL with hires fix", "Compressed Flux"],
          ["12 GB", "SDXL, compressed Flux", "Full Flux"],
          ["16 GB and more", "All of the above", ""],
        ],
      },
      points: [
        "Compressed Flux means versions in special formats named NF4 or GGUF, which shrink the model at a small cost in quality.",
        "NVIDIA cards are the standard for this software. AMD and Intel cards need other setups.",
      ],
      related: ["models/base-models"],
      keywords: ["requirements", "gpu", "nvidia", "amd", "intel", "rtx", "nf4", "gguf", "minimum"],
    },
    {
      id: "system-memory",
      title: "System memory (RAM)",
      summary: "The computer's main memory. It holds models while they load and whatever does not fit on the card.",
      points: [
        "16 GB is comfortable for SDXL.",
        "32 GB or more helps with Flux and with switching checkpoints often.",
        "Too little RAM makes Windows use the disk instead, which slows everything down.",
      ],
      related: ["hardware/graphics-memory"],
      keywords: ["ram", "memory", "system memory", "swap", "page file"],
    },
    {
      id: "speed",
      title: "What affects speed",
      summary: "Time per image grows with the work asked of the graphics card.",
      points: [
        "Pixels: twice the pixels takes about twice the time, or more.",
        "Steps: each step costs about the same time.",
        "Hires fix: a second, larger pass on top of the first.",
        "Speed is often shown as it/s (steps per second) or s/it (seconds per step).",
        "Laptop graphics cards run slower than desktop cards with the same name, and much slower on battery.",
      ],
      related: ["troubleshooting/slow"],
      keywords: ["speed", "fast", "it/s", "s/it", "laptop", "performance"],
    },
    {
      id: "storage",
      title: "Disk space",
      summary: "Models add up quickly: checkpoints take 2 to 7 GB each, LoRAs up to a few hundred MB.",
      points: [
        "A fast SSD (solid-state drive) makes checkpoints load much faster than a hard disk.",
        "Removing unused checkpoints is the quickest way to free space.",
      ],
      keywords: ["disk", "storage", "ssd", "space", "gb"],
    },
  ],
};
