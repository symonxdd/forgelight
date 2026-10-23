import { Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { lockPrivate, usePrivateStatus } from "../../api/private";
import { Hint } from "../Hint";
import { UnlockDialog } from "./UnlockDialog";
import { useVaultTab } from "./useVaultTab";

const fade = "motion-safe:transition-[opacity,scale,translate] motion-safe:duration-[450ms] motion-safe:ease-in-out";

// Written out in full, so Tailwind finds every class. At rest the state shows; pointing at the
// button (or reaching it with the keyboard) slides the action in: Lock or Unlock.
const REST_LABEL =
  "group-hover:-translate-y-full group-hover:opacity-0 group-focus-visible:-translate-y-full group-focus-visible:opacity-0";
const ACTION_LABEL =
  "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100";
const HIDDEN_LABEL = "translate-y-full opacity-0";
const REST_ICON =
  "group-hover:scale-75 group-hover:opacity-0 group-focus-visible:scale-75 group-focus-visible:opacity-0";
const ACTION_ICON =
  "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100";
const HIDDEN_ICON = "scale-75 opacity-0";

/**
 * The vault's state in the top bar, on every screen, once private mode is set up: a quiet
 * "Locked", or the accent "Unlocked", so a glance tells which. A click locks or asks for the
 * PIN or password. All four words share one cell, so the button never changes size. Right
 * after a click the pointer is still on it; the action preview waits until it has left, so
 * "Locked" isn't instantly covered by "Unlock".
 */
export function VaultStatus() {
  const status = usePrivateStatus().data;
  const unlocked = Boolean(status?.unlocked);
  const [unlocking, setUnlocking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState(true);
  useVaultTab(unlocked);
  if (!status?.setUp) return null;

  const click = async () => {
    setSettled(false);
    if (!unlocked) return setUnlocking(true);
    setBusy(true);
    try {
      await lockPrivate();
    } finally {
      setBusy(false);
    }
  };

  const label = (state: "unlocked" | "locked", role: "rest" | "action") => {
    if ((state === "unlocked") !== unlocked) return HIDDEN_LABEL;
    if (role === "rest") return settled ? REST_LABEL : "";
    return settled ? ACTION_LABEL : HIDDEN_LABEL;
  };
  const icon = (closed: boolean) => {
    // At rest the icon shows the state; the preview shows what a click does.
    const rest = closed !== unlocked;
    if (!settled) return rest ? "" : HIDDEN_ICON;
    return rest ? REST_ICON : ACTION_ICON;
  };

  return (
    <>
      <Hint
        label={
          unlocked
            ? "Private images are visible. Click to lock them"
            : "Private images are locked. Click to unlock with the PIN or password"
        }
      >
        <button
          type="button"
          onClick={() => void click()}
          onMouseLeave={() => setSettled(true)}
          onBlur={() => setSettled(true)}
          disabled={busy}
          aria-label={unlocked ? "Private images are unlocked. Lock them" : "Private images are locked. Unlock them"}
          className={`group flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-300 motion-reduce:transition-none ${
            unlocked ? "bg-accent/12 text-accent hover:bg-accent/20" : "text-muted hover:bg-raised hover:text-fg-strong"
          }`}
        >
          <span className="relative grid size-4 place-items-center" aria-hidden>
            <LockOpen className={`absolute size-4 ${fade} ${icon(false)}`} />
            <Lock className={`absolute size-4 ${fade} ${icon(true)}`} />
          </span>
          {/* Inter sits a little high in its line box; 1px down centers the letters by eye. */}
          <span className="grid translate-y-px overflow-hidden text-left" aria-hidden>
            <span className={`[grid-area:1/1] ${fade} ${label("unlocked", "rest")}`}>Unlocked</span>
            <span className={`[grid-area:1/1] ${fade} ${label("unlocked", "action")}`}>Lock</span>
            <span className={`[grid-area:1/1] ${fade} ${label("locked", "rest")}`}>Locked</span>
            <span className={`[grid-area:1/1] ${fade} ${label("locked", "action")}`}>Unlock</span>
          </span>
        </button>
      </Hint>
      <UnlockDialog open={unlocking} onOpenChange={setUnlocking} />
    </>
  );
}
