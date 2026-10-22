import { Box, ChevronDown, Layers } from "lucide-react";
import { useState } from "react";
import { useFoundModels, type FoundModel } from "../../api/newModels";
import { HELP, HELP_NOTES } from "../../lib/help";
import { displayName } from "../../lib/modelNames";
import { formatSize } from "../../lib/newModels";
import { hideModel } from "../../stores/newModels";
import { usePreferences } from "../../stores/preferences";
import { InfoTip } from "../InfoTip";
import { FoundMenu, MoveButton } from "./MoveControls";

function Row({ found, children }: { found: FoundModel; children: React.ReactNode }) {
  const { name } = displayName(found.stem, found.civitai);
  const Icon = found.kind === "checkpoint" ? Box : Layers;
  return (
    <li className="flex items-center gap-2.5 rounded-md py-1.5 pr-1.5 pl-2">
      <Icon className="size-4 shrink-0 text-faint" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] text-fg-strong">{name}</span>
        <span className="truncate text-[12px] text-muted">
          {found.placeLabel} · {formatSize(found.size)}
        </span>
      </span>
      {children}
    </li>
  );
}

/**
 * The top of the checkpoint or LoRA list: files of that kind in Downloads or on the
 * Desktop that Forge doesn't have yet, with Move to Forge. Files hidden from the card
 * fold away under "Hidden", where they can be shown again.
 */
export function FoundModelsList({ kind }: { kind: FoundModel["kind"] }) {
  const enabled = usePreferences((s) => s.findNewModels);
  const found = useFoundModels();
  const [showHidden, setShowHidden] = useState(false);
  const ofKind = (found.data ?? []).filter((f) => f.kind === kind);
  const offered = ofKind.filter((f) => !f.hidden);
  const hidden = ofKind.filter((f) => f.hidden);
  if (!enabled || ofKind.length === 0) return null;

  return (
    <div className="flex flex-col border-b border-line px-1.5 pb-1.5">
      <div className="flex items-center gap-1.5 px-2 pt-2.5 pb-1">
        <span className="text-[12px] font-medium text-muted">Found on this computer</span>
        <InfoTip
          topic="models found on this computer"
          text={HELP.foundModels}
          note={HELP_NOTES.foundModels}
          side="right"
        />
      </div>
      <ul className="flex flex-col">
        {offered.map((f) => (
          <Row key={f.id} found={f}>
            <MoveButton found={f} />
            <FoundMenu found={f} />
          </Row>
        ))}
      </ul>
      {hidden.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowHidden((s) => !s)}
            aria-expanded={showHidden}
            className="flex h-7 items-center gap-1 self-start rounded-md px-2 text-[12px] text-muted hover:text-fg-strong"
          >
            Hidden ({hidden.length})
            <ChevronDown className={`size-3.5 ${showHidden ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showHidden && (
            <ul className="flex flex-col">
              {hidden.map((f) => (
                <Row key={f.id} found={f}>
                  <button
                    type="button"
                    onClick={() => void hideModel(f, false)}
                    className="h-7 shrink-0 rounded-md border border-line px-2.5 text-[12px] text-fg hover:border-line-strong hover:text-fg-strong"
                  >
                    Show again
                  </button>
                </Row>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
