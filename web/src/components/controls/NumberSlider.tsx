import { Slider } from "radix-ui";
import { useId, useState, type KeyboardEvent } from "react";

interface NumberSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** The typed field may go beyond the slider's range, up to this. */
  inputMax?: number;
  onChange: (value: number) => void;
}

function decimals(step: number): number {
  return step >= 1 ? 0 : (String(step).split(".")[1]?.length ?? 0);
}

/** A slider for quick changes plus a number field for exact values. */
export function NumberSlider({ label, value, min, max, step, inputMax = max, onChange }: NumberSliderProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (text: string) => {
    setDraft(null);
    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n)) return;
    const rounded = Number((Math.round(n / step) * step).toFixed(decimals(step)));
    onChange(Math.min(inputMax, Math.max(min, rounded)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setDraft(null);
      event.currentTarget.blur();
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? step : -step;
      onChange(Math.min(inputMax, Math.max(min, Number((value + delta).toFixed(decimals(step))))));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] text-fg">
          {label}
        </label>
        <input
          id={id}
          inputMode="decimal"
          value={draft ?? value.toFixed(decimals(step))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-14 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-right text-[13px] text-fg-strong tabular-nums hover:border-line focus:border-line-strong focus:bg-surface focus:outline-none"
        />
      </div>
      <Slider.Root
        value={[Math.min(max, value)]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        aria-label={label}
        className="relative flex h-4 touch-none items-center select-none"
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-raised">
          <Slider.Range className="absolute h-full rounded-full bg-fg-strong/70" />
        </Slider.Track>
        <Slider.Thumb className="block size-3.5 rounded-full border border-line-strong bg-surface shadow-sm" />
      </Slider.Root>
    </div>
  );
}
