import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { CSSProperties } from "react";

export interface MenuOption {
  value: string;
  label: string;
  style?: CSSProperties;
}

interface SelectMenuProps {
  value: string;
  options: readonly MenuOption[];
  onChange: (value: string) => void;
  /** Shown when the value matches none of the options. */
  placeholder?: string;
  disabled?: boolean;
  align?: "start" | "end";
  /** Size, border and colors of the button; layout classes are added here. */
  className: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Puts the chosen option in the middle of a long list, with keyboard focus on it. */
function revealChecked(content: HTMLDivElement | null) {
  if (!content) return;
  requestAnimationFrame(() => {
    const item = content.querySelector<HTMLElement>("[data-state='checked']");
    if (!item) return;
    content.scrollTop = item.offsetTop - content.clientHeight / 2 + item.offsetHeight / 2;
    item.focus({ preventScroll: true });
  });
}

/**
 * A dropdown for picking one value. Built on a non-modal menu rather than a select:
 * a select blocks the rest of the page while open, so moving from one dropdown to the
 * next took two clicks. Here a single click closes one and opens the other.
 */
export function SelectMenu({
  value,
  options,
  onChange,
  placeholder = "Choose…",
  disabled,
  align = "start",
  className,
  ...aria
}: SelectMenuProps) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={disabled}
        {...aria}
        style={current?.style}
        className={`flex min-w-0 items-center justify-between gap-2 text-left ${className}`}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          ref={revealChecked}
          align={align}
          sideOffset={4}
          collisionPadding={12}
          className="relative z-50 max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-lg border border-line bg-surface p-1 text-fg shadow-lg shadow-black/15"
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                style={option.style}
                className="flex cursor-default items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] outline-none data-[highlighted]:bg-raised data-[state=checked]:text-fg-strong"
              >
                {option.label}
                <DropdownMenu.ItemIndicator>
                  <Check className="size-3.5 text-accent" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
