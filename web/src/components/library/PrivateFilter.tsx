import { Lock } from "lucide-react";
import { useState } from "react";
import { usePrivateStatus } from "../../api/private";
import { Hint } from "../Hint";
import { UnlockDialog } from "../private/UnlockDialog";

/** Shows only private images. While locked, it asks for the password first. */
export function PrivateFilter({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const status = usePrivateStatus();
  const [unlocking, setUnlocking] = useState(false);
  if (!status.data?.setUp) return null;
  const unlocked = status.data.unlocked;
  return (
    <>
      <Hint label={on ? "Show all images" : unlocked ? "Show only private images" : "Unlock to show private images"}>
        <button
          type="button"
          onClick={() => (on || unlocked ? onChange(!on) : setUnlocking(true))}
          aria-pressed={on}
          className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] ${
            on
              ? "border-line-strong bg-raised text-fg-strong"
              : "border-line text-muted hover:border-line-strong hover:text-fg-strong"
          }`}
        >
          <Lock className="size-3.5" aria-hidden />
          Private
        </button>
      </Hint>
      <UnlockDialog open={unlocking} onOpenChange={setUnlocking} onUnlocked={() => onChange(true)} />
    </>
  );
}

/** Above the grid while locked: how many private images are left out, and the way in. */
export function LockedLine({ count }: { count: number }) {
  const [unlocking, setUnlocking] = useState(false);
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b border-line px-4 py-2 text-[12.5px] text-muted">
      <Lock className="size-3.5 shrink-0" aria-hidden />
      <span>
        {count === 1 ? "1 private image is hidden." : `${count.toLocaleString("en-US")} private images are hidden.`}
      </span>
      <button
        type="button"
        onClick={() => setUnlocking(true)}
        className="h-7 rounded-md border border-line px-2.5 text-[12px] text-fg hover:border-line-strong hover:text-fg-strong"
      >
        Unlock
      </button>
      <UnlockDialog open={unlocking} onOpenChange={setUnlocking} />
    </div>
  );
}
