import { LoaderCircle } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useDeleteImages } from "../../api/library";

interface DeleteDialogProps {
  /** The images to delete; the dialog is open while this is set. */
  ids: string[] | null;
  onClose: () => void;
  onDeleted: (ids: string[]) => void;
}

/** Asks once before moving images to the Recycle Bin. */
export function DeleteDialog({ ids, onClose, onDeleted }: DeleteDialogProps) {
  const remove = useDeleteImages();
  const count = ids?.length ?? 0;
  const what = count === 1 ? "this image" : `these ${count.toLocaleString("en-US")} images`;

  return (
    <AlertDialog.Root
      open={ids !== null}
      onOpenChange={(open) => {
        if (!open && !remove.isPending) {
          remove.reset();
          onClose();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <AlertDialog.Title className="text-[15px] font-semibold text-fg-strong">
            Delete {count === 1 ? "1 image" : `${count.toLocaleString("en-US")} images`}?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-[13.5px] leading-relaxed text-muted">
            This removes {what} from Forge's output folder.{" "}
            {count === 1
              ? "It goes to the Windows Recycle Bin, so you can still restore it from there."
              : "They go to the Windows Recycle Bin, so you can still restore them from there."}
          </AlertDialog.Description>
          {remove.error && <p className="text-[13px] text-bad">{remove.error.message}</p>}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel
              disabled={remove.isPending}
              className="h-8 rounded-md border border-line px-3.5 text-[13px] text-fg hover:bg-raised disabled:opacity-50"
            >
              Cancel
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => {
                if (!ids) return;
                remove.mutate(ids, {
                  onSuccess: () => {
                    remove.reset();
                    onDeleted(ids);
                  },
                });
              }}
              className="flex h-8 items-center gap-2 rounded-md bg-bad px-3.5 text-[13px] font-medium text-canvas hover:brightness-110 disabled:opacity-70"
            >
              {remove.isPending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
              Delete
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
