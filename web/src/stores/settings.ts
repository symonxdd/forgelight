import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "../lib/storage";
import { DEFAULT_SETTINGS, type GenerationSettings } from "../lib/txt2img";

export type SectionId = "loras" | "recommended" | "size" | "sampling" | "hires";

/** The sections in the settings column beside the image; LoRAs live in the prompt card. */
const PANEL_SECTIONS: SectionId[] = ["recommended", "size", "sampling", "hires"];

interface SettingsState extends GenerationSettings {
  openSections: Record<SectionId, boolean>;
  /** Sections hidden with the pills above the panel. Their settings still apply. */
  hiddenSections: SectionId[];
  update: (changes: Partial<GenerationSettings>) => void;
  setSectionOpen: (id: SectionId, open: boolean) => void;
  toggleSectionHidden: (id: SectionId) => void;
}

/** The generation settings, remembered between visits. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      openSections: { loras: true, recommended: true, size: true, sampling: true, hires: true },
      hiddenSections: [],
      update: (changes) => set(changes),
      setSectionOpen: (id, open) => set((s) => ({ openSections: { ...s.openSections, [id]: open } })),
      toggleSectionHidden: (id) =>
        set((s) => ({
          hiddenSections: s.hiddenSections.includes(id)
            ? s.hiddenSections.filter((h) => h !== id)
            : [...s.hiddenSections, id],
        })),
    }),
    {
      name: "forgelight.settings",
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        ...pickSettings(s),
        openSections: s.openSections,
        hiddenSections: s.hiddenSections,
      }),
      // Anything missing or of the wrong type in storage falls back to the default.
      merge: (stored, current) => {
        const saved = (stored ?? {}) as Record<string, unknown>;
        const merged = { ...current } as Record<string, unknown>;
        for (const key of Object.keys(current)) {
          if (key in saved && typeof saved[key] === typeof merged[key]) merged[key] = saved[key];
        }
        // Sections added later start open, next to the saved state of the others.
        merged.openSections = { ...current.openSections, ...(merged.openSections as object) };
        return merged as unknown as SettingsState;
      },
    },
  ),
);

export function currentSettings(): GenerationSettings {
  return pickSettings(useSettings.getState());
}

function pickSettings(s: GenerationSettings): GenerationSettings {
  return {
    prompt: s.prompt,
    negativePrompt: s.negativePrompt,
    width: s.width,
    height: s.height,
    steps: s.steps,
    cfgScale: s.cfgScale,
    sampler: s.sampler,
    scheduler: s.scheduler,
    seed: s.seed,
    batchCount: s.batchCount,
    loras: s.loras,
    hiresEnabled: s.hiresEnabled,
    hiresScale: s.hiresScale,
    hiresUpscaler: s.hiresUpscaler,
    hiresDenoise: s.hiresDenoise,
    img2imgStrength: s.img2imgStrength,
  };
}

/** True while at least one settings column section is shown, so the column is needed. */
export function useHasPanelSections(): boolean {
  return useSettings((s) => PANEL_SECTIONS.some((id) => !s.hiddenSections.includes(id)));
}
