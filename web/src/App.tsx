import { Tooltip } from "radix-ui";
import { useConnection } from "./api/queries";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";
import { useShortcuts } from "./hooks/useShortcuts";

export function App() {
  const connection = useConnection();
  useShortcuts();
  return (
    <Tooltip.Provider delayDuration={0} skipDelayDuration={0} disableHoverableContent>
      <div className="flex h-full flex-col">
        <TopBar connection={connection} />
        <Workspace connection={connection} />
      </div>
    </Tooltip.Provider>
  );
}
