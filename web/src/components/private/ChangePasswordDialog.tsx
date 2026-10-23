import { KeyRound, LoaderCircle } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { changePassword } from "../../api/private";
import { useSession } from "../../stores/session";
import { PasswordInput } from "./PasswordInput";

const MIN_PASSWORD = 8;

/** The current password, then the new one twice. Images are not encrypted again. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = repeat.length > 0 && repeat !== next;
  const ready = current.length > 0 && next.length >= MIN_PASSWORD && repeat === next;

  const close = () => {
    setCurrent("");
    setNext("");
    setRepeat("");
    setError(null);
    setBusy(false);
    onOpenChange(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      close();
      useSession.getState().setNotice({ tone: "info", text: "The password is changed." });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The password could not be changed.");
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <Dialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
            <KeyRound className="size-4 text-accent" aria-hidden />
            Change the password
          </Dialog.Title>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <Dialog.Description className="text-[13px] leading-relaxed text-muted">
              Private images don't need to be encrypted again, so this is instant.
            </Dialog.Description>
            <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
              Current password
              <PasswordInput
                id="password-current"
                autoComplete="current-password"
                autoFocus
                value={current}
                onChange={setCurrent}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
              New password
              <PasswordInput id="password-new" autoComplete="new-password" value={next} onChange={setNext} />
              <span className={`text-[12px] ${tooShort ? "text-bad" : "text-faint"}`}>
                At least {MIN_PASSWORD} characters
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
              Repeat new password
              <PasswordInput id="password-repeat" autoComplete="new-password" value={repeat} onChange={setRepeat} />
              {mismatch && <span className="text-[12px] text-bad">The passwords don't match yet</span>}
            </label>
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
                disabled={!ready || busy}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40"
              >
                {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                Change password
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
