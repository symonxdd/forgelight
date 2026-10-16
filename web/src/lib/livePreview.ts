/** Live preview choices, mapped onto Forge's own preview settings. */
export const LIVE_PREVIEW_CHOICES = [
  { id: "1", label: "Every step", steps: 1 },
  { id: "3", label: "Every 3 steps", steps: 3 },
  { id: "10", label: "Every 10 steps", steps: 10 },
  { id: "off", label: "Off", steps: null },
] as const;

export type LivePreviewChoice = (typeof LIVE_PREVIEW_CHOICES)[number]["id"];

/** Which choice matches Forge's current settings, or undefined for a custom value set elsewhere. */
export function currentLivePreview(enabled: unknown, everyNSteps: unknown): LivePreviewChoice | undefined {
  if (enabled === false) return "off";
  const steps = Math.round(Number(everyNSteps));
  return LIVE_PREVIEW_CHOICES.find((c) => c.steps === steps)?.id;
}

/** The Forge settings to send for a choice. */
export function livePreviewSettings(choice: LivePreviewChoice): Record<string, unknown> {
  const found = LIVE_PREVIEW_CHOICES.find((c) => c.id === choice);
  if (!found || found.steps === null) return { live_previews_enable: false };
  return { live_previews_enable: true, show_progress_every_n_steps: found.steps };
}
