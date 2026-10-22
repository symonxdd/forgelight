import { LoaderCircle, LockOpen } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { unlockPrivate } from "../../api/private";
import { PasswordInput } from "./PasswordInput";

const primary =
  "flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40";

/** Asks for the password, or the recovery key instead, to show private images. */
export function UnlockDialog({
  open,
  onOpenChange,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: () => void;
}) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSecret("");
    setError(null);
    setBusy(false);
    setUseRecovery(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!secret || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlockPrivate(useRecovery ? { recovery: secret } : { password: secret });
      reset();
      onOpenChange(false);
      onUnlocked?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Private images could not be unlocked.");
      setBusy(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <Dialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
            <LockOpen className="size-4 text-accent" aria-hidden />
            Unlock private images
          </Dialog.Title>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <Dialog.Description className="text-[13px] leading-relaxed text-muted">
              {useRecovery
                ? "Enter the recovery key saved when private mode was set up."
                : "Enter the private mode password. They stay unlocked until Lock is clicked or Forge stops."}
            </Dialog.Description>
            <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
              {useRecovery ? "Recovery key" : "Password"}
              {useRecovery ? (
                <input
                  id="unlock-recovery"
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="ABCD-EFGH-…"
                  className="h-9 w-full rounded-md border border-line bg-canvas px-3 font-mono text-[13px] text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-accent/80 focus:outline-none"
                />
              ) : (
                <PasswordInput
                  id="unlock-password"
                  autoComplete="current-password"
                  autoFocus
                  value={secret}
                  onChange={setSecret}
                />
              )}
            </label>
            {error && <p className="text-[12.5px] text-bad">{error}</p>}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseRecovery((r) => !r);
                  setSecret("");
                  setError(null);
                }}
                className="text-[12.5px] text-muted hover:text-fg-strong"
              >
                {useRecovery ? "Use the password" : "Use the recovery key"}
              </button>
              <button type="submit" disabled={!secret || busy} className={primary}>
                {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                Unlock
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
