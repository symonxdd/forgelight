import { LoaderCircle, Lock, LockOpen } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useMoveImages, type PrivacyMove } from "../../api/library";
import { formatNumber } from "../../lib/region";
import { useSession } from "../../stores/session";

const TEXT = {
  private: {
    title: (n: string) => `Make ${n} private?`,
    body: (one: boolean) =>
      one
        ? "It is encrypted into the vault, and the original is deleted for good, without going to the Recycle Bin. From then on, only the PIN, the password or the recovery key can show it."
        : "They are encrypted into the vault, and the originals are deleted for good, without going to the Recycle Bin. From then on, only the PIN, the password or the recovery key can show them.",
    button: "Make private",
    done: (n: string) => `${n} private now.`,
  },
  public: {
    title: (n: string) => `Make ${n} public?`,
    body: (one: boolean) =>
      one
        ? "It is saved as a normal file in Forge's outputs folder again. Anyone using this computer can open it there."
        : "They are saved as normal files in Forge's outputs folder again. Anyone using this computer can open them there.",
    button: "Make public",
    done: (n: string) => `${n} public again.`,
  },
};

/** Asks once before moving images into the vault or back out of it. */
export function PrivacyDialog({
  move,
  onClose,
  onMoved,
}: {
  /** The images and the direction; the dialog is open while this is set. */
  move: PrivacyMove | null;
  onClose: () => void;
  onMoved: (ids: string[]) => void;
}) {
  const mutation = useMoveImages();
  const count = move?.ids.length ?? 0;
  const amount = count === 1 ? "1 image" : `${formatNumber(count)} images`;
  const text = TEXT[move?.to ?? "private"];
  const Icon = move?.to === "public" ? LockOpen : Lock;

  return (
    <AlertDialog.Root
      open={move !== null}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) {
          mutation.reset();
          onClose();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <AlertDialog.Content className="fixed top-[40%] left-1/2 z-50 flex w-[min(27rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <AlertDialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
            <Icon className="size-4 text-accent" aria-hidden />
            {text.title(amount)}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-[13.5px] leading-relaxed text-muted">
            {text.body(count === 1)}
          </AlertDialog.Description>
          {mutation.error && <p className="text-[13px] text-bad">{mutation.error.message}</p>}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel
              disabled={mutation.isPending}
              className="h-8 rounded-md border border-line px-3.5 text-[13px] text-fg hover:bg-raised disabled:opacity-50"
            >
              Cancel
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                if (!move) return;
                mutation.mutate(move, {
                  onSuccess: ({ moved, failed }) => {
                    mutation.reset();
                    onMoved(move.ids);
                    const n = moved === 1 ? "1 image is" : `${formatNumber(moved)} images are`;
                    useSession
                      .getState()
                      .setNotice(
                        failed > 0
                          ? { tone: "warning", text: `${text.done(n)} ${failed} could not be moved.` }
                          : { tone: "info", text: text.done(n) },
                      );
                  },
                });
              }}
              className="flex h-8 items-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-70"
            >
              {mutation.isPending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
              {text.button}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
