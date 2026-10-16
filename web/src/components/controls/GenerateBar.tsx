import { Minus, Plus, SkipForward, Square } from "lucide-react";
import { Tooltip } from "radix-ui";
import { HELP } from "../../lib/help";
import { progressLabel } from "../../lib/progress";
import { generate, interrupt, skip } from "../../stores/generation";
import { useSession } from "../../stores/session";
import { useSettings } from "../../stores/settings";

const MAX_BATCH = 8;

function BatchStepper() {
  const batchCount = useSettings((s) => s.batchCount);
  const update = useSettings((s) => s.update);
  const button =
    "grid size-7 place-items-center rounded text-muted hover:bg-raised hover:text-fg-strong disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div role="group" aria-label="Number of images" className="flex items-center rounded-md border border-line">
          <button
            type="button"
            className={button}
            aria-label="Fewer images"
            onClick={() => update({ batchCount: batchCount - 1 })}
            disabled={batchCount <= 1}
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <span className="w-7 text-center text-[13px] text-fg-strong tabular-nums" aria-live="polite">
            ×{batchCount}
          </span>
          <button
            type="button"
            className={button}
            aria-label="More images"
            onClick={() => update({ batchCount: batchCount + 1 })}
            disabled={batchCount >= MAX_BATCH}
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-64 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-fg shadow-lg shadow-black/15"
        >
          <span className="font-medium text-fg-strong">Images. </span>
          {HELP.batchCount}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function GenerateBar({ connected }: { connected: boolean }) {
  const job = useSession((s) => s.job);

  if (job.status === "running") {
    return (
      <div className="flex items-center gap-2 border-t border-line bg-canvas p-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(job.progress * 100)}
          aria-label="Generation progress"
          className="relative flex h-10 flex-1 items-center overflow-hidden rounded-lg bg-raised"
        >
          <div className="absolute inset-y-0 left-0 bg-fg-strong/12" style={{ width: `${job.progress * 100}%` }} />
          <span className="relative px-3.5 text-[13px] text-fg-strong tabular-nums">{progressLabel(job)}</span>
        </div>
        {job.batchCount > 1 && (
          <button
            type="button"
            onClick={() => void skip()}
            aria-label="Skip this image (Alt+Enter)"
            title="Skip this image (Alt+Enter)"
            className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:bg-raised hover:text-fg-strong"
          >
            <SkipForward className="size-4" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => void interrupt()}
          disabled={job.stopping}
          aria-label="Stop (Esc)"
          title="Stop (Esc)"
          className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:bg-raised hover:text-fg-strong disabled:opacity-40"
        >
          <Square className="size-3.5 fill-current" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-t border-line bg-canvas p-4">
      <button
        type="button"
        onClick={() => void generate()}
        disabled={!connected}
        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40"
      >
        Generate
        <kbd className="font-sans text-[11px] font-normal opacity-60">Ctrl ↵</kbd>
      </button>
      <BatchStepper />
    </div>
  );
}
