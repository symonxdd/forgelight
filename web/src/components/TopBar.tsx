import type { ConnectionState } from "../api/queries";
import { CheckpointPicker } from "./CheckpointPicker";
import { ConnectionStatus } from "./ConnectionStatus";
import { SettingsDialog } from "./SettingsDialog";
import { ThemeSwitch } from "./ThemeSwitch";

export function TopBar({ connection }: { connection: ConnectionState }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-canvas px-4">
      <span className="text-[15px] font-semibold tracking-tight text-fg-strong">Forgelight</span>
      <CheckpointPicker enabled={connection === "connected"} />
      <div className="ml-auto flex items-center gap-2">
        <ConnectionStatus state={connection} />
        <ThemeSwitch />
        <SettingsDialog />
      </div>
    </header>
  );
}
