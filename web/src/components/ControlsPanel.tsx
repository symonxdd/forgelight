import { useSettings } from "../stores/settings";
import { HiresSection } from "./controls/HiresSection";
import { LoraSection } from "./controls/LoraSection";
import { PromptFields } from "./controls/PromptFields";
import { SamplingSection } from "./controls/SamplingSection";
import { SizeSection } from "./controls/SizeSection";

/**
 * The settings panel. Wide enough, it has two columns: the composer with LoRAs under
 * it, and Size above Sampling beside them. With Size and Sampling both hidden, the
 * composer takes the full width.
 */
export function ControlsPanel({ connected }: { connected: boolean }) {
  const hidden = useSettings((s) => s.hiddenSections);
  const showLoras = !hidden.includes("loras");
  const showSize = !hidden.includes("size");
  const showSampling = !hidden.includes("sampling");
  const showHires = !hidden.includes("hires");
  const twoColumns = showSize || showSampling || showHires;

  return (
    <aside aria-label="Generation settings" className="flex h-full flex-col bg-canvas">
      <div className="@container min-h-0 flex-1 overflow-y-auto p-3">
        <div className={`grid grid-cols-1 items-start gap-3 ${twoColumns ? "@min-[40rem]:grid-cols-2" : ""}`}>
          <div className="flex min-w-0 flex-col gap-3">
            <PromptFields connected={connected} />
            {showLoras && <LoraSection />}
          </div>
          {twoColumns && (
            <div className="flex min-w-0 flex-col gap-3">
              {showSize && <SizeSection />}
              {showSampling && <SamplingSection />}
              {showHires && <HiresSection />}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
