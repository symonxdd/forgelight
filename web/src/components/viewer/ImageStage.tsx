import { useEffect, useRef, useState } from "react";
import { fitScale as computeFit, zoomAt, type View } from "../../lib/zoom";
import { currentScale, useViewer } from "../../stores/viewer";

interface ImageStageProps {
  src: string;
  /** Shown beneath `src` until it has faded in, for a smooth hand-over from the live preview. */
  underlay?: string | null;
  width: number;
  height: number;
  /** Changes when a different image is shown; resets the view to fit. */
  imageKey: string;
  fadeIn?: boolean;
  alt: string;
}

/** Shows one image with wheel zoom at the cursor, drag to pan and double-click to toggle 100%. */
export function ImageStage({ src, underlay, width, height, imageKey, fadeIn, alt }: ImageStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; view: View } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showUnderlay, setShowUnderlay] = useState(Boolean(underlay));
  const { fitMode, view, fitScale } = useViewer();
  const scale = currentScale({ fitMode, view, fitScale });
  const offset = fitMode ? { x: 0, y: 0 } : view;

  // A new image starts fitted to the viewport.
  useEffect(() => {
    useViewer.getState().fit();
  }, [imageKey]);

  // Keep the fit scale in step with the viewport size.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () =>
      useViewer.getState().setFitScale(computeFit(width, height, element.clientWidth, element.clientHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const state = useViewer.getState();
      const current: View = state.fitMode ? { scale: state.fitScale, x: 0, y: 0 } : state.view;
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      state.setView(zoomAt(current, current.scale * Math.exp(-event.deltaY * 0.0015), px, py));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, view: { scale, ...offset } };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.startX;
    const dy = event.clientY - start.startY;
    if (!dragging && Math.hypot(dx, dy) < 3) return;
    setDragging(true);
    useViewer.getState().setView({ ...start.view, x: start.view.x + dx, y: start.view.y + dy });
  };

  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };

  const onDoubleClick = (event: React.MouseEvent) => {
    const state = useViewer.getState();
    if (!state.fitMode) return state.fit();
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - rect.width / 2;
    const py = event.clientY - rect.top - rect.height / 2;
    state.setView(zoomAt({ scale: state.fitScale, x: 0, y: 0 }, 1, px, py));
  };

  const imageStyle = {
    width,
    height,
    marginLeft: -width / 2,
    marginTop: -height / 2,
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    imageRendering: scale >= 3 ? ("pixelated" as const) : undefined,
  };
  const imageClass = "pointer-events-none absolute top-1/2 left-1/2 max-w-none origin-center select-none";

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      className={`absolute inset-0 overflow-hidden ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      {underlay && showUnderlay && <img src={underlay} alt="" aria-hidden className={imageClass} style={imageStyle} />}
      <img
        key={imageKey}
        src={src}
        alt={alt}
        draggable={false}
        onAnimationEnd={() => setShowUnderlay(false)}
        className={`${imageClass} ${fadeIn ? "animate-[fade-in_180ms_ease-out]" : ""}`}
        style={imageStyle}
      />
    </div>
  );
}
