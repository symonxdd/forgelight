import { ChevronRight } from "lucide-react";
import { useUpdates } from "../../api/updates";
import { showsNotice } from "../../lib/updates";

/** The dot on the settings icon while a new version waits. */
export function UpdateDot() {
  const updates = useUpdates();
  if (!showsNotice(updates.data)) return null;
  return <span className="absolute top-1 right-1 size-2 rounded-full bg-accent ring-2 ring-canvas" aria-hidden />;
}

/** The settings menu's line about a new version. Opens the update dialog. */
export function UpdateNotice({ onOpen }: { onOpen: () => void }) {
  const updates = useUpdates();
  const latest = updates.data?.releases[0];
  if (!showsNotice(updates.data) || !latest) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group mb-1 flex h-9 items-center gap-2.5 rounded-md bg-raised px-2.5 text-left text-[13px] text-fg-strong"
    >
      <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden />
      Forgelight {latest.version} is available
      <ChevronRight className="ml-auto size-4 text-faint group-hover:text-fg-strong" aria-hidden />
    </button>
  );
}
