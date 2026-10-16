import { extractLoras } from "./loras";
import type { GenerationSettings } from "./txt2img";

export interface ParsedInfotext {
  prompt: string;
  negativePrompt: string;
  /** "Steps: 25, Sampler: DPM++ 2M, …" split into label/value pairs, in order. */
  params: [string, string][];
}

/**
 * Splits the settings text Forge embeds in every image. The last line holds
 * comma-separated "Label: value" pairs; values may be quoted and contain commas.
 */
export function parseInfotext(text: string): ParsedInfotext {
  const lines = text.trim().split("\n");
  const paramsLine = lines.length > 0 && /^\s*Steps: /.test(lines[lines.length - 1] ?? "") ? (lines.pop() ?? "") : "";

  const negativeAt = lines.findIndex((line) => line.startsWith("Negative prompt:"));
  const promptLines = negativeAt === -1 ? lines : lines.slice(0, negativeAt);
  const negativeLines = negativeAt === -1 ? [] : lines.slice(negativeAt);
  const negativePrompt = negativeLines.join("\n").replace(/^Negative prompt:\s*/, "");

  const params: [string, string][] = [];
  const pair = /\s*([^:,]+):\s*("(?:\\.|[^"\\])*"|[^,]*)(?:,|$)/g;
  for (const match of paramsLine.matchAll(pair)) {
    const label = match[1]?.trim();
    let value = match[2]?.trim() ?? "";
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value) as string;
      } catch {
        // keep the raw text
      }
    }
    if (label) params.push([label, value]);
  }
  return { prompt: promptLines.join("\n"), negativePrompt, params };
}

export function paramValue(parsed: ParsedInfotext, label: string): string | undefined {
  return parsed.params.find(([l]) => l === label)?.[1];
}

/** True for text that carries generation settings, like data copied from an image on Civitai. */
export function looksLikeGenerationData(text: string): boolean {
  return /(^|\n)\s*Steps: \d+,/.test(text) && /\b(Sampler|Seed): /.test(text);
}

/** The checkpoint an image was made with, as far as its settings text says. */
export function modelFromInfotext(parsed: ParsedInfotext): { name?: string; hash?: string } {
  return { name: paramValue(parsed, "Model"), hash: paramValue(parsed, "Model hash")?.toLowerCase() };
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The generation settings an image was made with, for "Use these settings".
 * Only fields present in the text are returned; the checkpoint is left to the user.
 */
export function settingsFromInfotext(parsed: ParsedInfotext): Partial<GenerationSettings> {
  // LoRA tags in the prompt become separate LoRA entries, keeping the prompt text clean.
  const { prompt, loras } = extractLoras(parsed.prompt);
  const result: Partial<GenerationSettings> = { prompt, loras, negativePrompt: parsed.negativePrompt };
  const size = paramValue(parsed, "Size")?.match(/^(\d+)x(\d+)$/);
  const fields: Partial<GenerationSettings> = {
    steps: toNumber(paramValue(parsed, "Steps")),
    cfgScale: toNumber(paramValue(parsed, "CFG scale")),
    seed: toNumber(paramValue(parsed, "Seed")),
    sampler: paramValue(parsed, "Sampler"),
    scheduler: paramValue(parsed, "Schedule type"),
    width: size ? Number(size[1]) : undefined,
    height: size ? Number(size[2]) : undefined,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) Object.assign(result, { [key]: value });
  }
  return result;
}
