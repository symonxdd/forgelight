import { CircleCheck, ExternalLink, LoaderCircle, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { useInstallUpdate, useSkipVersion, useUpdates, type ReleaseInfo } from "../../api/updates";
import { useSession } from "../../stores/session";
import { ReleaseNotes } from "./ReleaseNotes";

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BUTTON = "flex h-8 items-center gap-2 rounded-md px-3.5 text-[13px] disabled:opacity-50";

function Notes({ releases }: { releases: ReleaseInfo[] }) {
  const [only, ...more] = releases;
  if (only && more.length === 0) return <ReleaseNotes notes={only.notes} />;
  return (
    <div className="flex flex-col gap-4">
      {releases.map((release) => (
        <section key={release.version} className="flex flex-col gap-1.5">
          <h3 className="text-[13.5px] font-semibold text-fg-strong">
            {release.version}
            {release.date && <span className="ml-2 text-[12px] font-normal text-faint">{release.date}</span>}
          </h3>
          <ReleaseNotes notes={release.notes} />
        </section>
      ))}
    </div>
  );
}

/**
 * Shows what a new version brings and installs it, only when Update is clicked.
 * The releases are held from the moment the dialog opens, so the notes stay put
 * while the installed version changes underneath.
 */
export function UpdateDialog({ open, onOpenChange }: UpdateDialogProps) {
  const updates = useUpdates();
  const install = useInstallUpdate();
  const skip = useSkipVersion();
  const generating = useSession((s) => s.job.status === "running");
  const [held, setHeld] = useState<{ releases: ReleaseInfo[]; installed: string | null } | null>(null);

  const state = updates.data;
  const shown = held ?? (state ? { releases: state.releases, installed: state.installed } : null);
  if (open && !held && state && state.releases.length > 0) {
    setHeld({ releases: state.releases, installed: state.installed });
  }
  const latest = shown?.releases[0];
  const done = install.data;

  function close(next: boolean) {
    if (install.isPending) return;
    if (!next) {
      install.reset();
      setHeld(null);
    }
    onOpenChange(next);
  }

  if (!latest) return null;

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]"
        >
          {!install.isPending && (
            <Dialog.Close
              aria-label="Close"
              className="absolute top-3 right-3 grid size-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          )}

          {done ? (
            <>
              <Dialog.Title className="flex items-center gap-2 text-[15px] font-semibold text-fg-strong">
                <CircleCheck className="size-4 text-good" aria-hidden />
                Forgelight {done.version ?? latest.version} is installed
              </Dialog.Title>
              <p className="text-[13.5px] leading-relaxed text-muted">
                {done.restartNeeded
                  ? "This update also changed the part Forge loads when it starts. To finish, stop Forge in the gear menu and start it again with the desktop shortcut."
                  : "Reload the page to start using it. Forge keeps running; nothing else needs restarting."}
              </p>
              <div className="flex justify-end gap-2">
                <Dialog.Close className={`${BUTTON} border border-line text-fg hover:bg-raised`}>
                  {done.restartNeeded ? "Close" : "Later"}
                </Dialog.Close>
                {!done.restartNeeded && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className={`${BUTTON} bg-primary font-medium text-on-primary hover:bg-primary-hover`}
                  >
                    Reload
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-0.5 pr-8">
                <Dialog.Title className="text-[15px] font-semibold text-fg-strong">
                  Forgelight {latest.version}
                </Dialog.Title>
                <span className="text-[12px] text-muted tabular-nums">
                  Installed: {shown.installed ?? "unknown"}
                  {shown.releases.length > 1 && ` · ${shown.releases.length} newer versions`}
                </span>
              </div>

              <div className="-mx-1 min-h-0 overflow-y-auto px-1">
                <Notes releases={shown.releases} />
              </div>

              <p className="text-[12px] leading-relaxed text-faint">
                {state?.kind === "git"
                  ? "Updates with git, the same way Forge's Extensions tab does."
                  : "Downloads the release from GitHub and replaces Forgelight's files."}{" "}
                Favorites, preferences and the Civitai cache stay as they are.
              </p>

              {install.error && (
                <p className="text-[13px] text-bad">
                  {install.error.message}
                  {latest.url && (
                    <>
                      {" "}
                      <a
                        href={latest.url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 underline underline-offset-2"
                      >
                        Release page
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    </>
                  )}
                </p>
              )}
              {generating && !install.isPending && (
                <p className="text-[12.5px] text-muted">Update becomes available once the current image is done.</p>
              )}

              <div className="flex items-center gap-2">
                {state?.skipped !== latest.version && (
                  <button
                    type="button"
                    disabled={install.isPending || skip.isPending}
                    onClick={() => skip.mutate({ version: latest.version }, { onSuccess: () => close(false) })}
                    className="mr-auto h-8 rounded-md px-2 text-[13px] text-muted hover:text-fg-strong disabled:opacity-50"
                  >
                    Skip this version
                  </button>
                )}
                <Dialog.Close
                  disabled={install.isPending}
                  className={`${BUTTON} ml-auto border border-line text-fg hover:bg-raised`}
                >
                  Later
                </Dialog.Close>
                <button
                  type="button"
                  disabled={install.isPending || generating}
                  onClick={() => install.mutate(latest.version)}
                  className={`${BUTTON} bg-primary font-medium text-on-primary hover:bg-primary-hover`}
                >
                  {install.isPending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                  {install.isPending ? "Updating…" : "Update"}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
