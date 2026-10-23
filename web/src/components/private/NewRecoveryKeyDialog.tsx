import { LifeBuoy, LoaderCircle } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { newRecoveryKey } from "../../api/private";
import { RecoveryKeyBox } from "./RecoveryKeyBox";

const button =
  "flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40";

/**
 * Asks first, since the old key stops working, then shows the new key once. While it is on
 * screen, the dialog closes only with Done, so it isn't lost by a stray click.
 */
export function NewRecoveryKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCode(null);
    setSaved(false);
    setBusy(false);
    setError(null);
    onOpenChange(false);
  };

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      setCode(await newRecoveryKey());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "A new recovery key could not be made.");
    }
    setBusy(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(value) => (value ? onOpenChange(true) : code === null && close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content
          onEscapeKeyDown={(event) => code !== null && event.preventDefault()}
          onPointerDownOutside={(event) => code !== null && event.preventDefault()}
          className="fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]"
        >
          <Dialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
            <LifeBuoy className="size-4 text-accent" aria-hidden />
            {code === null ? "Make a new recovery key?" : "Save the new recovery key"}
          </Dialog.Title>
          <Dialog.Description className="text-[13px] leading-relaxed text-muted">
            {code === null
              ? "The old recovery key stops working. The new one is shown only once."
              : "If the password is ever forgotten, this key is the other way in. It is shown only now."}
          </Dialog.Description>
          {code !== null && <RecoveryKeyBox code={code} saved={saved} onSavedChange={setSaved} />}
          {error && <p className="text-[12.5px] text-bad">{error}</p>}
          <div className="flex justify-end gap-2">
            {code === null ? (
              <>
                <button
                  type="button"
                  onClick={close}
                  className="h-9 rounded-lg px-3 text-[13px] text-muted hover:bg-raised hover:text-fg-strong"
                >
                  Cancel
                </button>
                <button type="button" disabled={busy} onClick={() => void make()} className={button}>
                  {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                  Make a new key
                </button>
              </>
            ) : (
              <button type="button" disabled={!saved} onClick={close} className={button}>
                Done
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
