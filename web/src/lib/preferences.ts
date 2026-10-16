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
