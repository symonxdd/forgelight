import { Tooltip } from "radix-ui";
import { useEffect } from "react";
import { useConnection } from "./api/queries";
import { FloatingMessages } from "./components/controls/Messages";
import { Guide } from "./components/guide/Guide";
import { GuidePeek } from "./components/guide/GuidePeek";
import { Library } from "./components/library/Library";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";
import { useCheckpointMemory } from "./hooks/useCheckpointMemory";
import { useShortcuts } from "./hooks/useShortcuts";
import { resumeAfterReload } from "./stores/generation";
import { restoreSession } from "./stores/sessionMemory";
import { useView } from "./stores/view";

export function App() {
  const connection = useConnection();
  const view = useView((s) => s.view);
  useCheckpointMemory(connection === "connected");
  useShortcuts();
  // After a reload: the Session strip first, then a generation that was still running.
  useEffect(() => {
    if (connection === "connected") void restoreSession().then(resumeAfterReload);
  }, [connection]);
  return (
    <Tooltip.Provider delayDuration={0} skipDelayDuration={0} disableHoverableContent>
      <div className="flex h-full flex-col">
        <TopBar connection={connection} />
        {view === "library" ? (
          <Library />
        ) : view === "guide" ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <Guide />
            <FloatingMessages />
          </div>
        ) : (
          <Workspace connection={connection} />
        )}
        <GuidePeek />
      </div>
    </Tooltip.Provider>
  );
}
