import type { ConnectionState } from "../api/queries";
import { useView, type View } from "../stores/view";
import { useState } from "react";
import { FlameCard } from "./about/FlameCard";
import { LogoMark } from "./Logo";
import { ConnectionStatus } from "./ConnectionStatus";
import { LockButton } from "./private/LockButton";
import { SettingsMenu } from "./SettingsMenu";
import { ThemeSwitch } from "./ThemeSwitch";

const VIEWS: { id: View; label: string }[] = [
  { id: "generate", label: "Generate" },
  { id: "library", label: "Library" },
  { id: "guide", label: "Guide" },
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

/** The logo, which plays the flame card from About when clicked. */
function FlameButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Light the flame"
        className="-m-1 grid place-items-center rounded-md p-1 text-accent hover:brightness-125"
      >
        <LogoMark className="size-5" />
      </button>
      {open && <FlameCard onDone={() => setOpen(false)} />}
    </>
  );
}

/** Three columns, so the screen switch sits exactly in the middle whatever the sides hold. */
export function TopBar({ connection }: { connection: ConnectionState }) {
  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-canvas px-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex shrink-0 items-center gap-2">
          <FlameButton />
          <span className="text-[15px] font-semibold tracking-tight text-fg-strong">Forgelight</span>
        </span>
      </div>
      <ViewSwitch />
      <div className="flex items-center justify-end gap-2">
        <LockButton />
        <ConnectionStatus state={connection} />
        <ThemeSwitch />
        <SettingsMenu />
      </div>
    </header>
  );
}
