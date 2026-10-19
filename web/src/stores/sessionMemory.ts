import { request } from "../api/forgelight";
import type { LibraryPage } from "../api/library";
import { imageUrl } from "../lib/library";
import { matchStoredImages, type PendingJob, type StoredImage, type StoredSession } from "../lib/sessionMemory";
import { tabStorage } from "../lib/storage";
import { useSession } from "./session";

// Kept in this tab's sessionStorage: a reload keeps them, closing the tab forgets them.
const SESSION_KEY = "forgelight.session";
const PENDING_KEY = "forgelight.pendingJob";

function read<T>(key: string): T | null {
  try {
    return JSON.parse(tabStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

export function readPendingJob(): PendingJob | null {
  return read<PendingJob>(PENDING_KEY);
}

/** Remembers the running generation, so a reload can follow it to the end. */
export function writePendingJob(job: PendingJob): void {
  tabStorage.setItem(PENDING_KEY, JSON.stringify(job));
}

export function clearPendingJob(): void {
  tabStorage.removeItem(PENDING_KEY);
}

// Read before anything below writes, so the session from before the reload isn't overwritten.
const before = read<StoredSession>(SESSION_KEY);

useSession.subscribe((state, previous) => {
  if (state.images === previous.images && state.selectedId === previous.selectedId) return;
  const images: StoredImage[] = state.images.map(({ id, width, height, seed, infotext, createdAt }) => ({
    id,
    width,
    height,
    seed,
    infotext,
    createdAt,
  }));
  tabStorage.setItem(SESSION_KEY, JSON.stringify({ images, selectedId: state.selectedId } satisfies StoredSession));
});

let restoring: Promise<void> | null = null;

/**
 * Brings back the Session strip from before a reload. Only the settings were kept; the
 * images themselves are found again among the files Forge saved.
 */
export function restoreSession(): Promise<void> {
  restoring ??= (async () => {
    if (!before?.images.length) return;
    const page = await request<LibraryPage>(`library?offset=0&limit=${Math.min(1000, before.images.length + 100)}`);
    const restored = matchStoredImages(before.images, page.items).map(({ stored, item }) => ({
      ...stored,
      url: imageUrl(item),
    }));
    if (restored.length === 0) return;
    useSession.setState((state) => {
      const selectedId = state.selectedId ?? restored.find((img) => img.id === before.selectedId)?.id ?? null;
      return { images: [...state.images, ...restored], selectedId };
    });
  })().catch(() => {
    // Forge isn't reachable yet; try again on the next call.
    restoring = null;
  });
  return restoring;
}
