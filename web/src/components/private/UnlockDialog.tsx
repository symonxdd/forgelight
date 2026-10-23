import { LoaderCircle, LockOpen } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { unlockPrivate, usePrivateStatus } from "../../api/private";
import { pinDigits } from "../../lib/pin";
import { PasswordInput } from "./PasswordInput";

const primary =
  "flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40";

type Mode = "pin" | "password" | "recovery";

const LABELS: Record<Mode, string> = { pin: "PIN", password: "Password", recovery: "Recovery key" };
const SWITCH: Record<Mode, string> = {
  pin: "Use the PIN",
  password: "Use the password",
  recovery: "Use the recovery key",
};
const DESCRIPTIONS: Record<Mode, string> = {
  pin: "Enter the PIN. Private images stay unlocked until Lock is clicked or Forge stops.",
  password: "Enter the private mode password. Private images stay unlocked until Lock is clicked or Forge stops.",
  recovery: "Enter the recovery key saved when private mode was set up.",
};

/** Asks for the PIN (when there is one), the password or the recovery key, to show private images. */
export function UnlockDialog({
  open,
  onOpenChange,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: () => void;
}) {
  const status = usePrivateStatus();
  // The PIN is asked for first when there is one; the other ways stay one click away.
  const [chosen, setChosen] = useState<Mode | null>(null);
  const mode: Mode = chosen ?? (status.data?.pin ? "pin" : "password");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSecret("");
    setError(null);
    setBusy(false);
    setChosen(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!secret || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlockPrivate(
        mode === "pin" ? { pin: secret } : mode === "recovery" ? { recovery: secret } : { password: secret },
      );
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
        <Dialog.Content className="fixed top-[40%] left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <Dialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
            <LockOpen className="size-4 text-accent" aria-hidden />
            Unlock private images
          </Dialog.Title>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <Dialog.Description className="text-[13px] leading-relaxed text-muted">
              {DESCRIPTIONS[mode]}
            </Dialog.Description>
            <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
              {LABELS[mode]}
              {mode === "recovery" ? (
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
                  key={mode}
                  id={mode === "pin" ? "unlock-pin" : "unlock-password"}
                  autoComplete="current-password"
                  inputMode={mode === "pin" ? "numeric" : undefined}
                  autoFocus
                  value={secret}
                  onChange={(value) => setSecret(mode === "pin" ? pinDigits(value) : value)}
                />
              )}
            </label>
            {error && <p className="text-[12.5px] text-bad">{error}</p>}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {(["pin", "password", "recovery"] as const)
                  .filter((other) => other !== mode && (other !== "pin" || status.data?.pin))
                  .map((other) => (
                    <button
                      key={other}
                      type="button"
                      onClick={() => {
                        setChosen(other);
                        setSecret("");
                        setError(null);
                      }}
                      className="text-[12.5px] text-muted hover:text-fg-strong"
                    >
                      {SWITCH[other]}
                    </button>
                  ))}
              </div>
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
