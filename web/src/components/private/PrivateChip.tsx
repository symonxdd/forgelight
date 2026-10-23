import { Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { setPrivateOn, usePrivateStatus } from "../../api/private";
import { HELP } from "../../lib/help";
import { useSession } from "../../stores/session";
import { Hint } from "../Hint";
import { PrivateSetupDialog } from "./PrivateSetupDialog";

/**
 * The Private switch beside the image count, explained in its tooltip. The first click sets
 * private mode up; after that it switches between private and public, for new images only:
 * the vault stays locked or unlocked as it is.
 */
export function PrivateChip() {
  const status = usePrivateStatus();
  const [setupOpen, setSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!status.data) return null;
  const on = status.data.on;

  const toggle = async () => {
    if (!status.data?.setUp) return setSetupOpen(true);
    setBusy(true);
    try {
      await setPrivateOn(!on);
    } catch (error) {
      useSession.getState().setNotice({
        tone: "warning",
        text: error instanceof Error ? error.message : "Private mode could not be switched.",
      });
    }
    setBusy(false);
  };

  return (
    <>
      <Hint
        side="top"
        label={
          <span className="flex flex-col gap-1 py-0.5">
            <span>
              {status.data.setUp ? (on ? "Turn off " : "Turn on ") : "Set up "}
              <strong className="font-semibold">private mode</strong>
            </span>
            <span>{HELP.privateMode}</span>
          </span>
        }
      >
        <button
          type="button"
          aria-pressed={on}
          disabled={busy}
          onClick={() => void toggle()}
          // The same weight and width either way, so switching never moves anything; only the colors fade.
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors duration-150 disabled:opacity-60 motion-reduce:transition-none ${
            on
              ? "border-accent/60 bg-accent/12 text-accent hover:border-accent"
              : "border-line text-muted hover:border-line-strong hover:text-fg-strong"
          }`}
        >
          {/* Both locks share one spot and cross-fade, the closed one while on. */}
          <span className="grid size-3.5" aria-hidden>
            <Lock
              className={`col-start-1 row-start-1 size-3.5 transition-opacity duration-150 motion-reduce:transition-none ${on ? "opacity-100" : "opacity-0"}`}
            />
            <LockOpen
              className={`col-start-1 row-start-1 size-3.5 transition-opacity duration-150 motion-reduce:transition-none ${on ? "opacity-0" : "opacity-100"}`}
            />
          </span>
          Private
        </button>
      </Hint>
      <PrivateSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
    </>
  );
}
