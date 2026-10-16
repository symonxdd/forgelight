/** A LoRA added to the generation: Forge's name for it (the file name) and its strength. */
export interface LoraSlot {
  name: string;
  weight: number;
}

export type Arch = "sd1" | "sdxl" | "flux" | "unknown";

const TAG = /<lora:([^:>]+)(?::([^:>]+))?(?::[^>]*)?>/gi;

function roundWeight(weight: number): string {
  return String(Math.round(weight * 100) / 100);
}

/** The prompt Forge receives: the user's prompt with a <lora:name:weight> tag per LoRA. */
export function promptWithLoras(prompt: string, loras: readonly LoraSlot[]): string {
  const tags = loras.map((l) => `<lora:${l.name}:${roundWeight(l.weight)}>`).join(" ");
  if (!tags) return prompt;
  return prompt.trim() ? `${prompt.trim()} ${tags}` : tags;
}

/**
 * Pulls <lora:...> tags out of a prompt (from pasted data or an image's settings),
 * returning the cleaned prompt and the LoRAs as separate entries.
 */
export function extractLoras(prompt: string): { prompt: string; loras: LoraSlot[] } {
  const loras: LoraSlot[] = [];
  const cleaned = prompt.replace(TAG, (_match, name: string, weight?: string) => {
    const value = weight === undefined ? 1 : Number(weight);
    loras.push({ name: name.trim(), weight: Number.isFinite(value) ? value : 1 });
    return "";
  });
  const tidy = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\s*,\s*(,\s*)+/g, ", ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/^[\s,]+|[\s,]+$/g, "");
  return { prompt: tidy, loras };
}

/** Whether a LoRA can work with the checkpoint: same family of model, or unknown. */
export function compatibility(
  loraArch: Arch | undefined,
  checkpointArch: Arch | undefined,
): "ok" | "mismatch" | "unknown" {
  if (!loraArch || !checkpointArch || loraArch === "unknown" || checkpointArch === "unknown") return "unknown";
  return loraArch === checkpointArch ? "ok" : "mismatch";
}

export const ARCH_LABEL: Record<Arch, string> = {
  sd1: "SD 1.5",
  sdxl: "SDXL",
  flux: "Flux",
  unknown: "an unknown model type",
};

/** Adds a trigger word to the prompt unless it is already there. */
export function addTriggerWord(prompt: string, word: string): string {
  const clean = word.trim().replace(/,+$/, "");
  if (!clean || hasTriggerWord(prompt, clean)) return prompt;
  const base = prompt.trim().replace(/,+$/, "");
  return base ? `${base}, ${clean}` : clean;
}

export function hasTriggerWord(prompt: string, word: string): boolean {
  const clean = word.trim().replace(/,+$/, "").toLowerCase();
  return clean.length > 0 && prompt.toLowerCase().includes(clean);
}
