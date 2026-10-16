import { Tooltip } from "radix-ui";
import { useConnection } from "./api/queries";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";

export function App() {
  const connection = useConnection();
  return (
    <Tooltip.Provider delayDuration={400}>
      <div className="flex h-full flex-col">
        <TopBar connection={connection} />
        <Workspace connection={connection} />
      </div>
    </Tooltip.Provider>
  );
}
