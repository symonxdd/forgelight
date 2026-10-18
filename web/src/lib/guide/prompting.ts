import { PenLine } from "lucide-react";
import type { GuideChapter } from "./types";

export const prompting: GuideChapter = {
  id: "prompting",
  title: "Prompting",
  icon: PenLine,
  intro: "Writing prompts that the model understands.",
  topics: [
    {
      id: "prompt",
      title: "The prompt",
      summary: "A description of the image: subject, style, setting, lighting and details, separated by commas.",
      points: [
        "Words near the start carry the most weight.",
        "Concrete words work better than abstract ones: “red wool scarf” rather than “nice clothes”.",
        "Long prompts are fine. Forge reads them in chunks of 75 tokens (word pieces) and combines them.",
      ],
      related: ["prompting/prompt-styles", "prompting/weights"],
      keywords: ["prompt", "positive", "description", "tokens", "75"],
    },
    {
      id: "prompt-styles",
      title: "Tags or sentences",
      summary:
        "Model families learned from images described in different ways, so each prefers its own prompt style. The model page usually shows it.",
      table: {
        head: ["Family", "Prompt style", "Example start"],
        rows: [
          ["SD 1.5, SDXL", "Short phrases or sentences", "photo of a lighthouse at dusk, soft light"],
          ["Pony", "Tags, with score tags first", "score_9, score_8_up, 1girl, long hair"],
          ["Illustrious, NoobAI", "Tags, with quality tags", "masterpiece, best quality, 1girl, long hair"],
          ["Flux", "Natural sentences", "A lighthouse on a cliff at dusk, lit softly"],
        ],
      },
      points: [
        "Tags are short keywords separated by commas. They follow the naming of Danbooru, an anime image site the models learned from: 1girl, solo, smile.",
        "Score and quality tags steer the model toward the best-rated images it learned from.",
      ],
      related: ["models/base-models"],
      keywords: ["tags", "danbooru", "booru", "score_9", "masterpiece", "quality tags", "sentences"],
    },
    {
      id: "negative-prompt",
      title: "Negative prompt",
      summary: "What the image should avoid. Every step is steered away from it.",
      points: [
        "Common entries: lowres (low resolution), blurry, bad anatomy, extra fingers, watermark, text.",
        "Negative embeddings pack a whole list of flaws into one word.",
        "Very long negative prompts can flatten the image. A short, targeted list works best.",
      ],
      related: ["models/embedding"],
      keywords: ["negative", "avoid", "unwanted"],
    },
    {
      id: "weights",
      title: "Word weights",
      summary:
        "Parentheses ( ) make a word count more, square brackets [ ] make it count less. A number sets exactly how much.",
      table: {
        head: ["Written as", "Effect"],
        rows: [
          ["(word:1.3)", "30% stronger"],
          ["(word:0.7)", "30% weaker"],
          ["(word)", "10% stronger"],
          ["[word]", "About 10% weaker"],
        ],
      },
      points: [
        "Values between 0.5 and 1.5 are safe. Beyond that, images tend to distort.",
        "To write real parentheses, as in character names, put a backslash \\ before each: Sparkle \\(Honkai: Star Rail\\).",
      ],
      keywords: ["weight", "emphasis", "attention", "brackets", "parentheses", "escape", "backslash"],
    },
    {
      id: "trigger-words",
      title: "Trigger words",
      summary: "Words a LoRA was trained together with. Writing them in the prompt brings out its effect.",
      points: [
        "Character and concept LoRAs often stay weak without them. Style LoRAs usually need none.",
        "The model page on Civitai lists them.",
      ],
      forgelight: "A LoRA's details show its trigger words. Clicking one adds it to the prompt.",
      related: ["models/lora", "troubleshooting/no-effect"],
      keywords: ["trigger", "activation", "trained words", "keyword"],
    },
    {
      id: "lora-syntax",
      title: "LoRAs in prompt text",
      summary:
        "The classic Forge page adds a LoRA by writing <lora:file name:strength> into the prompt. Generation data shows LoRAs this way too.",
      points: ["Example: <lora:sparkle_hsr:0.8> uses the file sparkle_hsr at strength 0.8."],
      forgelight: "LoRA chips do the same without typing. Applying generation data turns these tags into chips.",
      related: ["models/lora"],
      keywords: ["<lora", "syntax", "tag", "lora tag"],
    },
  ],
};
