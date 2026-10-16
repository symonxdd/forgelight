import { Group, Panel, Separator, useDefaultLayout, type LayoutStorage } from "react-resizable-panels";
import type { ConnectionState } from "../api/queries";
import { useOverlayOpen } from "../hooks/useOverlayOpen";
import { ControlsPanel } from "./ControlsPanel";
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

export function Workspace({ connection }: { connection: ConnectionState }) {
  // With a menu open, the panel edges must not react to the pointer passing over them.
  const overlayOpen = useOverlayOpen();
  // v2: the two-column settings panel needs a wider default than layouts saved before it.
  const layout = useDefaultLayout({ id: "forgelight.workspace.v3", storage, onlySaveAfterUserInteractions: true });

  return (
    <Group
      orientation="horizontal"
      disabled={overlayOpen}
      disableCursor={overlayOpen}
      defaultLayout={layout.defaultLayout}
      onLayoutChanged={layout.onLayoutChanged}
      className="min-h-0 flex-1"
    >
      <Panel id="controls" defaultSize="45" minSize={300} maxSize="65">
        <ControlsPanel connected={connection === "connected"} />
      </Panel>
      <ResizeHandle />
      <Panel id="viewer" minSize="25">
        <Viewer connection={connection} />
      </Panel>
      <ResizeHandle />
      <Panel id="history" defaultSize={128} minSize={96} maxSize={280} collapsible collapsedSize={0}>
        <HistoryRail />
      </Panel>
    </Group>
  );
}
