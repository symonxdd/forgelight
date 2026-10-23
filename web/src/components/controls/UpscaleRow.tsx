import { X } from "lucide-react";
import { useUpscalers } from "../../api/queries";
import { HELP } from "../../lib/help";
import { imageUpscalers, upscaleTarget, type UpscaleMethod } from "../../lib/upscale";
import { removeUpscale, useUpscale } from "../../stores/upscale";
import { Hint } from "../Hint";
import { InfoTip } from "../InfoTip";
import { NumberSlider } from "./NumberSlider";
import { SelectField } from "./SelectField";
import { SteadyLabel } from "../SteadyLabel";

const METHODS: { id: UpscaleMethod; label: string }[] = [
  { id: "enhance", label: "Enhance" },
  { id: "upscale", label: "Upscale only" },
];

/** The image attached for upscaling, with its method and settings, at the top of the prompt card. */
export function UpscaleRow() {
  const card = useUpscale();
  const upscalers = useUpscalers();
  const source = card.source;
  if (!source) return null;
  const enhance = card.method === "enhance";
  const scale = enhance ? card.enhanceScale : card.upscaleScale;
  const target = upscaleTarget(source, scale, card.method);

  return (
    <div className="flex items-start gap-3.5 rounded-lg border border-line bg-canvas p-2.5">
      <img
        src={source.url}
        alt="Image to upscale"
        className="size-16 shrink-0 rounded-md bg-raised object-cover ring-1 ring-line"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex h-5 items-center gap-2">
          <span className="text-[13px] font-medium text-fg-strong">Upscale</span>
          <span className="text-[12px] text-faint tabular-nums">
            {source.width} × {source.height} →{" "}
            <span className="text-fg">
              {target.width} × {target.height}
            </span>
          </span>
          <Hint label="Remove the image to upscale">
            <button
              type="button"
              onClick={removeUpscale}
              aria-label="Remove the image to upscale"
              className="ml-auto grid size-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </Hint>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Method"
            className="flex h-8 items-center rounded-md border border-line p-0.5"
          >
            {METHODS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={card.method === id}
                onClick={() => card.update({ method: id })}
                className={`h-full rounded-[5px] px-2.5 text-[12.5px] ${
                  card.method === id ? "bg-raised text-fg-strong" : "text-muted hover:text-fg-strong"
                }`}
              >
                <SteadyLabel text={label} bold={card.method === id} />
              </button>
            ))}
          </div>
          <InfoTip topic="Enhance and Upscale only" text={HELP.upscaleMethod} />
        </div>
        <div className="grid gap-x-5 gap-y-2.5 @xl:grid-cols-2">
          <NumberSlider
            label="Upscale by"
            help={HELP.upscaleBy}
            value={scale}
            min={enhance ? 1.25 : 1.5}
            max={enhance ? 2 : 4}
            inputMin={1.05}
            inputMax={4}
            step={enhance ? 0.05 : 0.5}
            onChange={(value) => card.update(enhance ? { enhanceScale: value } : { upscaleScale: value })}
          />
          <SelectField
            label="Upscaler"
            help={HELP.upscaleUpscaler}
            value={card.upscaler}
            options={imageUpscalers(upscalers.data ?? [])}
            onChange={(upscaler) => card.update({ upscaler })}
          />
          {enhance && (
            <NumberSlider
              label="Detail"
              help={HELP.enhanceDetail}
              value={card.strength}
              min={0.1}
              max={0.8}
              inputMin={0.01}
              inputMax={1}
              step={0.05}
              onChange={(strength) => card.update({ strength })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
