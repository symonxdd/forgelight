import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";
import { useTooltipOpen } from "./tooltipFocus";

interface TermTipProps {
  children: ReactNode;
  text: string;
  /** A second paragraph in the secondary color, such as where the name comes from. */
  note?: string;
}

/**
 * A word in running text that explains itself: a dotted underline hints that it can be
 * pointed at, and both the word and its underline light up while it is.
 */
export function TermTip({ children, text, note }: TermTipProps) {
  const tip = useTooltipOpen();
  return (
    <Tooltip.Root {...tip.root}>
      <Tooltip.Trigger asChild {...tip.trigger}>
        <span
          tabIndex={0}
          className="cursor-help underline decoration-current/45 decoration-dotted underline-offset-[3px] outline-none hover:text-accent hover:decoration-accent focus-visible:text-accent focus-visible:decoration-accent"
        >
          {children}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-80 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-fg shadow-lg shadow-black/15"
        >
          {text}
          {note && <span className="mt-2 block text-muted">{note}</span>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
