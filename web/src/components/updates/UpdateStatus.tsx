import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useCheckUpdates, useUpdates } from "../../api/updates";
import { checkedAgo, pageOutdated } from "../../lib/updates";

const LINE = "flex min-h-8 items-center gap-2 text-[12.5px]";

/** The About dialog's update line: up to date, a newer version, or a failed check, with Check now. */
export function UpdateStatus({ onOpenUpdate }: { onOpenUpdate: () => void }) {
  const updates = useUpdates();
  const check = useCheckUpdates();
  const state = updates.data;
  if (!state) return null;

  if (state.kind === "developer") {
    return (
      <div className={`${LINE} text-muted`}>
        Developer copy · runs from the project folder
        {pageOutdated(state, __APP_VERSION__) && (
          <span className="text-bad">
            The open page was built from {__APP_VERSION__}; run npm run build for {state.installed}.
          </span>
        )}
      </div>
    );
  }

  const checking = state.checking || check.isPending;
  const latest = state.releases[0];
  const error = check.error?.message ?? state.error;

  return (
    <div className={LINE}>
      {checking ? (
        <span className="flex items-center gap-1.5 text-muted">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          Checking for updates…
        </span>
      ) : latest ? (
        <button
          type="button"
          onClick={onOpenUpdate}
          className="flex items-center gap-1.5 font-medium text-accent hover:underline"
        >
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          Version {latest.version} is available
        </button>
      ) : error ? (
        <span className="flex items-center gap-1.5 text-bad">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </span>
      ) : state.checkedAt ? (
        <span className="flex items-center gap-1.5 text-muted">
          <CircleCheck className="size-3.5 text-good" aria-hidden />
          Up to date · checked {checkedAgo(state.checkedAt, updates.dataUpdatedAt)}
        </span>
      ) : (
        <span className="text-muted">Not checked for updates yet.</span>
      )}
      {!checking && (
        <button
          type="button"
          onClick={() => check.mutate({})}
          className="ml-auto h-7 shrink-0 rounded-md border border-line px-2.5 text-[12px] text-fg hover:bg-raised"
        >
          Check now
        </button>
      )}
    </div>
  );
}
