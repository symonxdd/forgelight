import { LoaderCircle, Lock } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { setPin, setPrivateOn, setUpPrivate, usePrivateStatus } from "../../api/private";
import { useSession } from "../../stores/session";
import { PasswordInput } from "./PasswordInput";
import { RecoveryKeyBox } from "./RecoveryKeyBox";
import { pinReady } from "../../lib/pin";
import { PinFields } from "./PinFields";

const MIN_PASSWORD = 8;

const primary =
  "flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40";

/** Step one: the password, typed twice. The vault is created when it is accepted. */
function PasswordStep({ onCreated, onCancel }: { onCreated: (code: string) => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = repeat.length > 0 && repeat !== password;
  const ready = password.length >= MIN_PASSWORD && repeat === password;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      onCreated(await setUpPrivate(password));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Private mode could not be set up.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <Dialog.Description asChild>
        <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted">
          <p>When private mode is on, new images will be encrypted before they are saved.</p>
          <p>To set up private mode, choose a password.</p>
        </div>
      </Dialog.Description>
      <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
        Password
        <PasswordInput
          id="private-password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={setPassword}
        />
        <span className={`text-[12px] ${tooShort ? "text-bad" : "text-faint"}`}>
          At least {MIN_PASSWORD} characters
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
        Repeat password
        <PasswordInput id="private-password-repeat" autoComplete="new-password" value={repeat} onChange={setRepeat} />
        {mismatch && <span className="text-[12px] text-bad">The passwords don't match yet</span>}
      </label>
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg px-3 text-[13px] text-muted hover:bg-raised hover:text-fg-strong"
        >
          Cancel
        </button>
        <button type="submit" disabled={!ready || busy} className={primary}>
          {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
          Next
        </button>
      </div>
    </form>
  );
}

/** Step two: the recovery code, shown this once, then private mode goes on. */
/** Turns private mode on at the end of setup; a failure is reported, setup still closes. */
async function turnOnPrivate(): Promise<void> {
  try {
    await setPrivateOn(true);
  } catch (failure) {
    useSession.getState().showNotice({
      tone: "warning",
      text: failure instanceof Error ? failure.message : "Private mode could not be turned on.",
    });
  }
}

/** Step three, when the computer has a security chip: an optional PIN, then private mode goes on. */
function PinStep({ onDone }: { onDone: () => void }) {
  const [pin, setPinValue] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (withPin: boolean) => {
    setBusy(true);
    setError(null);
    if (withPin) {
      try {
        await setPin(pin);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "The PIN could not be saved.");
        setBusy(false);
        return;
      }
    }
    await turnOnPrivate();
    onDone();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pinReady(pin, repeat) && !busy) void finish(true);
      }}
      className="flex flex-col gap-4"
    >
      <Dialog.Description className="text-[13px] leading-relaxed text-muted">
        A PIN is a quicker way to unlock private images on this computer. The password can still be used instead.
      </Dialog.Description>
      <PinFields pin={pin} repeat={repeat} onPin={setPinValue} onRepeat={setRepeat} autoFocus />
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void finish(false)}
          className="h-9 rounded-lg px-3 text-[13px] text-muted hover:bg-raised hover:text-fg-strong disabled:opacity-40"
        >
          Skip
        </button>
        <button type="submit" disabled={!pinReady(pin, repeat) || busy} className={primary}>
          {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
          <Lock className="size-3.5" aria-hidden />
          Add PIN and turn on
        </button>
      </div>
    </form>
  );
}

function RecoveryStep({ code, pinNext, onNext }: { code: string; pinNext: boolean; onNext: () => void }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const next = async () => {
    if (pinNext) return onNext();
    setBusy(true);
    await turnOnPrivate();
    onNext();
  };

  return (
    <div className="flex flex-col gap-4">
      <Dialog.Description className="text-[13px] leading-relaxed text-muted">
        If the password is ever forgotten, this recovery key is the only other way in. It is shown only now.
      </Dialog.Description>
      <RecoveryKeyBox code={code} saved={saved} onSavedChange={setSaved} />
      <div className="flex justify-end">
        <button type="button" disabled={!saved || busy} onClick={() => void next()} className={primary}>
          {!pinNext && <Lock className="size-3.5" aria-hidden />}
          {pinNext ? "Next" : "Turn on private mode"}
        </button>
      </div>
    </div>
  );
}

/**
 * The first time Private is switched on: a password, then the recovery key. While the key
 * is on screen the dialog can only be left with the button, so it isn't lost by a stray click.
 */
export function PrivateSetupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [pinStep, setPinStep] = useState(false);
  const pinAvailable = usePrivateStatus().data?.pinAvailable ?? false;
  const close = () => {
    setCode(null);
    setPinStep(false);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : code === null && close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content
          onEscapeKeyDown={(event) => code !== null && event.preventDefault()}
          onPointerDownOutside={(event) => code !== null && event.preventDefault()}
          className="fixed top-[40%] left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]"
        >
          <Dialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
            <Lock className="size-4 text-accent" aria-hidden />
            {code === null ? "Set up private mode" : pinStep ? "Add a PIN (optional)" : "Save the recovery key"}
          </Dialog.Title>
          {code === null ? (
            <PasswordStep onCreated={setCode} onCancel={close} />
          ) : pinStep ? (
            <PinStep onDone={close} />
          ) : (
            <RecoveryStep
              code={code}
              pinNext={pinAvailable}
              onNext={() => (pinAvailable ? setPinStep(true) : close())}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
