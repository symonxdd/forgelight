import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { HELP } from "../../lib/help";
import { SIZE_PRESETS, matchPreset, normalizeSize } from "../../lib/sizes";
import { useSettings } from "../../stores/settings";
import { Section } from "./Section";
import { Hint } from "../Hint";

/** A small rectangle in the preset's proportions. */
function RatioShape({ width, height }: { width: number; height: number }) {
  const scale = 18 / Math.max(width, height);
  return (
    <span
      className="rounded-[2px] border border-current"
      style={{ width: Math.round(width * scale), height: Math.round(height * scale) }}
      aria-hidden
    />
  );
}

function SizeInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = `size-${label.toLowerCase()}`;
  return (
    <div className="flex flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2.5 focus-within:border-line-strong">
      <label htmlFor={id} className="text-[12px] text-muted">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          setDraft(null);
          onChange(normalizeSize(Number(e.target.value)));
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-8 w-full bg-transparent text-right text-[13px] text-fg-strong tabular-nums focus:outline-none"
      />
    </div>
  );
}

export function SizeSection() {
  const width = useSettings((s) => s.width);
  const height = useSettings((s) => s.height);
  const open = useSettings((s) => s.openSections.size);
  const update = useSettings((s) => s.update);
  const setSectionOpen = useSettings((s) => s.setSectionOpen);
  const preset = matchPreset(width, height);

  return (
    <Section
      title="Size"
      help={HELP.size}
      summary={`${width} × ${height}${preset ? ` · ${preset.label}` : ""}`}
      open={open}
      onOpenChange={(o) => setSectionOpen("size", o)}
    >
      <div role="radiogroup" aria-label="Aspect ratio" className="grid grid-cols-4 gap-1.5">
        {SIZE_PRESETS.map((p) => {
          const active = p === preset;
          return (
            <Hint label={`${p.width} × ${p.height}`}>
              <button
                key={p.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ width: p.width, height: p.height })}
                className={`flex h-12 flex-col items-center justify-center gap-1 rounded-md border text-[11px] ${
                  active
                    ? "border-fg-strong/40 bg-raised text-fg-strong"
                    : "border-line text-muted hover:border-line-strong hover:text-fg"
                }`}
              >
                <span className="grid h-5 place-items-center">
                  <RatioShape width={p.width} height={p.height} />
                </span>
                {p.label}
              </button>
            </Hint>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <SizeInput label="W" value={width} onChange={(v) => update({ width: v })} />
        <Hint label={"Swap width and height"}>
          <button
            type="button"
            aria-label="Swap width and height"
            onClick={() => update({ width: height, height: width })}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg-strong"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden />
          </button>
        </Hint>
        <SizeInput label="H" value={height} onChange={(v) => update({ height: v })} />
      </div>
    </Section>
  );
}
