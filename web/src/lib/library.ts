import { paramValue, parseInfotext } from "./infotext";

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
}

export interface DayGroup {
  key: string;
  label: string;
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
export function groupByDay(items: readonly LibraryItem[], now: Date = new Date()): DayGroup[] {
  const groups: DayGroup[] = [];
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
  const seed = Number(paramValue(parseInfotext(item.infotext), "Seed"));
  return Number.isInteger(seed) ? seed : -1;
}

/** The file name without its folders: "00012-1234.png". */
export function fileName(item: LibraryItem): string {
  return item.id.slice(item.id.lastIndexOf("/") + 1);
}
