import { Tooltip } from "radix-ui";
import { useConnection } from "./api/queries";
import { Library } from "./components/library/Library";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";
import { useShortcuts } from "./hooks/useShortcuts";
import { useView } from "./stores/view";

export function App() {
  const connection = useConnection();
  const view = useView((s) => s.view);
  useShortcuts();
  return (
    <Tooltip.Provider delayDuration={0} skipDelayDuration={0} disableHoverableContent>
      <div className="flex h-full flex-col">
        <TopBar connection={connection} />
        {view === "library" ? <Library /> : <Workspace connection={connection} />}
      </div>
    </Tooltip.Provider>
  );
}
