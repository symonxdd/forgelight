import { Info } from "lucide-react";
import { Tooltip } from "radix-ui";
import { useTooltipOpen } from "./tooltipFocus";

interface InfoTipProps {
  /** What the tip explains, for screen readers: "About CFG scale". */
  topic: string;
  text: string;
  /** A side note in smaller, gray print under the text, such as where a name comes from. */
  note?: string;
  /** Right by default: most icons sit near the left edge, so the open space is to their right. */
  side?: "top" | "right" | "bottom" | "left";
}

/** A small info icon that explains a setting on hover or keyboard focus. */
export function InfoTip({ topic, text, note, side = "right" }: InfoTipProps) {
  const tip = useTooltipOpen();
  return (
    <Tooltip.Root {...tip.root}>
      <Tooltip.Trigger asChild {...tip.trigger}>
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
          {note && <span className="mt-2 block text-[11.5px] leading-relaxed text-muted">{note}</span>}
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
  note,
  id,
}: {
  htmlFor?: string;
  label: string;
  help: string;
  note?: string;
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
      <InfoTip topic={label} text={help} note={note} />
    </span>
  );
}
