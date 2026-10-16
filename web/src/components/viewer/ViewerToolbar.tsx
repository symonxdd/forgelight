import { Download, Info, Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";
import type { SessionImage } from "../../stores/session";
import { currentScale, toggleFullscreen, useViewer } from "../../stores/viewer";
import { Hint } from "../Hint";
import { IconButton } from "../IconButton";

function useIsFullscreen(): boolean {
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  return fullscreen;
}

function TextButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Hint label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        className={`h-8 rounded-md px-2.5 text-[12px] font-medium ${
          pressed ? "bg-raised text-fg-strong" : "text-muted hover:bg-raised hover:text-fg-strong"
        }`}
      >
        {children}
      </button>
    </Hint>
  );
}

export function ViewerToolbar({ image }: { image: SessionImage | undefined }) {
  const viewer = useViewer();
  const fullscreen = useIsFullscreen();
  const percent = Math.round(currentScale(viewer) * 100);

  return (
    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-lg shadow-black/10">
      <TextButton label="Fit to window (0)" pressed={viewer.fitMode} onClick={viewer.fit}>
        Fit
      </TextButton>
      <TextButton
        label="Actual size (1)"
        pressed={!viewer.fitMode && viewer.view.scale === 1}
        onClick={viewer.actualSize}
      >
        1:1
      </TextButton>
      <span className="w-12 text-center text-[12px] text-muted tabular-nums" aria-live="polite">
        {percent}%
      </span>
      <div className="mx-1 h-5 w-px bg-line" />
      <IconButton
        label="Image info (I)"
        onClick={() => viewer.setInfoOpen(!viewer.infoOpen)}
        aria-pressed={viewer.infoOpen}
        className={viewer.infoOpen ? "bg-raised text-fg-strong" : ""}
        disabled={!image}
      >
        <Info className="size-4" aria-hidden />
      </IconButton>
      {image && (
        <Hint label={"Download"}>
          <a
            href={image.url}
            download={`forgelight-${image.seed}.png`}
            aria-label="Download"
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg-strong"
          >
            <Download className="size-4" aria-hidden />
          </a>
        </Hint>
      )}
      <IconButton label={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"} onClick={toggleFullscreen}>
        {fullscreen ? <Minimize className="size-4" aria-hidden /> : <Maximize className="size-4" aria-hidden />}
      </IconButton>
    </div>
  );
}
