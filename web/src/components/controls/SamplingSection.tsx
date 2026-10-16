import { SlidersHorizontal } from "lucide-react";
import { useSamplers, useSchedulers } from "../../api/queries";
import { HELP } from "../../lib/help";
import { useSettings } from "../../stores/settings";
import { NumberSlider } from "./NumberSlider";
import { SeedField } from "./SeedField";
import { Section } from "./Section";
import { SelectField } from "./SelectField";

export function SamplingSection() {
  const s = useSettings();
  const samplers = useSamplers();
  const schedulers = useSchedulers();

  return (
    <Section
      title="Sampling"
      icon={SlidersHorizontal}
      summary={`${s.steps} steps · CFG ${s.cfgScale} · ${s.sampler}`}
      open={s.openSections.sampling}
      onOpenChange={(o) => s.setSectionOpen("sampling", o)}
    >
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Sampler"
          help={HELP.sampler}
          value={s.sampler}
          options={samplers.data ?? []}
          onChange={(sampler) => s.update({ sampler })}
        />
        <SelectField
          label="Schedule type"
          help={HELP.scheduleType}
          value={s.scheduler}
          options={schedulers.data ?? []}
          onChange={(scheduler) => s.update({ scheduler })}
        />
      </div>
      <NumberSlider
        label="Steps"
        help={HELP.steps}
        value={s.steps}
        min={1}
        max={60}
        inputMax={150}
        step={1}
        onChange={(steps) => s.update({ steps })}
      />
      <NumberSlider
        label="CFG scale"
        help={HELP.cfgScale}
        value={s.cfgScale}
        min={1}
        max={15}
        inputMax={30}
        step={0.5}
        onChange={(cfgScale) => s.update({ cfgScale })}
      />
      <SeedField />
    </Section>
  );
}
