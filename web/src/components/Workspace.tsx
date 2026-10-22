import { Group, Panel, Separator, useDefaultLayout, type LayoutStorage } from "react-resizable-panels";
import type { ConnectionState } from "../api/queries";
import { ImagePlus } from "lucide-react";
import { useOverlayOpen } from "../hooks/useOverlayOpen";
import { useStartImageInput } from "../hooks/useStartImageInput";
import { usePreferences } from "../stores/preferences";
import { useHasPanelSections } from "../stores/settings";
import { Messages } from "./controls/Messages";
import { PromptFields } from "./controls/PromptFields";
import { ControlsPanel } from "./ControlsPanel";
import { Tagline } from "./Tagline";
import { HistoryRail } from "./HistoryRail";
import { NewModelsStrip } from "./newmodels/NewModelsStrip";
import { Viewer } from "./viewer/Viewer";

// Panel sizes are remembered between visits; storage failures just mean defaults next time.
const storage: LayoutStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
};

function ResizeHandle() {
  return (
    <Separator className="relative w-px bg-line outline-none data-[separator=active]:bg-accent data-[separator=focus]:bg-accent data-[separator=hover]:bg-line-strong" />
  );
}

/**
 * The middle of the screen: the image, with the prompt card centered under it, or above
 * it when moved there. The card sits outside the viewer, so typing never triggers viewer keys.
 * Newly found models show as a strip on the image side of the card.
 */
function Stage({ connection }: { connection: ConnectionState }) {
  const above = usePreferences((s) => s.promptPosition) === "above";
  const { dragging, dropTarget } = useStartImageInput();
  const composer = (
    <div className={`shrink-0 px-4 ${above ? "pt-4" : "pt-1"} pb-2.5`}>
      <div className="mx-auto flex w-full max-w-270 flex-col gap-2.5">
        {!above && <NewModelsStrip />}
        <PromptFields connected={connection === "connected"} />
        <Tagline />
        {above && <NewModelsStrip />}
      </div>
    </div>
  );
  return (
    <div {...dropTarget} className="relative flex h-full flex-col bg-viewer">
      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-40 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-canvas/80">
          <p className="flex items-center gap-2 text-[14px] font-medium text-fg-strong">
            <ImagePlus className="size-5 text-accent" aria-hidden />
            Drop to use as the starting image
          </p>
        </div>
      )}
      {above && composer}
      <div className="relative min-h-0 flex-1">
        <Viewer connection={connection} />
        {/* Messages sit in the image's top right corner, away from the prompt and the zoom bar. */}
        <div className="absolute top-3 right-3 z-30 w-[min(20rem,calc(100%-1.5rem))]">
          <Messages />
        </div>
      </div>
      {!above && composer}
    </div>
  );
}

export function Workspace({ connection }: { connection: ConnectionState }) {
  // With a menu open, the panel edges must not react to the pointer passing over them.
  const overlayOpen = useOverlayOpen();
  const showPanel = useHasPanelSections();
  // v5: a wider settings column by default.
  const layout = useDefaultLayout({ id: "forgelight.workspace.v5", storage, onlySaveAfterUserInteractions: true });

  return (
    <Group
      orientation="horizontal"
      disabled={overlayOpen}
      disableCursor={overlayOpen}
      defaultLayout={layout.defaultLayout}
      onLayoutChanged={layout.onLayoutChanged}
      className="min-h-0 flex-1"
    >
      {showPanel && (
        <>
          {/* A share of the window rather than fixed pixels: about 480 pixels on a large monitor,
              narrower on a laptop, where the image needs the room. */}
          <Panel id="controls" defaultSize="23.5" minSize={280} maxSize={560}>
            <ControlsPanel />
          </Panel>
          <ResizeHandle />
        </>
      )}
      <Panel id="stage" minSize="35">
        <Stage connection={connection} />
      </Panel>
      <ResizeHandle />
      <Panel id="history" defaultSize={128} minSize={96} maxSize={280} collapsible collapsedSize={0}>
        <HistoryRail />
      </Panel>
    </Group>
  );
}
