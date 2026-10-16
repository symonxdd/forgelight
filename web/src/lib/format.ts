/** "6 s", "1 min 12 s": short, for a progress label. */
export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${m} min` : `${m} min ${rest} s`;
}

export function randomTaskId(): string {
  return `task(forgelight-${crypto.randomUUID().slice(0, 8)})`;
}
