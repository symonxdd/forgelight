import { usePrivateStatus } from "../../api/private";
import { pinDigits } from "../../lib/pin";
import { PasswordInput } from "./PasswordInput";
import type { ConfirmState, SecretMode } from "./useConfirmSecret";

const LABELS: Record<SecretMode, string> = {
  pin: "Current PIN",
  password: "Current password",
  recovery: "Recovery key",
};
const SWITCH: Record<SecretMode, string> = {
  pin: "Use the PIN",
  password: "Use the password",
  recovery: "Use the recovery key",
};

/**
 * The field for useConfirmSecret, with links to the other ways in, on a tinted panel of its
 * own so it never blends in with fields for something new. Renders nothing while unlocked.
 */
export function ConfirmSecret({ state, autoFocus = false }: { state: ConfirmState; autoFocus?: boolean }) {
  const hasPin = usePrivateStatus().data?.pin ?? false;
  if (!state.needed) return null;
  const { mode } = state;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-raised/60 p-3 text-[12.5px] text-fg">
      <label htmlFor={`confirm-${mode}`}>{LABELS[mode]}</label>
      {mode === "recovery" ? (
        <input
          id="confirm-recovery"
          autoFocus={autoFocus}
          spellCheck={false}
          autoComplete="off"
          value={state.text}
          onChange={(e) => state.setText(e.target.value)}
          placeholder="ABCD-EFGH-…"
          className="h-9 w-full rounded-md border border-line bg-canvas px-3 font-mono text-[13px] text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-accent/80 focus:outline-none"
        />
      ) : (
        <PasswordInput
          key={mode}
          id={`confirm-${mode}`}
          autoComplete="current-password"
          inputMode={mode === "pin" ? "numeric" : undefined}
          autoFocus={autoFocus}
          value={state.text}
          onChange={(value) => state.setText(mode === "pin" ? pinDigits(value) : value)}
        />
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(["pin", "password", "recovery"] as const)
          .filter((other) => other !== mode && (other !== "pin" || hasPin))
          .map((other) => (
            <button
              key={other}
              type="button"
              onClick={() => state.setMode(other)}
              className="text-[12px] text-muted hover:text-fg-strong"
            >
              {SWITCH[other]}
            </button>
          ))}
      </div>
    </div>
  );
}
