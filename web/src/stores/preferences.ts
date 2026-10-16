import { create } from "zustand";
import {
  CIVITAI_SITE_KEY,
  FONT_KEY,
  OLED_KEY,
  THEME_KEY,
  parseCivitaiSite,
  parseFont,
  parseOled,
  parseTheme,
  readStored,
  resolveOled,
  resolveTheme,
  writeStored,
  type CivitaiSite,
  type FontId,
  type Theme,
} from "../lib/preferences";

interface PreferencesState {
  theme: Theme;
  /** True once the user has picked a theme; until then it follows the system. */
  themeChosen: boolean;
  /** Pure black dark mode. null until dark mode is first used. */
  oled: boolean | null;
  font: FontId;
  civitaiSite: CivitaiSite;
  setTheme: (theme: Theme) => void;
  setOled: (oled: boolean) => void;
  setFont: (font: FontId) => void;
  setCivitaiSite: (site: CivitaiSite) => void;
}

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const storedTheme = parseTheme(readStored(THEME_KEY));
const initialTheme = resolveTheme(storedTheme, systemDark.matches);

export const usePreferences = create<PreferencesState>((set) => ({
  theme: initialTheme,
  themeChosen: storedTheme !== null,
  oled: parseOled(readStored(OLED_KEY)),
  font: parseFont(readStored(FONT_KEY)),
  civitaiSite: parseCivitaiSite(readStored(CIVITAI_SITE_KEY)),
  setTheme: (theme) => {
    writeStored(THEME_KEY, theme);
    set({ theme, themeChosen: true });
  },
  setOled: (oled) => {
    writeStored(OLED_KEY, String(oled));
    set({ oled });
  },
  setFont: (font) => {
    writeStored(FONT_KEY, font);
    set({ font });
  },
  setCivitaiSite: (civitaiSite) => {
    writeStored(CIVITAI_SITE_KEY, civitaiSite);
    set({ civitaiSite });
  },
}));

systemDark.addEventListener("change", (event) => {
  const { themeChosen } = usePreferences.getState();
  if (!themeChosen) usePreferences.setState({ theme: resolveTheme(null, event.matches) });
});

function apply({ theme, oled, font }: PreferencesState) {
  const root = document.documentElement;
  const oledOn = theme === "dark" && oled === true;
  const themeChanges = root.dataset.theme !== theme || "oled" in root.dataset !== oledOn;
  if (themeChanges) {
    // Switch instantly: suspend all transitions for the frame the colours change in.
    root.dataset.switching = "";
    root.dataset.theme = theme;
    if (oledOn) root.dataset.oled = "";
    else delete root.dataset.oled;
    requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.switching));
  }
  root.dataset.font = font;
}

/** The first time dark mode is in use, OLED switches on and that choice is saved. */
function settleOled(state: PreferencesState) {
  const resolved = resolveOled(state.oled, state.theme);
  if (resolved !== state.oled && resolved !== null) state.setOled(resolved);
}

settleOled(usePreferences.getState());
apply(usePreferences.getState());
usePreferences.subscribe((state) => {
  settleOled(state);
  apply(usePreferences.getState());
});
