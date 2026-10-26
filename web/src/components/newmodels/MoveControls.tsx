import { LoaderCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { FoundModel } from "../../api/newModels";
import { moveExplanation } from "../../lib/newModels";
import { hideModel, startMove, useNewModels } from "../../stores/newModels";
import { Hint } from "../Hint";

/**
 * Move to Forge. Its tooltip says beforehand what the click does: the file leaves its
 * folder for Forge's. While an image is being made, the move waits for it.
 */
export function MoveButton({ found }: { found: FoundModel }) {
  const move = useNewModels((s) => s.moves[found.id]);
  const busy = move?.status === "moving" || move?.status === "waiting";
  return (
    <Hint label={moveExplanation(found)} side="top">
      <button
        type="button"
        disabled={busy}
        onClick={() => void startMove(found)}
        className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[12px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
      >
        {move?.status === "moving" && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
        {move?.status === "moving" ? "Moving…" : move?.status === "waiting" ? "After this image" : "Move to Forge"}
      </button>
    </Hint>
  );
}

/** The ⋯ menu of a found file: stop suggesting it. Undone from "Hidden" in the model lists. */
export function FoundMenu({ found }: { found: FoundModel }) {
  return (
    <DropdownMenu.Root modal={false}>
      <Hint label="More">
        <DropdownMenu.Trigger
          aria-label={`More for ${found.file}`}
          className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong aria-expanded:bg-raised"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenu.Trigger>
      </Hint>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={12}
          className="z-50 w-64 rounded-lg border border-line bg-surface p-1 text-fg shadow-lg shadow-black/15"
        >
          <DropdownMenu.Item
            onSelect={() => void hideModel(found, true)}
            className="flex cursor-default flex-col gap-0.5 rounded-md px-2.5 py-1.5 outline-none data-[highlighted]:bg-raised"
          >
            <span className="text-[13px] text-fg-strong">Don't suggest this file</span>
            <span className="text-[12px] leading-snug text-muted">
              It stays where it is. Shown again from Hidden in the {found.kind === "checkpoint" ? "checkpoint" : "LoRA"}{" "}
              list.
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
