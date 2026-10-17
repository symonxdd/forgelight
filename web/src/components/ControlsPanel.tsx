import { useSettings } from "../stores/settings";
import { HiresSection } from "./controls/HiresSection";
import { SamplingSection } from "./controls/SamplingSection";
import { SizeSection } from "./controls/SizeSection";

/** The settings column beside the image: Size, Sampling and Hires fix. */
export function ControlsPanel() {
  const hidden = useSettings((s) => s.hiddenSections);
  return (
    <aside aria-label="Generation settings" className="flex h-full flex-col bg-canvas">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {!hidden.includes("size") && <SizeSection />}
        {!hidden.includes("sampling") && <SamplingSection />}
        {!hidden.includes("hires") && <HiresSection />}
      </div>
    </aside>
  );
}
