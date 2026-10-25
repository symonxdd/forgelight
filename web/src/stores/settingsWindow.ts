import { create } from "zustand";

export type SettingsPageId =
  "appearance" | "generating" | "privacy" | "folders" | "forge" | "system" | "updates" | "about";

/** Which Settings page is open, or null while the window is closed. Anything can open it, such as the VRAM meter. */
export const useSettingsWindow = create<{
  page: SettingsPageId | null;
  setPage: (page: SettingsPageId | null) => void;
}>((set) => ({
  page: null,
  setPage: (page) => set({ page }),
}));
