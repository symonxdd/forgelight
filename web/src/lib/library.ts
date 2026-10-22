import { parseInfotext, seedFromInfotext } from "./infotext";

/** One image in Forge's output folders, as the Library lists it. */
export interface LibraryItem {
  /** Output folder name plus the path inside it: "txt2img/2026-10-16/00012-1234.png". */
  id: string;
  width: number;
  height: number;
  /** Last change, in seconds since 1970. */
  mtime: number;
  bytes: number;
  infotext: string;
  /** Likely adult, guessed by the extension from words in the prompt. */
  nsfw: boolean;
  /** Starred in the Library. */
  favorite: boolean;
  /** In the private vault: listed only while unlocked, and deleted for good. */
  private?: boolean;
}

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Images made together: one batch, or the same settings generated again soon after. */
export interface Batch {
  /** The id of its newest image. */
  key: string;
  /** Its newest image's date, for sorting it into a day. */
  mtime: number;
  /** Newest first. */
  items: LibraryItem[];
}

/** "2026-10-16" in local time, the same keys the Library's day counts use. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "Today", "Yesterday", "Wed, Oct 15", or with the year when it isn't this year. */
export function dayLabel(date: Date, now: Date): string {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(now)) return "Today";
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/** Splits a newest-first list into days, keeping the order. */
export function groupByDay<T extends { mtime: number }>(items: readonly T[], now: Date = new Date()): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = new Date(item.mtime * 1000);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(date, now), items: [item] });
  }
  return groups;
}

const API = "/forgelight/api/library";

/** The full image. The date in the address lets the browser cache it for good. */
export function imageUrl(item: LibraryItem): string {
  return `${API}/image?id=${encodeURIComponent(item.id)}&v=${item.mtime}`;
}

export function thumbUrl(item: LibraryItem): string {
  return `${API}/thumb?id=${encodeURIComponent(item.id)}&v=${item.mtime}`;
}

/** The seed from the image's settings, or -1 when it has none. */
export function seedOf(item: LibraryItem): number {
  return seedFromInfotext(item.infotext);
}

/** The file name without its folders: "00012-1234.png". */
export function fileName(item: LibraryItem): string {
  return item.id.slice(item.id.lastIndexOf("/") + 1);
}

// Settings that differ inside one batch: each image gets the next seed and its place.
const PER_IMAGE = new Set(["Seed", "Batch pos"]);
// Same settings again after a longer break count as a new session.
const BATCH_GAP_SECONDS = 15 * 60;

/** What images of one batch share: everything in their settings but the seed. */
export function batchKey(item: LibraryItem): string | null {
  if (!item.infotext) return null;
  const parsed = parseInfotext(item.infotext);
  const params = parsed.params.filter(([label]) => !PER_IMAGE.has(label));
  return JSON.stringify([parsed.prompt, parsed.negativePrompt, params]);
}

/**
 * Groups a newest-first list into batches: neighbors with the same settings apart
 * from the seed, saved within a few minutes of each other.
 */
export function groupBatches(items: readonly LibraryItem[]): Batch[] {
  const batches: Batch[] = [];
  let lastKey: string | null = null;
  for (const item of items) {
    const key = batchKey(item);
    const last = batches[batches.length - 1];
    const previous = last?.items[last.items.length - 1];
    const close = previous !== undefined && Math.abs(previous.mtime - item.mtime) <= BATCH_GAP_SECONDS;
    if (last && key !== null && key === lastKey && close) last.items.push(item);
    else batches.push({ key: item.id, mtime: item.mtime, items: [item] });
    lastKey = key;
  }
  return batches;
}

/** Every image on its own, for when batches aren't stacked. */
export function singles(items: readonly LibraryItem[]): Batch[] {
  return items.map((item) => ({ key: item.id, mtime: item.mtime, items: [item] }));
}
