import { formatNumber } from "./region";

/** A checkpoint or LoRA in Downloads or on the Desktop that Forge doesn't have yet. */
export interface FoundModelInfo {
  /** "desktop/name.safetensors": stays the same while the file stays where it is. */
  id: string;
  place: "downloads" | "desktop";
  /** "Downloads" or "Desktop". */
  placeLabel: string;
  file: string;
  size: number;
  kind: "checkpoint" | "lora";
  /** Forge's folder for this kind: "Checkpoints" or "Lora". */
  targetLabel: string;
  /** The name it gets in Forge's folder; differs when Forge has another file by the same name. */
  targetName: string;
  /** The user chose not to have this file suggested. */
  hidden: boolean;
}

/** "6.9 GB", "228 MB": one decimal only where it helps. */
export function formatSize(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${formatNumber(gb, gb >= 10 ? 0 : 1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

export function kindLabel(kind: FoundModelInfo["kind"]): string {
  return kind === "checkpoint" ? "Checkpoint" : "LoRA";
}

/** "on the Desktop" or "in Downloads". */
export function placePhrase(place: FoundModelInfo["place"]): string {
  return place === "desktop" ? "on the Desktop" : "in Downloads";
}

/** What Move to Forge does, in one short line for the button's tooltip. */
export function moveExplanation(found: FoundModelInfo): string {
  const from = found.place === "desktop" ? "the Desktop" : "Downloads";
  return `Moves it from ${from} into Forge's ${found.targetLabel} folder. Not a copy, so it leaves ${from}.`;
}

/** "New checkpoint on the Desktop", "New LoRA in Downloads". */
export function offerTitle(found: Pick<FoundModelInfo, "kind" | "place">): string {
  return `New ${found.kind === "checkpoint" ? "checkpoint" : "LoRA"} ${placePhrase(found.place)}`;
}

/** The plain line under an offer: where the file goes, and that it moves rather than copies. */
export function moveNote(found: FoundModelInfo): string {
  const renamed =
    found.targetName === found.file ? "" : ` as ${found.targetName}, since Forge has a different file by that name`;
  return `Moves into Forge's ${found.targetLabel} folder${renamed}. Not a copy.`;
}

/** The files the strip offers: not hidden for good and not put off with "Not now" during this visit. */
export function cardModels<T extends FoundModelInfo>(found: readonly T[], snoozed: readonly string[]): T[] {
  return found.filter((f) => !f.hidden && !snoozed.includes(f.id));
}
