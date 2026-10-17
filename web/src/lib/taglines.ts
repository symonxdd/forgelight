/** Calm lines shown in small print under the prompt card; one is picked per visit. */
export const TAGLINES = [
  "Create something beautiful.",
  "Every image starts with a few words.",
  "Describe it, and watch it appear.",
  "Take your time. Make something lovely.",
  "Light the forge. Make something new.",
  "Imagine it first.",
  "Small words, big pictures.",
  "A blank canvas, waiting for your words.",
] as const;

export const TAGLINE_KEY = "forgelight.lastTagline";

/**
 * A random tagline other than the one shown last time, so every visit or reload brings a
 * new one. `random` returns a number from 0 up to (not including) 1, like Math.random.
 */
export function pickTagline(last: string | null, random: () => number = Math.random): string {
  const choices = TAGLINES.filter((line) => line !== last);
  return choices[Math.floor(random() * choices.length)] ?? TAGLINES[0];
}
