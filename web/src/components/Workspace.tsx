import { Group, Panel, Separator, useDefaultLayout, type LayoutStorage } from "react-resizable-panels";
import type { ConnectionState } from "../api/queries";
import { ControlsPanel } from "./ControlsPanel";
import { HistoryRail } from "./HistoryRail";
import { Viewer } from "./Viewer";

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
  const layout = useDefaultLayout({ id: "forgelight.workspace", storage, onlySaveAfterUserInteractions: true });

  return (
    <Group
      orientation="horizontal"
      defaultLayout={layout.defaultLayout}
      onLayoutChanged={layout.onLayoutChanged}
      className="min-h-0 flex-1"
    >
      <Panel id="controls" defaultSize="24" minSize={260} maxSize="40">
        <ControlsPanel />
      </Panel>
      <ResizeHandle />
      <Panel id="viewer" minSize="40">
        <Viewer connection={connection} />
      </Panel>
      <ResizeHandle />
      <Panel id="history" defaultSize={128} minSize={96} maxSize={280} collapsible collapsedSize={0}>
        <HistoryRail />
      </Panel>
    </Group>
  );
}
