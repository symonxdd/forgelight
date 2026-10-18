import { LoaderCircle } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useStopForge } from "../api/forgelight";

interface StopForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Asks once before shutting Forge down, then says how to start it again. */
export function StopForgeDialog({ open, onOpenChange }: StopForgeDialogProps) {
  const stop = useStopForge();
  const stopped = stop.isSuccess;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (stop.isPending) return;
        if (!next) stop.reset();
        onOpenChange(next);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <AlertDialog.Title className="text-[15px] font-semibold text-fg-strong">
            {stopped ? "Forge is shutting down" : "Stop Forge?"}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-[13.5px] leading-relaxed text-muted">
            {stopped
              ? "Start it again with the Forgelight desktop shortcut. This page reconnects by itself once Forge is back."
              : "Forge shuts down and Forgelight stops working until Forge starts again. A generation in progress is canceled."}
          </AlertDialog.Description>
          {stop.error && <p className="text-[13px] text-bad">{stop.error.message}</p>}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel
              disabled={stop.isPending}
              className="h-8 rounded-md border border-line px-3.5 text-[13px] text-fg hover:bg-raised disabled:opacity-50"
            >
              {stopped ? "Close" : "Cancel"}
            </AlertDialog.Cancel>
            {!stopped && (
              <button
                type="button"
                disabled={stop.isPending}
                onClick={() => stop.mutate()}
                className="flex h-8 items-center gap-2 rounded-md bg-bad px-3.5 text-[13px] font-medium text-canvas hover:brightness-110 disabled:opacity-70"
              >
                {stop.isPending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                Stop Forge
              </button>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
