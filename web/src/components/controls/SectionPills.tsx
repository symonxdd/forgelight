import { Check, Eye } from "lucide-react";
import { useSettings, type SectionId } from "../../stores/settings";
import { Hint } from "../Hint";

const PILLS: { id: SectionId; label: string }[] = [
  { id: "loras", label: "LoRAs" },
  { id: "size", label: "Size" },
  { id: "sampling", label: "Sampling" },
];

/**
 * Shows or hides the panel's sections, as checkboxes so they don't read as tabs.
 * Hiding only declutters the panel: a hidden section's settings still apply, so the
 * LoRA pill keeps showing how many are active.
 */
export function SectionPills() {
  const hidden = useSettings((s) => s.hiddenSections);
  const toggle = useSettings((s) => s.toggleSectionHidden);
  const loraCount = useSettings((s) => s.loras.length);

  return (
    <div role="group" aria-labelledby="section-pills-label" className="flex flex-wrap items-center gap-1.5">
      <span id="section-pills-label" className="mr-1 flex items-center gap-1.5 text-[12.5px] text-faint">
        <Eye className="size-3.5" aria-hidden />
        Show
      </span>
      {PILLS.map(({ id, label }) => {
        const shown = !hidden.includes(id);
        const count = id === "loras" && loraCount > 0 ? loraCount : null;
        return (
          <Hint key={id} label={shown ? `Hide ${label}` : `Show ${label}`}>
            <button
              type="button"
              role="checkbox"
              aria-checked={shown}
              onClick={() => toggle(id)}
              className={`flex h-7 items-center gap-1.5 rounded-full border border-line pr-3 pl-2 text-[12.5px] hover:border-line-strong motion-safe:transition-colors motion-safe:duration-150 ${
                shown ? "text-fg" : "text-faint hover:text-muted"
              }`}
            >
              <span
                className={`grid size-3.5 place-items-center rounded-[4px] border ${
                  shown ? "border-accent bg-accent text-canvas" : "border-line-strong"
                }`}
                aria-hidden
              >
                {shown && <Check className="size-2.5" strokeWidth={3.5} />}
              </span>
              {label}
              {count !== null && (
                <span className="rounded-full bg-raised px-1.5 text-[11px] text-muted tabular-nums">{count}</span>
              )}
            </button>
          </Hint>
        );
      })}
    </div>
  );
}
