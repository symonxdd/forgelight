import { Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { setPrivateOn, usePrivateStatus } from "../../api/private";
import { HELP } from "../../lib/help";
import { useSession } from "../../stores/session";
import { Hint } from "../Hint";
import { PrivateSetupDialog } from "./PrivateSetupDialog";

/**
 * The Private switch beside the image count, explained in its tooltip. The first click sets
 * private mode up; after that it switches between private and public. Switching to public
 * also locks the vault.
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
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] disabled:opacity-60 ${
            on
              ? "border-accent/60 bg-accent/12 font-medium text-accent hover:border-accent"
              : "border-line text-muted hover:border-line-strong hover:text-fg-strong"
          }`}
        >
          {on ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
          Private
        </button>
      </Hint>
      <PrivateSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
    </>
  );
}
