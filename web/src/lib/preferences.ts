export type Theme = "light" | "dark";

export const FONTS = [
  { id: "inter", label: "Inter", stack: '"Inter Variable"' },
  { id: "geist", label: "Geist", stack: '"Geist Variable"' },
  { id: "plex", label: "IBM Plex Sans", stack: '"IBM Plex Sans Variable"' },
  { id: "figtree", label: "Figtree", stack: '"Figtree Variable"' },
  { id: "segoe", label: "Segoe UI", stack: '"Segoe UI Variable Text", "Segoe UI"' },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

export const DEFAULT_FONT: FontId = "inter";
export const FALLBACK_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Storage keys are also read by the inline script in index.html.
export const THEME_KEY = "forgelight.theme";
export const FONT_KEY = "forgelight.font";
export const OLED_KEY = "forgelight.oled";
export const CIVITAI_SITE_KEY = "forgelight.civitaiSite";
export const LIBRARY_BLUR_KEY = "forgelight.libraryBlur";
export const LIBRARY_STACKS_KEY = "forgelight.libraryStacks";
export const PROMPT_POSITION_KEY = "forgelight.promptPosition";

/** Where the prompt card sits on the Generate screen: under the image (default) or above it. */
export type PromptPosition = "below" | "above";

export function parsePromptPosition(value: string | null): PromptPosition {
  return value === "above" ? "above" : "below";
}

/** Which Library previews are blurred until pointed at. */
export const LIBRARY_BLUR_CHOICES = [
  { id: "off", label: "Off" },
  { id: "nsfw", label: "Likely NSFW" },
  { id: "all", label: "All images" },
] as const;

export type LibraryBlur = (typeof LIBRARY_BLUR_CHOICES)[number]["id"];

export function parseLibraryBlur(value: string | null): LibraryBlur {
  return value === "nsfw" || value === "all" ? value : "off";
}

/** Civitai runs the same site on two addresses; .red also shows mature preview images. */
export const CIVITAI_SITES = [
  { id: "com", label: "civitai.com" },
  { id: "red", label: "civitai.red" },
] as const;

export type CivitaiSite = (typeof CIVITAI_SITES)[number]["id"];

export function parseCivitaiSite(value: string | null): CivitaiSite {
  return value === "red" ? "red" : "com";
}

/** Points a Civitai page link at the chosen site; the rest of the address is identical. */
export function civitaiLink(url: string, site: CivitaiSite): string {
  return url.replace(/^https:\/\/civitai\.(com|red)(?=\/)/, `https://civitai.${site}`);
}

/** null means OLED has never been decided: it switches on the first time dark mode is in use. */
export function parseOled(value: string | null): boolean | null {
  return value === "true" ? true : value === "false" ? false : null;
}

/** OLED is on the first time dark mode is used, then stays whatever the user leaves it at. */
export function resolveOled(stored: boolean | null, theme: Theme): boolean | null {
  return stored === null && theme === "dark" ? true : stored;
}

export function parseTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

/** A theme the user picked wins; until then the theme follows the system. */
export function resolveTheme(chosen: Theme | null, systemPrefersDark: boolean): Theme {
  return chosen ?? (systemPrefersDark ? "dark" : "light");
}

export function parseFont(value: string | null): FontId {
  return FONTS.some((font) => font.id === value) ? (value as FontId) : DEFAULT_FONT;
}

export function fontStack(id: FontId): string {
  const font = FONTS.find((f) => f.id === id) ?? FONTS[0];
  return `${font.stack}, ${FALLBACK_STACK}`;
}

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private window); the choice then lasts for this visit only.
  }
}
