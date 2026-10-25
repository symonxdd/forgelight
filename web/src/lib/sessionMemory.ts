import { parseInfotext } from "./infotext";
import type { LibraryItem } from "./library";
import type { ImageStats } from "../stores/session";

/** What a running generation needs to pick up again after the page reloads. */
export interface PendingJob {
  taskId: string;
  startedAt: number;
  width: number;
  height: number;
  batchCount: number;
  hires: { width: number; height: number } | null;
  /** The prompt as sent, LoRA tags included, to recognize the job's images among the saved ones. */
  prompt: string;
  /** Private mode: the images go into the vault and are picked up from the extension. No prompt is kept. */
  private?: boolean;
}

/** A session image without its picture, which is found again in Forge's outputs folder. */
export interface StoredImage {
  id: string;
  width: number;
  height: number;
  seed: number;
  infotext: string;
  createdAt: number;
  stats?: ImageStats;
}

export interface StoredSession {
  images: StoredImage[];
  selectedId: string | null;
}

// A file's date can sit a little before the job's start on the browser's clock.
const START_SLACK_MS = 5000;

/**
 * The images a job saved, in the order Forge made them: those saved since it started,
 * with its prompt. When none carry the prompt (Forge may rewrite it), the newest ones count.
 */
export function findJobResults(items: readonly LibraryItem[], job: PendingJob): LibraryItem[] {
  const recent = items.filter((item) => item.mtime * 1000 >= job.startedAt - START_SLACK_MS);
  const prompt = job.prompt.trim();
  const same = recent.filter((item) => parseInfotext(item.infotext).prompt.trim() === prompt);
  return (same.length > 0 ? same : recent).slice(0, job.batchCount).reverse();
}

/**
 * Pairs remembered session images with saved files by their settings text, newest first.
 * Two images with identical settings each get their own file. Images without a saved file
 * (deleted, or saving switched off in Forge) are left out.
 */
export function matchStoredImages(
  stored: readonly StoredImage[],
  items: readonly LibraryItem[],
): { stored: StoredImage; item: LibraryItem }[] {
  const used = new Set<string>();
  const pairs: { stored: StoredImage; item: LibraryItem }[] = [];
  for (const image of stored) {
    if (!image.infotext) continue;
    const item = items.find((candidate) => !used.has(candidate.id) && candidate.infotext === image.infotext);
    if (!item) continue;
    used.add(item.id);
    pairs.push({ stored: image, item });
  }
  return pairs;
}
