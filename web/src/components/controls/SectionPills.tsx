import { Layers, Proportions, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useSettings, type SectionId } from "../../stores/settings";
import { Hint } from "../Hint";

const PILLS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "loras", label: "LoRAs", icon: Layers },
  { id: "size", label: "Size", icon: Proportions },
  { id: "sampling", label: "Sampling", icon: SlidersHorizontal },
];

/**
 * Shows or hides the panel's sections. Hiding only declutters the panel: a hidden
 * section's settings still apply, so the LoRA pill keeps showing how many are active.
 */
export function SectionPills() {
  const hidden = useSettings((s) => s.hiddenSections);
  const toggle = useSettings((s) => s.toggleSectionHidden);
  const loraCount = useSettings((s) => s.loras.length);

  return (
    <div role="group" aria-label="Show or hide sections" className="flex flex-wrap gap-1.5">
      {PILLS.map(({ id, label, icon: Icon }) => {
        const shown = !hidden.includes(id);
        const count = id === "loras" && loraCount > 0 ? loraCount : null;
        return (
          <Hint key={id} label={shown ? `Hide ${label}` : `Show ${label}`}>
            <button
              type="button"
              aria-pressed={shown}
              onClick={() => toggle(id)}
              className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12.5px] motion-safe:transition-colors motion-safe:duration-150 ${
                shown
                  ? "border-line-strong bg-raised text-fg-strong"
                  : "border-dashed border-line text-faint hover:border-line-strong hover:text-muted"
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
              {count !== null && (
                <span
                  className={`rounded-full px-1.5 text-[11px] tabular-nums ${shown ? "bg-surface text-muted" : "bg-raised text-fg"}`}
                >
                  {count}
                </span>
              )}
            </button>
          </Hint>
        );
      })}
    </div>
  );
}
