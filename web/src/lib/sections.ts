import type { SectionId } from "../stores/settings";

/** The Generate screen's sections that can be hidden, in screen order. The prompt always shows. */
export const SECTIONS: readonly { id: SectionId; label: string }[] = [
  { id: "loras", label: "LoRAs" },
  { id: "recommended", label: "Recommended" },
  { id: "size", label: "Size" },
  { id: "sampling", label: "Sampling" },
  { id: "hires", label: "Hires fix" },
];

/** The dropdown's text: "All shown", "3 of 4 shown" or "All hidden". The list names them. */
export function sectionsSummary(hidden: readonly SectionId[]): string {
  const shown = SECTIONS.filter((section) => !hidden.includes(section.id)).length;
  if (shown === SECTIONS.length) return "All shown";
  if (shown === 0) return "All hidden";
  return `${shown} of ${SECTIONS.length} shown`;
}
