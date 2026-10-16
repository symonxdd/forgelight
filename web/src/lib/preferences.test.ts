import { describe, expect, it } from "vitest";
import { DEFAULT_FONT, fontStack, parseFont, parseOled, parseTheme, resolveOled, resolveTheme } from "./preferences";

describe("theme", () => {
  it("follows the system until the user picks a theme", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("keeps the user's choice regardless of the system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("ignores anything that is not light or dark", () => {
    expect(parseTheme("system")).toBeNull();
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme("dark")).toBe("dark");
  });
});

describe("OLED", () => {
  it("switches on the first time dark mode is in use", () => {
    expect(resolveOled(null, "dark")).toBe(true);
  });

  it("stays undecided while only light mode has been used", () => {
    expect(resolveOled(null, "light")).toBeNull();
  });

  it("keeps the user's choice once made", () => {
    expect(resolveOled(false, "dark")).toBe(false);
    expect(resolveOled(true, "light")).toBe(true);
  });

  it("reads only true and false from storage", () => {
    expect(parseOled("true")).toBe(true);
    expect(parseOled("false")).toBe(false);
    expect(parseOled("yes")).toBeNull();
  });
});

describe("font", () => {
  it("falls back to the default for unknown values", () => {
    expect(parseFont("comic-sans")).toBe(DEFAULT_FONT);
    expect(parseFont(null)).toBe(DEFAULT_FONT);
    expect(parseFont("geist")).toBe("geist");
  });

  it("always ends the stack with sans-serif fallbacks", () => {
    expect(fontStack("plex")).toMatch(/^"IBM Plex Sans Variable", .*sans-serif$/);
  });
});
