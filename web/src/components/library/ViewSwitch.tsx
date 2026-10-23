import { Lock, LockOpen, Star } from "lucide-react";
import { useState, type ReactNode } from "react";
import { usePrivateStatus } from "../../api/private";
import { Hint } from "../Hint";
import { SteadyLabel } from "../SteadyLabel";
import { UnlockDialog } from "../private/UnlockDialog";

export type LibraryView = "all" | "favorites" | "private";

function Choice({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`flex h-full items-center gap-1.5 rounded-[5px] px-2.5 text-[13px] whitespace-nowrap ${
        checked ? "bg-raised text-fg-strong" : "text-muted hover:text-fg-strong"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Which images the Library shows: all, only favorites, or only private ones. While private
 * images are locked, the Private choice carries the lock and how many are hidden, and asks
 * for the password first. It appears once private mode is set up.
 */
export function ViewSwitch({
  view,
  hidden,
  onChange,
}: {
  view: LibraryView;
  /** Private images left out while locked. */
  hidden: number;
  onChange: (view: LibraryView) => void;
}) {
  const status = usePrivateStatus();
  const [unlocking, setUnlocking] = useState(false);
  const setUp = status.data?.setUp ?? false;
  const unlocked = status.data?.unlocked ?? false;
  const lockedHint =
    hidden === 1
      ? "1 private image is hidden. Click to unlock."
      : `${hidden} private images are hidden. Click to unlock.`;

  return (
    <div
      role="radiogroup"
      aria-label="Show"
      className="flex h-8 items-center gap-0.5 rounded-md border border-line bg-surface p-0.5"
    >
      <Choice checked={view === "all"} onClick={() => onChange("all")}>
        <SteadyLabel text="All" bold={view === "all"} />
      </Choice>
      <Choice checked={view === "favorites"} onClick={() => onChange("favorites")}>
        <Star className={`size-3.5 ${view === "favorites" ? "fill-current" : ""}`} aria-hidden />
        <SteadyLabel text="Favorites" bold={view === "favorites"} />
      </Choice>
      {setUp && (
        <Hint label={unlocked ? null : lockedHint}>
          <span className="flex h-full">
            <Choice checked={view === "private"} onClick={() => (unlocked ? onChange("private") : setUnlocking(true))}>
              {unlocked ? <LockOpen className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
              <SteadyLabel text="Private" bold={view === "private"} />
              {!unlocked && hidden > 0 && (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-raised px-1.5 text-[11px] text-fg tabular-nums">
                  {hidden}
                </span>
              )}
            </Choice>
          </span>
        </Hint>
      )}
      <UnlockDialog open={unlocking} onOpenChange={setUnlocking} onUnlocked={() => onChange("private")} />
    </div>
  );
}
