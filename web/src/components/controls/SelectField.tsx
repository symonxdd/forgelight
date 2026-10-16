import { Check, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import { LabelWithTip } from "../InfoTip";

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  help?: string;
}

export function SelectField({ label, value, options, onChange, disabled, help }: SelectFieldProps) {
  // Keep a value Forge doesn't list (e.g. from an older image) selectable rather than blank.
  const items = options.includes(value) || !value ? options : [value, ...options];
  return (
    <div className="flex flex-col gap-1.5">
      {help ? <LabelWithTip label={label} help={help} /> : <span className="text-[13px] text-fg">{label}</span>}
      <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
        <Select.Trigger
          aria-label={label}
          className="flex h-8 items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 text-left text-[13px] text-fg-strong hover:border-line-strong disabled:opacity-50"
        >
          <Select.Value placeholder="Choose…" />
          <Select.Icon>
            <ChevronDown className="size-3.5 text-muted" aria-hidden />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-surface p-1 text-fg shadow-lg shadow-black/10"
          >
            <Select.Viewport>
              {items.map((option) => (
                <Select.Item
                  key={option}
                  value={option}
                  className="flex cursor-default items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] outline-none data-[highlighted]:bg-raised data-[state=checked]:text-fg-strong"
                >
                  <Select.ItemText>{option}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check className="size-3.5 text-accent" aria-hidden />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
