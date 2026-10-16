import type { ConnectionState } from "../api/queries";
import { Hint } from "./Hint";

const STATES: Record<ConnectionState, { label: string; dot: string; explain: string }> = {
  connecting: {
    label: "Connecting…",
    dot: "bg-faint",
    explain: "Looking for Forge, the program on this computer that makes the images.",
  },
  connected: {
    label: "Forge connected",
    dot: "bg-good",
    explain: "Forge is running on this computer and ready.",
  },
  "api-off": {
    label: "Forge API is off",
    dot: "bg-bad",
    explain:
      "Forge is running, but without the API that Forgelight talks to. Start Forge with the --api option, for example with the Forgelight desktop shortcut.",
  },
  offline: {
    label: "Forge not running",
    dot: "bg-bad",
    explain: "Forge isn't running. Start it, and Forgelight reconnects by itself.",
  },
};

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const { label, dot, explain } = STATES[state];
  return (
    <Hint label={explain}>
      <div
        role="status"
        tabIndex={0}
        className="mr-1 flex cursor-default items-center gap-2 rounded-md px-1 text-[13px] text-muted"
      >
        <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
        <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">{label}</span>
      </div>
    </Hint>
  );
}
