import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { SECTIONS, sectionsSummary } from "../lib/sections";
import { useSettings } from "../stores/settings";

/**
 * Shows or hides sections of the Generate screen, from one dropdown that sums up the
 * choice. The list stays open while sections are switched, so several change in one go.
 */
export function SectionsPicker({ labelledBy }: { labelledBy: string }) {
  const hidden = useSettings((s) => s.hiddenSections);
  const toggle = useSettings((s) => s.toggleSectionHidden);
  const loraCount = useSettings((s) => s.loras.length);

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-labelledby={labelledBy}
        className="flex h-8 w-36 min-w-0 shrink-0 items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 text-left text-[13px] text-fg-strong hover:border-line-strong"
      >
        <span className="truncate">{sectionsSummary(hidden)}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={12}
          className="relative z-50 min-w-44 rounded-lg border border-line bg-surface p-1 text-fg shadow-lg shadow-black/15"
        >
          {SECTIONS.map(({ id, label }) => (
            <DropdownMenu.CheckboxItem
              key={id}
              checked={!hidden.includes(id)}
              onCheckedChange={() => toggle(id)}
              // Keeps the list open, so several sections can be switched in one go.
              onSelect={(event) => event.preventDefault()}
              className="flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2.5 pl-2 text-[13px] text-muted outline-none data-[highlighted]:bg-raised data-[state=checked]:text-fg-strong"
            >
              <span className="grid size-3.5 place-items-center">
                <DropdownMenu.ItemIndicator>
                  <Check className="size-3.5 text-accent" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </span>
              {label}
              {id === "loras" && loraCount > 0 && (
                <span className="ml-auto pl-3 text-[12px] text-faint">{loraCount} active</span>
              )}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
