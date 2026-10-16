import { create } from "zustand";
import { clampScale, type View } from "../lib/zoom";

interface ViewerState {
  /** In fit mode the image always fills the viewport; any zoom or pan leaves it. */
  fitMode: boolean;
  view: View;
  /** Current fit scale, reported by the stage so zoom steps can start from it. */
  fitScale: number;
  infoOpen: boolean;
  fit: () => void;
  actualSize: () => void;
  zoomBy: (factor: number) => void;
  setView: (view: View) => void;
  setFitScale: (scale: number) => void;
  setInfoOpen: (open: boolean) => void;
}

export const useViewer = create<ViewerState>((set, get) => ({
  fitMode: true,
  view: { scale: 1, x: 0, y: 0 },
  fitScale: 1,
  infoOpen: false,
  fit: () => set({ fitMode: true }),
  actualSize: () => set({ fitMode: false, view: { scale: 1, x: 0, y: 0 } }),
  zoomBy: (factor) => {
    const { fitMode, fitScale, view } = get();
    const current = fitMode ? { scale: fitScale, x: 0, y: 0 } : view;
    set({ fitMode: false, view: { ...current, scale: clampScale(current.scale * factor) } });
  },
  setView: (view) => set({ fitMode: false, view }),
  setFitScale: (fitScale) => set({ fitScale }),
  setInfoOpen: (infoOpen) => set({ infoOpen }),
}));

export function currentScale(state: Pick<ViewerState, "fitMode" | "fitScale" | "view">): number {
  return state.fitMode ? state.fitScale : state.view.scale;
}

export function toggleFullscreen(): void {
  const root = document.querySelector<HTMLElement>("[data-viewer-root]");
  if (document.fullscreenElement) void document.exitFullscreen();
  else void root?.requestFullscreen().catch(() => undefined);
}
