import { ArrowLeft, ChevronLeft, ChevronRight, FolderOpen, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRevealImage } from "../../api/library";
import { imageUrl, seedOf, thumbUrl, type LibraryItem } from "../../lib/library";
import type { SessionImage } from "../../stores/session";
import { useView } from "../../stores/view";
import { useViewer } from "../../stores/viewer";
import { Hint } from "../Hint";
import { IconButton } from "../IconButton";
import { ImageStage } from "../viewer/ImageStage";
import { InfoDrawer } from "../viewer/InfoDrawer";
import { ViewerToolbar } from "../viewer/ViewerToolbar";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

function when(item: LibraryItem): string {
  return new Date(item.mtime * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StepButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  const label = side === "left" ? "Newer image (←)" : "Older image (→)";
  return (
    <Hint label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-muted shadow-lg shadow-black/10 hover:text-fg-strong ${
          side === "left" ? "left-3" : "right-3"
        }`}
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </Hint>
  );
}

interface LibraryViewerProps {
  items: LibraryItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** Called near the end of what's loaded, so stepping on never runs dry. */
  onNearEnd: () => void;
  onDelete: () => void;
  /** The images made together with this one, newest first; a strip shows them when there are several. */
  batch: LibraryItem[];
}

/** One Library image over the grid, with the same zoom, info and settings reuse as the Generate screen. */
export function LibraryViewer({ items, index, onIndex, onClose, onNearEnd, onDelete, batch }: LibraryViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const item = items[index]!;
  const infoOpen = useViewer((s) => s.infoOpen);
  const setView = useView((s) => s.setView);
  const reveal = useRevealImage();

  // The Generate screen's info panel and toolbar work with this shape.
  const image: SessionImage = useMemo(
    () => ({
      id: item.id,
      url: imageUrl(item),
      width: item.width || 1024,
      height: item.height || 1024,
      seed: seedOf(item),
      infotext: item.infotext,
      createdAt: item.mtime * 1000,
    }),
    [item],
  );

  const step = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < items.length) onIndex(next);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    if (index >= items.length - 6) onNearEnd();
  }, [index, items.length, onNearEnd]);

  // Keys go to the viewer from the start, so F, I and the zoom keys work at once.
  useEffect(() => ref.current?.focus(), []);

  // Captured before the app-wide shortcuts, where Escape would stop a running generation.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      // An open dropdown or the delete dialog handles its own keys.
      if (document.querySelector("[role='listbox'], [role='menu'], [role='alertdialog']")) return;
      const viewer = useViewer.getState();
      const actions: Record<string, () => void> = {
        Escape: () => (viewer.infoOpen ? viewer.setInfoOpen(false) : onClose()),
        ArrowLeft: () => step(-1),
        ArrowUp: () => step(-1),
        ArrowRight: () => step(1),
        ArrowDown: () => step(1),
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, step]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Image"
      tabIndex={-1}
      data-viewer-root
      data-shortcuts="viewer"
      className="absolute inset-0 z-20 flex bg-viewer outline-none"
    >
      <div className="relative min-w-0 flex-1">
        <ImageStage
          key={item.id}
          imageKey={item.id}
          src={image.url}
          width={image.width}
          height={image.height}
          alt={`Image from ${when(item)}`}
          onBackgroundClick={onClose}
        />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface pr-3 pl-2.5 text-[13px] text-fg shadow-lg shadow-black/10 hover:text-fg-strong"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Library
          </button>
          <span className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] text-muted tabular-nums shadow-lg shadow-black/10">
            {when(item)}
          </span>
        </div>
        {batch.length > 1 && (
          <div
            role="group"
            aria-label="Made together"
            className="absolute top-3 left-1/2 flex max-w-[min(60%,40rem)] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-lg border border-line bg-surface p-1.5 shadow-lg shadow-black/10"
          >
            <span className="shrink-0 px-1.5 text-[12px] whitespace-nowrap text-muted tabular-nums">
              {batch.findIndex((b) => b.id === item.id) + 1} of {batch.length}
            </span>
            {batch.map((other) => (
              <button
                key={other.id}
                type="button"
                onClick={() => onIndex(items.findIndex((i) => i.id === other.id))}
                aria-label={`Show image ${batch.indexOf(other) + 1} of ${batch.length}`}
                aria-current={other.id === item.id}
                className={`aspect-[3/4] h-12 shrink-0 overflow-hidden rounded-md outline-offset-1 ${
                  other.id === item.id ? "outline-2 outline-accent" : "opacity-55 hover:opacity-100"
                }`}
              >
                <img src={thumbUrl(other)} alt="" draggable={false} className="size-full object-cover object-top" />
              </button>
            ))}
          </div>
        )}
        {index > 0 && <StepButton side="left" onClick={() => step(-1)} />}
        {index < items.length - 1 && <StepButton side="right" onClick={() => step(1)} />}
        <ViewerToolbar
          image={image}
          extra={
            <>
              <IconButton label="Show in folder" onClick={() => reveal.mutate(item.id)}>
                <FolderOpen className="size-4" aria-hidden />
              </IconButton>
              <IconButton label="Delete" onClick={onDelete}>
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </>
          }
        />
      </div>
      {infoOpen && <InfoDrawer image={image} onApplied={() => setView("generate")} />}
    </div>
  );
}
