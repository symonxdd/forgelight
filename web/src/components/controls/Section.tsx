import { ChevronRight } from "lucide-react";
import { Collapsible } from "radix-ui";
import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  /** Shown next to the title while the section is folded, e.g. "832 × 1216". */
  summary?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Section({ title, summary, open, onOpenChange, children }: SectionProps) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange} className="border-t border-line">
      <Collapsible.Trigger className="group flex w-full items-center gap-2 px-5 py-3 text-left">
        <ChevronRight
          className="size-3.5 shrink-0 text-faint group-data-[state=open]:rotate-90 motion-safe:transition-transform"
          aria-hidden
        />
        <span className="text-[13px] font-medium text-fg-strong">{title}</span>
        {!open && summary && <span className="ml-auto truncate text-[12px] text-muted">{summary}</span>}
      </Collapsible.Trigger>
      <Collapsible.Content className="flex flex-col gap-4 px-5 pb-5">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
