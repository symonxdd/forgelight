import { ChevronRight } from "lucide-react";
import { Collapsible } from "radix-ui";
import type { ReactNode } from "react";
import { InfoTip } from "../InfoTip";

interface SectionProps {
  title: string;
  /** Shown next to the title while the section is folded, e.g. "832 × 1216". */
  summary?: string;
  /** Explanation shown in an info tooltip next to the title. */
  help?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Section({ title, summary, help, open, onOpenChange, children }: SectionProps) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange} className="rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 px-4 py-3">
        <Collapsible.Trigger className="group flex items-center gap-2 text-left">
          <ChevronRight
            className="size-3.5 shrink-0 text-faint group-data-[state=open]:rotate-90 motion-safe:transition-transform"
            aria-hidden
          />
          <span className="text-[13px] font-medium text-fg-strong">{title}</span>
        </Collapsible.Trigger>
        {help && <InfoTip topic={title} text={help} />}
        {!open && summary && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onOpenChange(true)}
            className="ml-auto min-w-0 truncate text-[12px] text-muted"
          >
            {summary}
          </button>
        )}
      </div>
      <Collapsible.Content className="flex flex-col gap-4 px-4 pb-4">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
