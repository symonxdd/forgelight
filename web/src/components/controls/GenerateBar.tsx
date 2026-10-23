import { Minus, Plus, SkipForward, Square } from "lucide-react";
import { Tooltip } from "radix-ui";
import { HELP } from "../../lib/help";
import { barFraction, barPulses, progressLabel } from "../../lib/progress";
import { generate, interrupt, skip } from "../../stores/generation";
import { useSession } from "../../stores/session";
import { useSettings } from "../../stores/settings";
import { useUpscale } from "../../stores/upscale";
import { CheckpointPicker } from "../CheckpointPicker";
import { usePrivateStatus } from "../../api/private";
import { PrivateChip } from "../private/PrivateChip";
import { ProgressText } from "../ProgressText";
import { AddImageButton } from "./StartImage";
import { Hint } from "../Hint";
import { useTooltipOpen } from "../tooltipFocus";

const MAX_BATCH = 8;

function BatchStepper() {
  const tip = useTooltipOpen();
  const batchCount = useSettings((s) => s.batchCount);
  const update = useSettings((s) => s.update);
  const button =
    "grid size-7 place-items-center rounded text-muted hover:bg-raised hover:text-fg-strong disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <Tooltip.Root {...tip.root}>
      <Tooltip.Trigger asChild {...tip.trigger}>
        <div
          role="group"
          aria-label="Number of images"
          className="flex h-9 items-center rounded-lg border border-line px-1"
        >
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
          {HELP.batchCount}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * The prompt card's bottom row, laid out like a chat composer: the checkpoint on the left,
 * the number of images and Generate on the right. While a job runs, its progress fills the
 * middle and Generate turns into Stop.
 */
export function GenerateBar({ connected }: { connected: boolean }) {
  const job = useSession((s) => s.job);
  // With an image attached for upscaling, the button says what it will do.
  const action = useUpscale((s) => (!s.source ? "Generate" : s.method === "enhance" ? "Enhance" : "Upscale"));
  const privateStatus = usePrivateStatus();

  if (job.status === "running") {
    return (
      <div className="flex items-center gap-2">
        <CheckpointPicker enabled={connected} />
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(barFraction(job) * 100)}
          aria-label="Generation progress"
          className="relative flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-lg bg-raised"
        >
          <div
            className={`absolute inset-y-0 left-0 bg-fg-strong/12 ${barPulses(job) ? "motion-safe:animate-pulse" : ""}`}
            style={{ width: `${barFraction(job) * 100}%` }}
          />
          <span className="relative truncate px-3.5 text-[13px] text-fg-strong tabular-nums">
            <ProgressText label={progressLabel(job)} />
          </span>
        </div>
        {job.batchCount > 1 && (
          <Hint label={"Skip this image (Alt+Enter)"}>
            <button
              type="button"
              onClick={() => void skip()}
              aria-label="Skip this image (Alt+Enter)"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted hover:bg-raised hover:text-fg-strong"
            >
              <SkipForward className="size-4" aria-hidden />
            </button>
          </Hint>
        )}
        <Hint label={"Stop (Esc)"}>
          <button
            type="button"
            onClick={() => void interrupt()}
            disabled={job.stopping}
            aria-label="Stop (Esc)"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-40"
          >
            <Square className="size-3.5 fill-current" aria-hidden />
          </button>
        </Hint>
      </div>
    );
  }

  const privateOn = privateStatus.data?.on ?? false;
  return (
    <div className="flex items-center gap-2">
      <AddImageButton />
      <CheckpointPicker enabled={connected} />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <PrivateChip />
        {/* Upscaling always makes one image. */}
        {action === "Generate" && <BatchStepper />}
        <button
          type="button"
          onClick={() => void generate()}
          disabled={!connected}
          // While private, a thin accent ring outside the button: a second hint that never changes its size.
          className={`flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[14px] font-medium text-on-primary ring-offset-2 ring-offset-surface transition-shadow duration-150 hover:bg-primary-hover disabled:opacity-40 motion-reduce:transition-none ${
            privateOn ? "ring-1 ring-accent" : "ring-0"
          }`}
        >
          {action}
          {privateOn && <span className="sr-only">, private</span>}
          <kbd className="font-sans text-[11px] font-normal opacity-60">Ctrl ↵</kbd>
        </button>
      </div>
    </div>
  );
}
