import { Compass } from "lucide-react";
import type { GuideChapter } from "./types";

export const basics: GuideChapter = {
  id: "basics",
  title: "Basics",
  icon: Compass,
  intro: "What runs where, and how a text prompt becomes an image.",
  topics: [
    {
      id: "local-generation",
      title: "Local image generation",
      summary:
        "A program on this computer turns a text description into an image, using the graphics card. No online service is involved.",
      points: [
        "Prompts and images stay on this computer.",
        "No subscription or credits: the costs are the hardware and its power use.",
        "Models are files, downloaded once and kept in folders.",
        "Speed and maximum image size depend on the graphics card.",
      ],
      related: ["hardware/graphics-memory", "basics/how-an-image-is-made"],
      keywords: ["offline", "private", "free"],
    },
    {
      id: "stable-diffusion",
      title: "Stable Diffusion",
      summary:
        "A family of open image models, first released in 2022. Most models shared online today are built on it.",
      points: [
        "Main versions: SD 1.5 (2022) and SDXL (2023). Popular community models such as Pony and Illustrious are built on SDXL.",
        "Diffusion means the model starts from random noise and removes it step by step, guided by the prompt.",
        "The model learned from many captioned images, so it connects words with how things look.",
      ],
      related: ["models/base-models", "models/checkpoint"],
      keywords: ["sd", "sdxl", "diffusion"],
    },
    {
      id: "forge",
      title: "Forge",
      summary:
        "Stable Diffusion WebUI Forge: the program that loads the models and makes the images. Forgelight runs inside it.",
      points: [
        "A faster variant of AUTOMATIC1111's Stable Diffusion WebUI, built to work well on graphics cards with little memory.",
        "Runs a small web server on this computer, at 127.0.0.1:7860. Its classic page opens there.",
        "The black command window that appears on start is Forge running. Closing it stops Forge.",
      ],
      forgelight:
        "Settings menu > Open classic Forge opens Forge's own page, for everything Forgelight does not cover.",
      related: ["basics/forgelight", "troubleshooting/not-connected"],
      keywords: ["webui", "a1111", "automatic1111", "gradio", "classic"],
    },
    {
      id: "forgelight",
      title: "Forgelight",
      summary:
        "A calmer interface for Forge. It sends the same requests as the classic page, so images come out identical.",
      points: [
        "Installed as a Forge extension, at the address 127.0.0.1:7860/forgelight.",
        "Talks to Forge through its API (application programming interface), the same route other tools use.",
        "Never changes how images are generated. The classic page stays available.",
      ],
      related: ["basics/forge"],
      keywords: ["extension", "api", "interface"],
    },
    {
      id: "how-an-image-is-made",
      title: "How an image is made",
      summary: "Every generation runs the same few stages, from text to finished picture.",
      steps: [
        "The text encoder turns the prompt into numbers the model understands.",
        "The seed creates a field of random noise, the starting point.",
        "The sampler removes noise over a number of steps, guided by the checkpoint and any LoRAs.",
        "The VAE converts the result into visible pixels.",
        "Optionally, hires fix enlarges the image and refines the details.",
      ],
      related: ["settings/seed", "settings/sampler", "models/vae", "settings/hires-fix"],
      keywords: ["pipeline", "process", "workflow", "text encoder"],
    },
  ],
};
