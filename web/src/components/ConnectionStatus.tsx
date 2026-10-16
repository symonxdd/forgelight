import type { ConnectionState } from "../api/queries";

const STATES: Record<ConnectionState, { label: string; dot: string }> = {
  connecting: { label: "Connecting…", dot: "bg-faint" },
  connected: { label: "Forge connected", dot: "bg-good" },
  "api-off": { label: "Forge API is off", dot: "bg-bad" },
  offline: { label: "Forge not running", dot: "bg-bad" },
};

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const { label, dot } = STATES[state];
  return (
    <div role="status" className="mr-1 flex items-center gap-2 text-[13px] text-muted">
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </div>
  );
}
