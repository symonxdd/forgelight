import { HELP } from "../help";

type HelpKey = keyof typeof HELP;

/** The guide topic ("chapter/topic") that explains each info tip in more depth. */
export const HELP_TOPICS: Partial<Record<HelpKey, string>> = {
  checkpoint: "models/checkpoint",
  prompt: "prompting/prompt",
  negativePrompt: "prompting/negative-prompt",
  loras: "models/lora",
  loraStrength: "models/lora",
  triggerWords: "prompting/trigger-words",
  size: "settings/size",
  sampling: "basics/how-an-image-is-made",
  sampler: "settings/sampler",
  scheduleType: "settings/sampler",
  steps: "settings/steps",
  cfgScale: "settings/cfg-scale",
  seed: "settings/seed",
  batchCount: "settings/seed",
  hiresFix: "settings/hires-fix",
  hiresScale: "settings/hires-fix",
  hiresUpscaler: "models/upscaler",
  hiresDenoise: "settings/hires-fix",
  img2imgStrength: "settings/image-to-image",
  civitaiSite: "getting-models/civitai",
  civitai: "getting-models/civitai",
};

// Info tips receive their text, not their key; the texts are unique, so they work as keys.
const BY_TEXT = new Map<string, string>(
  Object.entries(HELP_TOPICS).map(([key, topic]) => [HELP[key as HelpKey], topic]),
);

/** The guide topic for an info tip's text, if the guide covers it. */
export function guideTopicFor(text: string): string | undefined {
  return BY_TEXT.get(text);
}
