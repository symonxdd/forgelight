import { KeyRound, LoaderCircle } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { setPin } from "../../api/private";
import { useSession } from "../../stores/session";
import { pinReady } from "../../lib/pin";
import { ConfirmSecret } from "./ConfirmSecret";
import { useConfirmSecret } from "./useConfirmSecret";
import { PinFields } from "./PinFields";

/** Adds a PIN, or replaces the one there is. While private images are locked, a way in confirms it first. */
export function PinDialog({
  open,
  replacing,
  onOpenChange,
}: {
  open: boolean;
  replacing: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const confirm = useConfirmSecret();
  const [pin, setPinValue] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPinValue("");
    setRepeat("");
    confirm.reset();
    setError(null);
    setBusy(false);
    onOpenChange(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirm.ready || !pinReady(pin, repeat) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await setPin(pin, confirm.secret);
      close();
      useSession.getState().showNotice({ tone: "info", text: replacing ? "The PIN is changed." : "The PIN is set." });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The PIN could not be saved.");
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
            {replacing ? "Change the PIN" : "Add a PIN"}
          </Dialog.Title>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <Dialog.Description className="text-[13px] leading-relaxed text-muted">
              A quicker way to unlock private images on this computer. The password can still be used instead.
            </Dialog.Description>
            <ConfirmSecret state={confirm} autoFocus />
            <PinFields
              pin={pin}
              repeat={repeat}
              onPin={setPinValue}
              onRepeat={setRepeat}
              autoFocus={!confirm.needed}
              replacing={replacing}
            />
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
                disabled={!confirm.ready || !pinReady(pin, repeat) || busy}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40"
              >
                {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                {replacing ? "Change PIN" : "Add PIN"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
