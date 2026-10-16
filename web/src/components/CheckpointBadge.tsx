import { Box } from "lucide-react";
import { checkpointLabel } from "../api/checkpoints";
import { useCurrentCheckpoint } from "../api/queries";

/** Shows the checkpoint Forge currently has selected. Switching arrives with the generate screen. */
export function CheckpointBadge({ enabled }: { enabled: boolean }) {
  const { checkpoint, setting, isLoading } = useCurrentCheckpoint(enabled);
  if (!enabled) return null;

  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-md border border-line px-2.5 py-1 text-[13px] text-fg"
      title={checkpoint?.title ?? setting ?? undefined}
    >
      <Box className="size-3.5 shrink-0 text-muted" aria-hidden />
      <span className="sr-only">Checkpoint: </span>
      <span className="truncate">{isLoading ? "Loading…" : checkpointLabel(checkpoint, setting)}</span>
    </div>
  );
}
