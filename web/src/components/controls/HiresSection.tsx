import { Expand } from "lucide-react";
import { useUpscalers } from "../../api/queries";
import { HELP, HELP_NOTES } from "../../lib/help";
import { hiresSize } from "../../lib/txt2img";
import { useSettings } from "../../stores/settings";
import { useStartImage } from "../../stores/startImage";
import { Toggle } from "../Toggle";
import { NumberSlider } from "./NumberSlider";
import { Section } from "./Section";
import { SelectField } from "./SelectField";

/** A plain estimate; actual times vary with the card, the checkpoint and the upscaler. */
function timeHint(scale: number): string {
  if (scale <= 1.5) return "Each image takes roughly 1.5 to 2 times as long.";
  if (scale <= 1.75) return "Each image takes roughly 2 to 3 times as long.";
  return "Each image takes 3 times as long or more, and very large sizes can run out of graphics memory.";
}

export function HiresSection() {
  const s = useSettings();
  const upscalers = useUpscalers();
  const target = hiresSize(s.width, s.height, s.hiresScale);
  const enabled = s.hiresEnabled;
  const hasStartImage = useStartImage((st) => st.image !== null);

  return (
    <Section
      title="Hires fix"
      icon={Expand}
      help={HELP.hiresFix}
      summary={hasStartImage ? "Not used" : enabled ? `${s.hiresScale}× · ${target.width} × ${target.height}` : "Off"}
      helpNote={HELP_NOTES.hiresFix}
      // The switch and the folding are independent: each does only its own thing.
      open={s.openSections.hires}
      onOpenChange={(open) => s.setSectionOpen("hires", open)}
      action={<Toggle checked={enabled} onChange={(hiresEnabled) => s.update({ hiresEnabled })} label="Hires fix" />}
    >
      {hasStartImage ? (
        <p className="text-[12.5px] leading-relaxed text-muted">
          Not used while a starting image is attached: image to image has no hires fix in Forge.
        </p>
      ) : (
        !enabled && (
          <p className="text-[12.5px] leading-relaxed text-muted">Off. These settings apply once it is switched on.</p>
        )
      )}
      <div className="flex flex-col gap-1.5">
        <NumberSlider
          label="Upscale by"
          help={HELP.hiresScale}
          value={s.hiresScale}
          min={1.25}
          max={2}
          inputMin={1.05}
          inputMax={4}
          step={0.05}
          onChange={(hiresScale) => s.update({ hiresScale })}
        />
        <p className="text-[12.5px] text-muted tabular-nums">
          {s.width} × {s.height} →{" "}
          <span className="text-fg">
            {target.width} × {target.height}
          </span>
        </p>
      </div>
      <SelectField
        label="Upscaler"
        help={HELP.hiresUpscaler}
        value={s.hiresUpscaler}
        options={upscalers.data ?? []}
        onChange={(hiresUpscaler) => s.update({ hiresUpscaler })}
      />
      <NumberSlider
        label="Detail"
        help={HELP.hiresDenoise}
        value={s.hiresDenoise}
        min={0.1}
        max={0.8}
        inputMin={0.01}
        inputMax={1}
        step={0.05}
        onChange={(hiresDenoise) => s.update({ hiresDenoise })}
      />
      <p className="text-[12.5px] leading-relaxed text-muted">{timeHint(s.hiresScale)}</p>
    </Section>
  );
}
