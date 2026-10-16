import { create } from "zustand";

export interface SessionImage {
  id: string;
  /** Object URL of the PNG Forge returned. */
  url: string;
  width: number;
  height: number;
  seed: number;
  infotext: string;
  createdAt: number;
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
      stopping: boolean;
    }
  | { status: "error"; message: string };

/** Keeps memory bounded on a long session; older images remain in Forge's outputs folder. */
const MAX_SESSION_IMAGES = 200;

interface SessionState {
  images: SessionImage[];
  selectedId: string | null;
  job: Job;
  /** The last live preview, shown beneath the finished image while it fades in. */
  handoff: { imageId: string; previewUrl: string } | null;
  addImages: (images: SessionImage[]) => void;
  select: (id: string | null) => void;
  selectRelative: (delta: number) => void;
  setJob: (job: Job) => void;
}

export const useSession = create<SessionState>((set, get) => ({
  images: [],
  selectedId: null,
  job: { status: "idle" },
  handoff: null,
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
      handoff: first && previewUrl ? { imageId: first.id, previewUrl } : null,
    });
  },
  select: (selectedId) => set({ selectedId }),
  selectRelative: (delta) => {
    const { images, selectedId } = get();
    if (images.length === 0) return;
    const index = images.findIndex((img) => img.id === selectedId);
    const next = Math.min(images.length - 1, Math.max(0, (index === -1 ? 0 : index) + delta));
    set({ selectedId: images[next]?.id ?? null });
  },
  setJob: (job) => set({ job }),
}));

export function selectedImage(state: Pick<SessionState, "images" | "selectedId">): SessionImage | undefined {
  return state.images.find((img) => img.id === state.selectedId) ?? state.images[0];
}
