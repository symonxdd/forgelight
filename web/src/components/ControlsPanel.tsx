import { useSettings } from "../stores/settings";
import { LoraSection } from "./controls/LoraSection";
import { PromptFields } from "./controls/PromptFields";
import { SamplingSection } from "./controls/SamplingSection";
import { SectionPills } from "./controls/SectionPills";
import { SizeSection } from "./controls/SizeSection";

/**
 * The settings panel. Wide enough, its cards sit in two columns: the composer with
 * LoRAs beside it, then Size and Sampling. A card whose neighbor is hidden takes the
 * full width.
 */
export function ControlsPanel({ connected }: { connected: boolean }) {
  const hidden = useSettings((s) => s.hiddenSections);
  const showLoras = !hidden.includes("loras");
  const showSize = !hidden.includes("size");
  const showSampling = !hidden.includes("sampling");
  const wide = "@min-[40rem]:col-span-2";

  return (
    <aside aria-label="Generation settings" className="flex h-full flex-col bg-canvas">
      <div className="@container min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-3">
          <SectionPills />
          <div className="grid grid-cols-1 items-start gap-3 @min-[40rem]:grid-cols-2">
            <div className={showLoras ? "" : wide}>
              <PromptFields connected={connected} />
            </div>
            {showLoras && <LoraSection />}
            {showSize && (
              <div className={showSampling ? "" : wide}>
                <SizeSection />
              </div>
            )}
            {showSampling && (
              <div className={showSize ? "" : wide}>
                <SamplingSection />
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
