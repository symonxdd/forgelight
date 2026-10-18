import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { HELP, HELP_NOTES } from "../../lib/help";
import { useSettings } from "../../stores/settings";
import { attachStartImage, removeStartImage, useStartImage } from "../../stores/startImage";
import { Hint } from "../Hint";
import { ExplainTip } from "../InfoTip";
import { NumberSlider } from "./NumberSlider";

/** The attached starting image with its Strength, at the top of the prompt card. */
export function StartImageRow() {
  const image = useStartImage((s) => s.image);
  const strength = useSettings((s) => s.img2imgStrength);
  const update = useSettings((s) => s.update);
  if (!image) return null;

  return (
    <div className="flex items-start gap-3.5 rounded-lg border border-line bg-canvas p-2.5">
      <img
        src={image.url}
        alt="Starting image"
        className="size-16 shrink-0 rounded-md bg-raised object-cover ring-1 ring-line"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex h-5 items-center gap-2">
          <span className="text-[13px] font-medium text-fg-strong">Starting image</span>
          <span className="text-[12px] text-faint tabular-nums">
            {image.width} × {image.height}
          </span>
          <Hint label="Remove the starting image">
            <button
              type="button"
              onClick={removeStartImage}
              aria-label="Remove the starting image"
              className="ml-auto grid size-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </Hint>
        </div>
        <NumberSlider
          label="Strength"
          help={HELP.img2imgStrength}
          value={strength}
          min={0.05}
          max={1}
          step={0.05}
          onChange={(img2imgStrength) => update({ img2imgStrength })}
        />
      </div>
    </div>
  );
}

/** Opens the file picker for a starting image. Dropping or pasting an image works too. */
export function AddImageButton() {
  const input = useRef<HTMLInputElement>(null);
  const hasImage = useStartImage((s) => s.image !== null);
  const title = hasImage ? "Replace the starting image (img2img)" : "Add a starting image (img2img)";
  return (
    <>
      <ExplainTip title={title} text={HELP.addStartImage} note={HELP_NOTES.addStartImage}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-label={title}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted hover:border-line-strong hover:text-fg-strong"
        >
          <ImagePlus className="size-4" aria-hidden />
        </button>
      </ExplainTip>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Cleared, so picking the same file again still counts as a change.
          e.target.value = "";
          if (file) void attachStartImage(file);
        }}
      />
    </>
  );
}
