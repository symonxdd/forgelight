export interface View {
  scale: number;
  /** Offset of the image centre from the viewport centre, in screen pixels. */
  x: number;
  y: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 8;

/** The scale that shows the whole image in the viewport, with a small margin. */
export function fitScale(imageW: number, imageH: number, viewW: number, viewH: number, margin = 24): number {
  if (imageW <= 0 || imageH <= 0) return 1;
  const w = Math.max(1, viewW - margin * 2);
  const h = Math.max(1, viewH - margin * 2);
  return Math.min(w / imageW, h / imageH);
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Zooms to `nextScale` keeping the image point under the cursor fixed.
 * `px`/`py` are the cursor position relative to the viewport centre.
 */
export function zoomAt(view: View, nextScale: number, px: number, py: number): View {
  const scale = clampScale(nextScale);
  const ratio = scale / view.scale;
  return { scale, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio };
}
