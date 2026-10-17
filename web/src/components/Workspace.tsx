import { Group, Panel, Separator, useDefaultLayout, type LayoutStorage } from "react-resizable-panels";
import type { ConnectionState } from "../api/queries";
import { useOverlayOpen } from "../hooks/useOverlayOpen";
import { usePreferences } from "../stores/preferences";
import { useHasPanelSections } from "../stores/settings";
import { PromptFields } from "./controls/PromptFields";
import { ControlsPanel } from "./ControlsPanel";
import { Tagline } from "./Tagline";
import { HistoryRail } from "./HistoryRail";
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
 */
function Stage({ connection }: { connection: ConnectionState }) {
  const above = usePreferences((s) => s.promptPosition) === "above";
  const composer = (
    <div className={`shrink-0 px-4 ${above ? "pt-4" : "pt-1"} pb-2.5`}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5">
        <PromptFields connected={connection === "connected"} />
        <Tagline />
      </div>
    </div>
  );
  return (
    <div className="flex h-full flex-col bg-viewer">
      {above && composer}
      <div className="min-h-0 flex-1">
        <Viewer connection={connection} />
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
