import { Box, Check, ChevronDown, LoaderCircle } from "lucide-react";
import { Select } from "radix-ui";
import { checkpointLabel } from "../api/checkpoints";
import { useCheckpoints, useCurrentCheckpoint, useSetCheckpoint } from "../api/queries";
import { useSession } from "../stores/session";

/**
 * Chooses the checkpoint Forge uses, like the dropdown in the classic page.
 * Forge loads the new file at the next generation, which then takes longer.
 */
export function CheckpointPicker({ enabled }: { enabled: boolean }) {
  const checkpoints = useCheckpoints(enabled);
  const { checkpoint, setting, isLoading } = useCurrentCheckpoint(enabled);
  const setCheckpoint = useSetCheckpoint();
  const running = useSession((s) => s.job.status === "running");
  if (!enabled) return null;

  const label = setCheckpoint.isPending ? "Switching…" : isLoading ? "Loading…" : checkpointLabel(checkpoint, setting);

  return (
    <Select.Root
      value={checkpoint?.title ?? ""}
      onValueChange={(title) => setCheckpoint.mutate(title)}
      disabled={running || setCheckpoint.isPending}
    >
      <Select.Trigger
        aria-label="Checkpoint"
        title={running ? "Checkpoints can be changed once the current generation finishes" : undefined}
        className="flex max-w-[22rem] min-w-0 items-center gap-2 rounded-md border border-line px-2.5 py-1 text-[13px] text-fg hover:border-line-strong disabled:opacity-60 disabled:hover:border-line"
      >
        {setCheckpoint.isPending ? (
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted" aria-hidden />
        ) : (
          <Box className="size-3.5 shrink-0 text-muted" aria-hidden />
        )}
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          align="start"
          className="z-50 max-h-[min(28rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-surface p-1 text-fg shadow-lg shadow-black/10"
        >
          <Select.Viewport>
            {(checkpoints.data ?? []).map((c) => (
              <Select.Item
                key={c.title}
                value={c.title}
                className="flex cursor-default items-center justify-between gap-4 rounded-md px-2.5 py-1.5 text-[13px] outline-none data-[highlighted]:bg-raised data-[state=checked]:text-fg-strong"
              >
                <Select.ItemText>{c.model_name}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="size-3.5 text-accent" aria-hidden />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
