import type { ConnectionState } from "../api/queries";
import { useView, type View } from "../stores/view";
import { CheckpointPicker } from "./CheckpointPicker";
import { LogoMark } from "./Logo";
import { ConnectionStatus } from "./ConnectionStatus";
import { SettingsMenu } from "./SettingsMenu";
import { ThemeSwitch } from "./ThemeSwitch";

const VIEWS: { id: View; label: string }[] = [
  { id: "generate", label: "Generate" },
  { id: "library", label: "Library" },
];

function ViewSwitch() {
  const view = useView((s) => s.view);
  const setView = useView((s) => s.setView);
  return (
    <nav aria-label="Screens" className="flex rounded-md border border-line p-0.5">
      {VIEWS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setView(id)}
          aria-current={view === id ? "page" : undefined}
          className={`h-7 rounded-[5px] px-3 text-[13px] ${
            view === id ? "bg-raised font-medium text-fg-strong" : "text-muted hover:text-fg-strong"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export function TopBar({ connection }: { connection: ConnectionState }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-canvas px-4">
      <span className="flex items-center gap-2">
        <LogoMark className="size-5 text-accent" />
        <span className="text-[15px] font-semibold tracking-tight text-fg-strong">Forgelight</span>
      </span>
      <ViewSwitch />
      <CheckpointPicker enabled={connection === "connected"} />
      <div className="ml-auto flex items-center gap-2">
        <ConnectionStatus state={connection} />
        <ThemeSwitch />
        <SettingsMenu />
      </div>
    </header>
  );
}
