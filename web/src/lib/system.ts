import type { SystemOverview } from "../api/system";
import type { ImageStats } from "../stores/session";
import { formatNumber } from "./region";

const GB = 1024 ** 3;
const MB = 1024 ** 2;

/** "4,1 GB", "13,0 GB": always in GB, for memory. One decimal below 100, so a live value keeps its width. */
export function formatGb(bytes: number): string {
  const gb = bytes / GB;
  const decimals = gb >= 100 ? 0 : 1;
  return `${formatNumber(gb, decimals, decimals)} GB`;
}

/** "18,4 GB" or "90 MB": for files, which are often well under a GB. */
export function formatBytes(bytes: number): string {
  return bytes >= GB ? formatGb(bytes) : `${formatNumber(Math.max(bytes > 0 ? 1 : 0, Math.round(bytes / MB)))} MB`;
}

/** A share between 0 and 1, for a bar. */
export function share(part: number, whole: number): number {
  return whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0;
}

/** "RTX 2060 (notebook)": without the maker's prefixes, and marked when it is a notebook's card. */
export function gpuLabel(name: string | null, portable: boolean): string | null {
  if (!name) return null;
  const short = name.replace(/^NVIDIA\s+/i, "").replace(/^GeForce\s+/i, "");
  return portable && !/laptop/i.test(short) ? `${short} (notebook)` : short;
}

/** "1 checkpoint", "31 LoRAs". */
export function counted(count: number, word: string): string {
  return `${formatNumber(count)} ${word}${count === 1 ? "" : "s"}`;
}

/** "Forge 2.0.1 · Python 3.10.6 · PyTorch 2.3.1 · CUDA 12.1 · Windows 11"; a report adds Forge's commit. */
export function versionLine(versions: SystemOverview["versions"], withCommit = false): string {
  const { forge, forgeCommit, python, torch, cuda, windows } = versions;
  const commit = withCommit && forgeCommit;
  const forgeName = forge && commit ? `${forge} (${commit})` : forge || commit;
  return [forgeName && `Forge ${forgeName}`, `Python ${python}`, `PyTorch ${torch}`, cuda && `CUDA ${cuda}`, windows]
    .filter(Boolean)
    .join(" · ");
}

/** Everything about this computer in a few lines, for a bug report or a question on a forum. */
export function systemReport(system: SystemOverview): string {
  const gpu = gpuLabel(system.gpu, system.portable);
  return [
    `Forgelight ${system.versions.forgelight}`,
    versionLine(system.versions, true),
    gpu && `${gpu}${system.vramTotal ? `, ${formatGb(system.vramTotal)} VRAM` : ""}`,
    `${formatGb(system.ramTotal)} RAM`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Image info lines: "14,2 s" (or "28,4 s for 2 images") and "5,6 of 6,0 GB". */
export function statsLines(stats: ImageStats): [string, string][] {
  const time = `${formatNumber(stats.seconds, 1)} s${stats.images > 1 ? ` for ${formatNumber(stats.images)} images` : ""}`;
  const lines: [string, string][] = [["Time", time]];
  if (stats.peakVram !== null) {
    const peak = stats.totalVram
      ? `${formatNumber(stats.peakVram / GB, 1)} of ${formatGb(stats.totalVram)}`
      : formatGb(stats.peakVram);
    lines.push(["Peak VRAM", peak]);
  }
  return lines;
}
