import { useState } from "react";
import { usePrivateStatus, type PrivateSecret } from "../../api/private";

export type SecretMode = "pin" | "password" | "recovery";

export interface ConfirmState {
  /** Whether a secret is asked for at all: only while private images are locked. */
  needed: boolean;
  mode: SecretMode;
  setMode: (mode: SecretMode) => void;
  text: string;
  setText: (text: string) => void;
  /** Whatever the change request should send: the secret while locked, nothing while unlocked. */
  secret: PrivateSecret | undefined;
  ready: boolean;
  reset: () => void;
}

/**
 * The secret that confirms a PIN, password or recovery key change while private images are
 * locked. Checked for that change only, so private images stay locked afterwards.
 */
export function useConfirmSecret(prefer: SecretMode = "pin"): ConfirmState {
  const status = usePrivateStatus().data;
  const hasPin = status?.pin ?? false;
  const [chosen, setChosen] = useState<SecretMode | null>(null);
  const [text, setText] = useState("");
  const fallback = prefer === "pin" && !hasPin ? "password" : prefer;
  const mode = chosen && (chosen !== "pin" || hasPin) ? chosen : fallback;
  const needed = !(status?.unlocked ?? false);
  const secret: PrivateSecret | undefined = !needed
    ? undefined
    : mode === "pin"
      ? { pin: text }
      : mode === "recovery"
        ? { recovery: text }
        : { password: text };
  return {
    needed,
    mode,
    setMode: (next) => {
      setChosen(next);
      setText("");
    },
    text,
    setText,
    secret,
    ready: !needed || text.length > 0,
    reset: () => {
      setChosen(null);
      setText("");
    },
  };
}
