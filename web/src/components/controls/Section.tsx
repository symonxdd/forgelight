import { ChevronRight, type LucideIcon } from "lucide-react";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Section({
  title,
  icon: Icon,
  summary,
  help,
  helpNote,
  action,
  open,
  onOpenChange,
  children,
}: SectionProps) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange} className="rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 px-4 py-3">
        <Collapsible.Trigger className="group flex items-center gap-2 text-left">
          <ChevronRight
            className="size-3.5 shrink-0 text-faint group-data-[state=open]:rotate-90 motion-safe:transition-transform motion-safe:duration-200"
            aria-hidden
          />
          <Icon className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="text-[13px] font-medium text-fg-strong">{title}</span>
        </Collapsible.Trigger>
        {help && <InfoTip topic={title} text={help} note={helpNote} />}
        <div className="ml-auto flex min-w-0 items-center gap-3">
          {!open && summary && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onOpenChange(true)}
              className="min-w-0 truncate text-[12px] text-muted"
            >
              {summary}
            </button>
          )}
          {action}
        </div>
      </div>
      <Collapsible.Content className="collapsible overflow-hidden">
        <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
