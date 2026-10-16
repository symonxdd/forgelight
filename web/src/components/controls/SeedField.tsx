import { Dices, Recycle } from "lucide-react";
import { useState } from "react";
import { HELP } from "../../lib/help";
import { selectedImage, useSession } from "../../stores/session";
import { useSettings } from "../../stores/settings";
import { LabelWithTip } from "../InfoTip";
import { Hint } from "../Hint";

const iconButton =
  "grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg-strong disabled:opacity-40 disabled:hover:bg-transparent";

/** -1 means "random", shown as an empty field with a placeholder. */
export function SeedField() {
  const seed = useSettings((s) => s.seed);
  const update = useSettings((s) => s.update);
  const shownImage = useSession(selectedImage);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (text: string) => {
    setDraft(null);
    const trimmed = text.trim();
    const n = Number(trimmed);
    update({ seed: trimmed === "" || !Number.isInteger(n) || n < 0 ? -1 : n });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <LabelWithTip htmlFor="seed" label="Seed" help={HELP.seed} />
      <div className="flex items-center gap-1">
        <input
          id="seed"
          inputMode="numeric"
          value={draft ?? (seed === -1 ? "" : String(seed))}
          placeholder="Random"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="h-8 min-w-0 flex-1 rounded-md border border-line bg-canvas px-2.5 text-[13px] text-fg-strong tabular-nums placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:outline-none"
        />
        <Hint label={"Random seed"}>
          <button
            type="button"
            className={iconButton}
            aria-label="Random seed"
            onClick={() => update({ seed: -1 })}
            disabled={seed === -1}
          >
            <Dices className="size-4" aria-hidden />
          </button>
        </Hint>
        <Hint label={"Use the shown image's seed"}>
          <button
            type="button"
            className={iconButton}
            aria-label="Use the shown image's seed"
            onClick={() => shownImage && update({ seed: shownImage.seed })}
            disabled={!shownImage || shownImage.seed < 0}
          >
            <Recycle className="size-4" aria-hidden />
          </button>
        </Hint>
      </div>
    </div>
  );
}
