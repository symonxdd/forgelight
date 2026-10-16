import { Info } from "lucide-react";
import { Tooltip } from "radix-ui";

interface InfoTipProps {
  /** What the tip explains, for screen readers: "About CFG scale". */
  topic: string;
  text: string;
  /** Right by default: most icons sit near the left edge, so the open space is to their right. */
  side?: "top" | "right" | "bottom" | "left";
}

/** A small info icon that explains a setting on hover or keyboard focus. */
export function InfoTip({ topic, text, side = "right" }: InfoTipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={`About ${topic}`}
          className="inline-grid size-4 shrink-0 place-items-center rounded-full text-faint hover:text-fg focus-visible:text-fg"
          onClick={(e) => e.preventDefault()}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-72 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-fg shadow-lg shadow-black/15"
        >
          {text}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** A field label with its info tip right next to it. */
export function LabelWithTip({
  htmlFor,
  label,
  help,
  id,
}: {
  htmlFor?: string;
  label: string;
  help: string;
  id?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} id={id} className="text-[13px] text-fg">
          {label}
        </label>
      ) : (
        <span id={id} className="text-[13px] text-fg">
          {label}
        </span>
      )}
      <InfoTip topic={label} text={help} />
    </span>
  );
}
