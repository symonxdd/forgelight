import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useEffect, useState } from "react";
import { useStopForge } from "../api/forgelight";

interface StopForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** How often to check whether Forge is gone, once it has agreed to stop. */
const CHECK_MS = 500;

/** Resolves once Forge no longer answers, which is the real sign that it has shut down. */
async function forgeAnswers(): Promise<boolean> {
  try {
    const response = await fetch("/forgelight/api/status", { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

const TEXT = {
  ask: {
    title: "Stop Forge?",
    body: "Forge shuts down and Forgelight stops working until Forge starts again. A generation in progress is canceled.",
  },
  stopping: {
    title: "Forge is shutting down…",
    body: "Finishing up. This takes a few seconds.",
  },
  stopped: {
    title: "Forge has shut down",
    body: "Start it again with the Forgelight desktop shortcut. This page reconnects by itself once Forge is back.",
  },
};

/** Asks once before shutting Forge down, then confirms when it really is down. */
export function StopForgeDialog({ open, onOpenChange }: StopForgeDialogProps) {
  const stop = useStopForge();
  const queryClient = useQueryClient();
  const [gone, setGone] = useState(false);
  const phase = gone ? "stopped" : stop.isSuccess ? "stopping" : "ask";

  // Once Forge has accepted, watch for it to stop answering.
  useEffect(() => {
    if (!stop.isSuccess || gone) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void forgeAnswers().then((answers) => {
        if (answers || cancelled) return;
        setGone(true);
        void queryClient.invalidateQueries({ queryKey: ["connection"] });
      });
    }, CHECK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [stop.isSuccess, gone, queryClient]);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (stop.isPending) return;
        if (!next) {
          stop.reset();
          setGone(false);
        }
        onOpenChange(next);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <AlertDialog.Content className="fixed top-[40%] left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <AlertDialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
            {phase === "stopping" && <LoaderCircle className="size-4 animate-spin text-muted" aria-hidden />}
            {phase === "stopped" && <CircleCheck className="size-4 text-good" aria-hidden />}
            {TEXT[phase].title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-[13.5px] leading-relaxed text-muted">
            {TEXT[phase].body}
          </AlertDialog.Description>
          {stop.error && <p className="text-[13px] text-bad">{stop.error.message}</p>}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel
              disabled={stop.isPending}
              className="h-8 rounded-md border border-line px-3.5 text-[13px] text-fg hover:bg-raised disabled:opacity-50"
            >
              {phase === "ask" ? "Cancel" : "Close"}
            </AlertDialog.Cancel>
            {phase === "ask" && (
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
