import { KeyRound, LoaderCircle } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { removePin } from "../../api/private";
import { useSession } from "../../stores/session";
import { ConfirmSecret } from "./ConfirmSecret";
import { useConfirmSecret } from "./useConfirmSecret";

/** Asks before removing the PIN; while private images are locked, a way in confirms it. */
export function RemovePinDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const confirm = useConfirmSecret();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    confirm.reset();
    setError(null);
    setBusy(false);
    onOpenChange(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirm.ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await removePin(confirm.secret);
      close();
      useSession.getState().setNotice({ tone: "info", text: "The PIN is removed." });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The PIN could not be removed.");
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content className="fixed top-[40%] left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <Dialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
            <KeyRound className="size-4 text-accent" aria-hidden />
            Remove the PIN?
          </Dialog.Title>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <Dialog.Description className="text-[13px] leading-relaxed text-muted">
              Private images can then be unlocked with the password or the recovery key. A PIN can be added again later.
            </Dialog.Description>
            <ConfirmSecret state={confirm} autoFocus />
            {error && <p className="text-[12.5px] text-bad">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="h-9 rounded-lg px-3 text-[13px] text-muted hover:bg-raised hover:text-fg-strong"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!confirm.ready || busy}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40"
              >
                {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                Remove PIN
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
