import { ChevronDown, type LucideIcon } from "lucide-react";
import { Collapsible } from "radix-ui";
import type { ReactNode } from "react";
import { InfoTip } from "../InfoTip";

interface SectionProps {
  title: string;
  icon: LucideIcon;
  /** Shown next to the title while the section is folded, e.g. "832 × 1216". */
  summary?: string;
  /** Explanation shown in an info tooltip next to the title. */
  help?: string;
  /** A side note under the explanation, in smaller print. */
  helpNote?: string;
  /** A control at the right end of the header, such as an on/off switch. */
  action?: ReactNode;
  /** Drawn as a suggestion (a faint accent tint and outline) instead of a settings card. */
  suggestion?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * A card in the settings column. Only the arrow at the right folds it, so clicking the
 * title or reaching for a switch never opens or closes it by accident.
 */
export function Section({
  title,
  icon: Icon,
  summary,
  help,
  helpNote,
  action,
  suggestion = false,
  open,
  onOpenChange,
  children,
}: SectionProps) {
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={onOpenChange}
      className={`rounded-xl border ${suggestion ? "border-accent/25 bg-accent/6" : "border-line bg-surface"}`}
    >
      <div className="flex items-center gap-2 py-3 pr-2.5 pl-4">
        <Icon className={`size-4 shrink-0 ${suggestion ? "text-accent" : "text-muted"}`} aria-hidden />
        <h2 className="text-[13px] font-medium text-fg-strong">{title}</h2>
        {help && <InfoTip topic={title} text={help} note={helpNote} />}
        <div className="ml-auto flex min-w-0 items-center gap-2.5">
          {!open && summary && <span className="min-w-0 truncate text-[12px] text-muted">{summary}</span>}
          {action}
          {/* No Hint here: its tooltip trigger would replace the open state the arrow turns by. */}
          <Collapsible.Trigger
            aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
            className="group grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
          >
            <ChevronDown
              className="size-4 group-data-[state=open]:rotate-180 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)]"
              aria-hidden
            />
          </Collapsible.Trigger>
        </div>
      </div>
      <Collapsible.Content className="collapsible overflow-hidden">
        <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
