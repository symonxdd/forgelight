import { useEffect, useState } from "react";
import { lockPrivate, usePrivateStatus } from "../../api/private";
import { Hint } from "../Hint";
import { UnlockDialog } from "./UnlockDialog";
import { useVaultTab } from "./useVaultTab";

/** A Lucide-style lock whose shackle is one path, so styles.css can morph it open and closed. */
function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 overflow-visible"
      aria-hidden
    >
      <path className="vault-shackle" d="M7 11V7a5 5 0 0 1 10 0v4" />
      <rect x="3" y="11" width="18" height="11" rx="2" />
    </svg>
  );
}

/**
 * The vault's state in the top bar, on every screen, once private mode is set up: a quiet gray
 * closed lock, or an open lock on a soft accent square. Hovering never changes the icon; the
 * Hint names the state and what a click does. A click locks or asks for the PIN or password,
 * and the change itself is the confirmation: the shackle snaps and the tint fades.
 */
export function VaultStatus() {
  const status = usePrivateStatus().data;
  const unlocked = Boolean(status?.unlocked);
  const [unlocking, setUnlocking] = useState(false);
  const [busy, setBusy] = useState(false);
  // The snap motion runs only while the state changes, so hovering stays instant.
  const [shown, setShown] = useState(unlocked);
  const [snapping, setSnapping] = useState(false);
  if (shown !== unlocked) {
    setShown(unlocked);
    setSnapping(true);
  }
  useEffect(() => {
    if (!snapping) return;
    const timer = setTimeout(() => setSnapping(false), 300);
    return () => clearTimeout(timer);
  }, [snapping]);
  useVaultTab(unlocked);
  if (!status?.setUp) return null;

  const click = async () => {
    if (!unlocked) return setUnlocking(true);
    setBusy(true);
    try {
      await lockPrivate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Hint
        label={
          <>
            <span className="block font-semibold">{unlocked ? "Unlocked" : "Locked"}</span>
            {unlocked ? "Click to lock" : "Click to unlock"}
          </>
        }
      >
        <button
          type="button"
          onClick={() => void click()}
          disabled={busy}
          data-unlocked={unlocked || undefined}
          aria-label={unlocked ? "Private images are unlocked. Lock them" : "Private images are locked. Unlock them"}
          className={`grid size-8 place-items-center rounded-md ${
            snapping ? "vault-snap transition-colors duration-200 motion-reduce:transition-none" : ""
          } ${unlocked ? "bg-accent/12 text-accent hover:bg-accent/20" : "text-muted hover:bg-raised hover:text-fg-strong"}`}
        >
          <LockIcon />
        </button>
      </Hint>
      <UnlockDialog open={unlocking} onOpenChange={setUnlocking} />
    </>
  );
}
