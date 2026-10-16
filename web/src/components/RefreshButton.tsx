import { RefreshCw } from "lucide-react";
import { Hint } from "./Hint";

/** A small reload icon button that spins while the reload runs. */
export function RefreshButton({
  label,
  busy,
  onClick,
  className = "",
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Hint label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={label}
        className={`grid shrink-0 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong disabled:hover:bg-transparent ${className}`}
      >
        <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
      </button>
    </Hint>
  );
}
