import { create } from "zustand";
import type { LoadStep } from "../lib/progress";

/** Measured while an image was made: from Generate to the finished image, and the most VRAM in use. */
export interface ImageStats {
  seconds: number;
  /** How many images the job made in that time. */
  images: number;
  peakVram: number | null;
  totalVram: number | null;
}

export interface SessionImage {
  id: string;
  /** Object URL of the PNG Forge returned. */
  url: string;
  width: number;
  height: number;
  seed: number;
  infotext: string;
  createdAt: number;
  /** Made in private mode: saved only in the vault, and never remembered by the browser. */
  private?: boolean;
  /** Only for images made while Forgelight was open. */
  stats?: ImageStats;
}

export type JobPhase = "waiting" | "preparing" | "sampling";

export type Job =
  | { status: "idle" }
  | {
      status: "running";
      taskId: string;
      phase: JobPhase;
      progress: number;
      etaSeconds: number | null;
      previewUrl: string | null;
      startedAt: number;
      width: number;
      height: number;
      batchCount: number;
      /** The final size when hires fix runs a second pass, otherwise null. */
      hires: { width: number; height: number } | null;
      /** Set once this generation turns out to load the checkpoint first. */
      loading: LoadStep | null;
      /** Whether the extension has reported on loading at all; without it, the label guesses. */
      loadingKnown: boolean;
      stopping: boolean;
      /** Forge is enlarging an image with an upscaler, which reports no progress. */
      enlarging: boolean;
    };

export interface Notice {
  tone: "info" | "warning" | "error";
  text: string;
  /** One optional button, such as "Undo". */
  action?: { label: string; run: () => void };
}

export interface ShownNotice extends Notice {
  id: number;
  /** On its way out: it stays in the list until its closing animation ends. */
  leaving: boolean;
}

/** Messages shown at once; a newer one sends the oldest away. */
const MAX_NOTICES = 3;
let lastNoticeId = 0;

/** Keeps memory bounded on a long session; older images remain in Forge's outputs folder. */
const MAX_SESSION_IMAGES = 200;

interface SessionState {
  images: SessionImage[];
  selectedId: string | null;
  /** The viewer was cleared: it shows nothing until an image is picked or a new one arrives. */
  cleared: boolean;
  job: Job;
  /** The last live preview, shown beneath the finished image while it fades in. */
  handoff: { imageId: string; previewUrl: string } | null;
  /** Short messages in the top right corner, such as "Settings applied.", newest first. */
  notices: ShownNotice[];
  showNotice: (notice: Notice) => void;
  /** Starts a message's closing animation. */
  dismissNotice: (id: number) => void;
  /** Closes every error, when a new job starts. */
  dismissErrors: () => void;
  /** Takes a message out once its closing animation ended. */
  removeNotice: (id: number) => void;
  addImages: (images: SessionImage[]) => void;
  select: (id: string | null) => void;
  clearView: () => void;
  selectRelative: (delta: number) => void;
  setJob: (job: Job) => void;
}

export const useSession = create<SessionState>((set, get) => ({
  images: [],
  selectedId: null,
  cleared: false,
  job: { status: "idle" },
  handoff: null,
  notices: [],
  showNotice: (notice) =>
    set(({ notices }) => {
      // The same message again replaces its older copy instead of stacking up.
      const older = notices.map((n) => (n.text === notice.text ? { ...n, leaving: true } : n));
      let staying = 0;
      return {
        notices: [{ ...notice, id: ++lastNoticeId, leaving: false }, ...older].map((n) =>
          n.leaving || ++staying <= MAX_NOTICES ? n : { ...n, leaving: true },
        ),
      };
    }),
  dismissNotice: (id) =>
    set(({ notices }) => ({ notices: notices.map((n) => (n.id === id ? { ...n, leaving: true } : n)) })),
  dismissErrors: () =>
    set(({ notices }) => ({ notices: notices.map((n) => (n.tone === "error" ? { ...n, leaving: true } : n)) })),
  removeNotice: (id) => set(({ notices }) => ({ notices: notices.filter((n) => n.id !== id) })),
  addImages: (added) => {
    if (added.length === 0) return;
    const { images, job } = get();
    const all = [...added, ...images];
    all.slice(MAX_SESSION_IMAGES).forEach((img) => URL.revokeObjectURL(img.url));
    const first = added[0];
    const previewUrl = job.status === "running" ? job.previewUrl : null;
    set({
      images: all.slice(0, MAX_SESSION_IMAGES),
      selectedId: first?.id ?? null,
      cleared: false,
      handoff: first && previewUrl ? { imageId: first.id, previewUrl } : null,
    });
  },
  select: (selectedId) => set({ selectedId, cleared: false }),
  clearView: () => set({ cleared: true }),
  selectRelative: (delta) => {
    const { images, selectedId } = get();
    if (images.length === 0) return;
    const index = images.findIndex((img) => img.id === selectedId);
    const next = Math.min(images.length - 1, Math.max(0, (index === -1 ? 0 : index) + delta));
    set({ selectedId: images[next]?.id ?? null, cleared: false });
  },
  setJob: (job) => set({ job }),
}));

export function selectedImage(
  state: Pick<SessionState, "images" | "selectedId" | "cleared">,
): SessionImage | undefined {
  if (state.cleared) return undefined;
  return state.images.find((img) => img.id === state.selectedId) ?? state.images[0];
}
