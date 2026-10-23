import { Info } from "lucide-react";
import { Tooltip } from "radix-ui";
import type { ReactElement } from "react";
import { guideTopicFor } from "../lib/guide/helpLinks";
import { useGuide } from "../stores/guide";
import { useTooltipOpen } from "./tooltipFocus";

interface InfoTipProps {
  /** What the tip explains, for screen readers: "About CFG scale". */
  topic: string;
  text: string;
  /** A side note in smaller, gray print under the text, such as where a name comes from. */
  note?: string;
  /** Right by default: most icons sit near the left edge, so the open space is to their right. */
  side?: "top" | "right" | "bottom" | "left";
  /** Words the text starts with, set in bold, such as the name of what it explains. */
  boldStart?: string;
}

/** The text, with its opening words in bold when it starts with `boldStart`. */
function withBoldStart(text: string, boldStart: string | undefined) {
  if (!boldStart || !text.startsWith(boldStart)) return text;
  return (
    <>
      <strong className="font-semibold text-fg-strong">{boldStart}</strong>
      {text.slice(boldStart.length)}
    </>
  );
}

/**
 * A small info icon that explains a setting on hover or keyboard focus. When the guide
 * covers the setting, clicking the icon opens that topic in the guide's side panel.
 */
export function InfoTip({ topic, text, note, side = "right", boldStart }: InfoTipProps) {
  const tip = useTooltipOpen();
  const openPeek = useGuide((s) => s.openPeek);
  const guide = guideTopicFor(text);
  return (
    <Tooltip.Root {...tip.root}>
      <Tooltip.Trigger asChild {...tip.trigger}>
        <button
          type="button"
          aria-label={guide ? `About ${topic}, click for more in the guide` : `About ${topic}`}
          className="inline-grid size-4 shrink-0 place-items-center rounded-full text-faint hover:text-fg focus-visible:text-fg"
          onClick={(e) => {
            // Inside a label, a click would otherwise focus or toggle the labeled control.
            e.preventDefault();
            if (guide) openPeek(guide);
          }}
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
          {withBoldStart(text, boldStart)}
          {note && <span className="mt-2 block text-[11.5px] leading-relaxed text-muted">{note}</span>}
          {guide && <span className="mt-2 block text-[11.5px] text-faint">Click for more</span>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * The info tip's card for a button that needs more than a short label: a bold title,
 * an explanation and an optional side note in smaller gray print.
 */
export function ExplainTip({
  title,
  text,
  note,
  side = "top",
  children,
}: {
  title: string;
  text: string;
  note?: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactElement;
}) {
  const tip = useTooltipOpen();
  return (
    <Tooltip.Root {...tip.root}>
      <Tooltip.Trigger asChild {...tip.trigger}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-72 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-fg shadow-lg shadow-black/15"
        >
          <span className="mb-1 block font-medium text-fg-strong">{title}</span>
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
