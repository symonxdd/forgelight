import { useSettings } from "../stores/settings";
import { HiresSection } from "./controls/HiresSection";
import { RecommendedSection } from "./controls/RecommendedSection";
import { SamplingSection } from "./controls/SamplingSection";
import { SizeSection } from "./controls/SizeSection";

/** The settings column beside the image: recommended settings, Size, Sampling and Hires fix. */
export function ControlsPanel() {
  const hidden = useSettings((s) => s.hiddenSections);
  return (
    <aside aria-label="Generation settings" className="flex h-full flex-col bg-canvas">
      {/* The gutter is always reserved, so a scrollbar appearing never narrows the cards. It
          takes the place of most of the right padding: 4px plus the 8px scrollbar match the left. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3 pr-1 pl-3 [scrollbar-gutter:stable]">
        {!hidden.includes("recommended") && <RecommendedSection />}
        {!hidden.includes("size") && <SizeSection />}
        {!hidden.includes("sampling") && <SamplingSection />}
        {!hidden.includes("hires") && <HiresSection />}
      </div>
    </aside>
  );
}
