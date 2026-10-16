import { create } from "zustand";
import {
  FONT_KEY,
  THEME_KEY,
  parseFont,
  parseTheme,
  readStored,
  resolveTheme,
  writeStored,
  type FontId,
  type Theme,
} from "../lib/preferences";

interface PreferencesState {
  theme: Theme;
  /** True once the user has picked a theme; until then it follows the system. */
  themeChosen: boolean;
  font: FontId;
  setTheme: (theme: Theme) => void;
  setFont: (font: FontId) => void;
}

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const storedTheme = parseTheme(readStored(THEME_KEY));

export const usePreferences = create<PreferencesState>((set) => ({
  theme: resolveTheme(storedTheme, systemDark.matches),
  themeChosen: storedTheme !== null,
  font: parseFont(readStored(FONT_KEY)),
  setTheme: (theme) => {
    writeStored(THEME_KEY, theme);
    set({ theme, themeChosen: true });
  },
  setFont: (font) => {
    writeStored(FONT_KEY, font);
    set({ font });
  },
}));

systemDark.addEventListener("change", (event) => {
  const { themeChosen } = usePreferences.getState();
  if (!themeChosen) usePreferences.setState({ theme: resolveTheme(null, event.matches) });
});

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  // Switch instantly: suspend all transitions for the frame the colours change in.
  root.dataset.switching = "";
  root.dataset.theme = theme;
  requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.switching));
}

function applyFont(font: FontId) {
  document.documentElement.dataset.font = font;
}

applyTheme(usePreferences.getState().theme);
applyFont(usePreferences.getState().font);
usePreferences.subscribe((state, previous) => {
  if (state.theme !== previous.theme) applyTheme(state.theme);
  if (state.font !== previous.font) applyFont(state.font);
});
