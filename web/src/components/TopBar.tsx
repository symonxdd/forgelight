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

/** Three columns, so the screen switch sits exactly in the middle whatever the sides hold. */
export function TopBar({ connection }: { connection: ConnectionState }) {
  const view = useView((s) => s.view);
  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-canvas px-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex shrink-0 items-center gap-2">
          <LogoMark className="size-5 text-accent" />
          <span className="text-[15px] font-semibold tracking-tight text-fg-strong">Forgelight</span>
        </span>
        {/* The checkpoint only matters where images are made. */}
        {view === "generate" && <CheckpointPicker enabled={connection === "connected"} />}
      </div>
      <ViewSwitch />
      <div className="flex items-center justify-end gap-2">
        <ConnectionStatus state={connection} />
        <ThemeSwitch />
        <SettingsMenu />
      </div>
    </header>
  );
}
