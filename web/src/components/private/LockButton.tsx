import { Lock, LockOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { lockPrivate, usePrivateStatus } from "../../api/private";
import { Hint } from "../Hint";

/** How long "Locked" stays, then how long the button takes to fold away. */
const LOCKED_MS = 1300;
const LEAVE_MS = 420;

type Phase = "open" | "locking" | "locked" | "leaving";

const fade = "motion-safe:transition-[opacity,scale,translate] motion-safe:duration-[450ms] motion-safe:ease-in-out";

/**
 * In the top bar while private images are unlocked, on every screen, so they're never left
 * open by accident. A click closes the lock while "Lock" slides up and "Locked" takes its
 * place; both share one cell, so the button keeps its size. Then it fades out and only after
 * that does its space close, so the items beside it glide over without anything clipped.
 * Appearing runs the other way: the space opens, then the button fades in.
 */
export function LockButton() {
  const status = usePrivateStatus();
  const unlocked = Boolean(status.data?.unlocked);
  const [phase, setPhase] = useState<Phase>("open");
  // True one frame after the button appears, so its width has something to grow from.
  const [grown, setGrown] = useState(false);
  const present = unlocked || phase !== "open";

  useEffect(() => {
    if (phase === "locked") {
      const timer = setTimeout(() => setPhase("leaving"), LOCKED_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "leaving") {
      const timer = setTimeout(() => setPhase("open"), LEAVE_MS);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(present));
    return () => cancelAnimationFrame(frame);
  }, [present]);

  if (!present) return null;
  const closed = phase === "locked" || phase === "leaving";
  const idle = phase === "open";
  // At rest it says "Unlocked"; pointing at it (or reaching it with the keyboard) previews the
  // action: the lock closes and "Lock" slides in. After the click, "Locked" takes over.
  // Written out in full, so Tailwind finds every class.
  const unlockedLabel = idle
    ? "group-hover:-translate-y-full group-hover:opacity-0 group-focus-visible:-translate-y-full group-focus-visible:opacity-0"
    : "-translate-y-full opacity-0";
  const lockLabel = closed
    ? "-translate-y-full opacity-0"
    : idle
      ? "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
      : "";
  const openIcon = idle
    ? "group-hover:scale-75 group-hover:opacity-0 group-focus-visible:scale-75 group-focus-visible:opacity-0"
    : "scale-75 opacity-0";
  const lockIcon = idle
    ? "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
    : "";
  const expanded = grown && phase !== "leaving";

  const lock = async () => {
    setPhase("locking");
    try {
      await lockPrivate();
      setPhase("locked");
    } catch {
      setPhase("open");
    }
  };

  return (
    // The negative margin and inner padding carry the top bar's gap, so it folds away too.
    <div
      className={`-mr-2 grid ${
        expanded
          ? "grid-cols-[1fr] opacity-100 motion-safe:[transition:grid-template-columns_240ms_ease-out,opacity_160ms_ease-out_200ms]"
          : "grid-cols-[0fr] opacity-0 motion-safe:[transition:opacity_150ms_ease-out,grid-template-columns_240ms_ease-out_140ms]"
      }`}
    >
      <div className="min-w-0 overflow-hidden">
        <div className="pr-2">
          <Hint label={idle ? "Hide private images until the PIN or password is entered" : null}>
            <button
              type="button"
              onClick={() => void lock()}
              disabled={!idle}
              aria-label={closed ? "Locked" : "Private images are unlocked. Lock them"}
              className="group flex h-7 items-center gap-1.5 rounded-md border border-accent/50 bg-accent/10 px-2.5 text-[12.5px] font-medium whitespace-nowrap text-accent hover:border-accent disabled:hover:border-accent/50"
            >
              <span className="relative grid size-3.5 place-items-center" aria-hidden>
                <LockOpen className={`absolute size-3.5 ${fade} ${openIcon}`} />
                <Lock className={`absolute size-3.5 ${fade} ${lockIcon}`} />
              </span>
              <span className="grid overflow-hidden text-left" aria-hidden>
                <span className={`[grid-area:1/1] ${fade} ${unlockedLabel}`}>Unlocked</span>
                <span className={`[grid-area:1/1] ${fade} ${lockLabel}`}>Lock</span>
                <span className={`[grid-area:1/1] ${fade} ${closed ? "" : "translate-y-full opacity-0"}`}>Locked</span>
              </span>
            </button>
          </Hint>
        </div>
      </div>
    </div>
  );
}
