import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "../lib/storage";
import { DEFAULT_SETTINGS, type GenerationSettings } from "../lib/txt2img";

export type SectionId = "loras" | "size" | "sampling";

interface SettingsState extends GenerationSettings {
  negativeOpen: boolean;
  openSections: Record<SectionId, boolean>;
  update: (changes: Partial<GenerationSettings>) => void;
  setNegativeOpen: (open: boolean) => void;
  setSectionOpen: (id: SectionId, open: boolean) => void;
}

/** The generation settings, remembered between visits. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      negativeOpen: false,
      openSections: { loras: true, size: true, sampling: true },
      update: (changes) => set(changes),
      setNegativeOpen: (negativeOpen) => set({ negativeOpen }),
      setSectionOpen: (id, open) => set((s) => ({ openSections: { ...s.openSections, [id]: open } })),
    }),
    {
      name: "forgelight.settings",
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ ...pickSettings(s), negativeOpen: s.negativeOpen, openSections: s.openSections }),
      // Anything missing or of the wrong type in storage falls back to the default.
      merge: (stored, current) => {
        const saved = (stored ?? {}) as Record<string, unknown>;
        const merged = { ...current } as Record<string, unknown>;
        for (const key of Object.keys(current)) {
          if (key in saved && typeof saved[key] === typeof merged[key]) merged[key] = saved[key];
        }
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
  };
}
