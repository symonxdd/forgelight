import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  parseRemembered,
  pickRemembered,
  sameRemembered,
  settingsToLoad,
  type RememberedSettings,
} from "../lib/checkpointMemory";
import { safeStorage } from "../lib/storage";
import { useSession } from "./session";
import { useSettings } from "./settings";

interface MemoryState {
  /** On until switched off in Settings. */
  enabled: boolean;
  /** The checkpoint whose settings are on screen, by model name. */
  lastCheckpoint: string | null;
  byCheckpoint: Record<string, RememberedSettings>;
  setEnabled: (enabled: boolean) => void;
}

/** Size and Sampling settings per checkpoint, remembered between visits. */
export const useCheckpointMemory = create<MemoryState>()(
  persist(
    (set) => ({
      enabled: true,
      lastCheckpoint: null,
      byCheckpoint: {},
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: "forgelight.checkpointMemory",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ enabled: s.enabled, lastCheckpoint: s.lastCheckpoint, byCheckpoint: s.byCheckpoint }),
      // Anything unreadable in storage is dropped rather than loaded.
      merge: (stored, current) => {
        const saved = (stored ?? {}) as Record<string, unknown>;
        const byCheckpoint: Record<string, RememberedSettings> = {};
        if (typeof saved.byCheckpoint === "object" && saved.byCheckpoint !== null) {
          for (const [key, value] of Object.entries(saved.byCheckpoint)) {
            const entry = parseRemembered(value);
            if (entry) byCheckpoint[key] = entry;
          }
        }
        return {
          ...current,
          enabled: typeof saved.enabled === "boolean" ? saved.enabled : current.enabled,
          lastCheckpoint: typeof saved.lastCheckpoint === "string" ? saved.lastCheckpoint : null,
          byCheckpoint,
        };
      },
    },
  ),
);

// While settings from an image are applied ahead of the checkpoint switch they bring,
// they belong to the coming checkpoint, not the one still selected.
let expected: string | null = null;
let expectedTimer: ReturnType<typeof setTimeout> | undefined;

export function expectCheckpointSwitch(key: string): void {
  expected = key;
  clearTimeout(expectedTimer);
  // Should the switch never arrive, remembering resumes on its own.
  expectedTimer = setTimeout(() => (expected = null), 30_000);
}

export function cancelExpectedSwitch(): void {
  expected = null;
  clearTimeout(expectedTimer);
}

function save(key: string): void {
  const entry = pickRemembered(useSettings.getState());
  useCheckpointMemory.setState((s) => ({ byCheckpoint: { ...s.byCheckpoint, [key]: entry } }));
}

// Every change to Size or Sampling is remembered for the checkpoint on screen.
useSettings.subscribe((state, previous) => {
  const { lastCheckpoint } = useCheckpointMemory.getState();
  if (!lastCheckpoint || expected) return;
  if (!sameRemembered(pickRemembered(state), pickRemembered(previous))) save(lastCheckpoint);
});

/**
 * Runs whenever Forge's checkpoint is known. After a switch, from here or from the
 * classic page, it brings back what was last used with the new checkpoint.
 */
export function checkpointChanged(key: string, name: string): void {
  const memory = useCheckpointMemory.getState();
  if (key === memory.lastCheckpoint) return;
  const keep = expected === key;
  if (keep) cancelExpectedSwitch();
  // What's on screen still belongs to the checkpoint left behind, unless it came with the switch.
  else if (memory.lastCheckpoint !== null) save(memory.lastCheckpoint);
  // Set next, so the settings loaded below are remembered for the new checkpoint.
  useCheckpointMemory.setState({ lastCheckpoint: key });
  const current = pickRemembered(useSettings.getState());
  const load =
    memory.lastCheckpoint !== null && memory.enabled ? settingsToLoad(memory.byCheckpoint[key], current, keep) : null;
  if (!load) return save(key);
  useSettings.getState().update(load);
  useSession.getState().setNotice({
    tone: "info",
    text: `Restored the Size, Sampling and Hires fix last used with ${name}.`,
    action: { label: "Undo", run: () => useSettings.getState().update(current) },
  });
}
