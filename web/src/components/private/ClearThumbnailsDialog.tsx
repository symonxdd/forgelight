import { LoaderCircle } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useState } from "react";
import { clearThumbnails } from "../../api/private";
import { useSession } from "../../stores/session";

function megabytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024 ** 2)).toLocaleString("en-US")} MB`;
}

/** Asks once before deleting Windows' thumbnail cache, then says what was removed. */
export function ClearThumbnailsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  const clear = async () => {
    setBusy(true);
    const { setNotice } = useSession.getState();
    try {
      const { cleared, skipped, bytes } = await clearThumbnails();
      if (skipped > 0) {
        setNotice({
          tone: "warning",
          text: `Cleared ${megabytes(bytes)}, but ${skipped} file${skipped === 1 ? " was" : "s were"} in use. Close File Explorer windows and try again.`,
        });
      } else {
        setNotice({
          tone: "info",
          text:
            cleared > 0
              ? `Cleared ${megabytes(bytes)} of Windows thumbnails.`
              : "There were no Windows thumbnails to clear.",
        });
      }
    } catch (failure) {
      setNotice({
        tone: "warning",
        text: failure instanceof Error ? failure.message : "The thumbnails could not be cleared.",
      });
    }
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <AlertDialog.Content className="fixed top-[40%] left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <AlertDialog.Title className="text-[15px] font-semibold text-fg-strong">
            Clear Windows thumbnails?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-[13.5px] leading-relaxed text-muted">
            Removes the small previews Windows keeps of images opened in File Explorer, in every folder. Windows makes
            new ones as folders are opened again.
          </AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel
              disabled={busy}
              className="h-8 rounded-md border border-line px-3.5 text-[13px] text-fg hover:bg-raised disabled:opacity-50"
            >
              Cancel
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={busy}
              onClick={() => void clear()}
              className="flex h-8 items-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-70"
            >
              {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
              Clear
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
