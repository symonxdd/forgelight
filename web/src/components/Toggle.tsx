import { Switch } from "radix-ui";

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  labelledBy?: string;
  label?: string;
  disabled?: boolean;
}

/** An on/off switch. */
export function Toggle({ checked, onChange, labelledBy, label, disabled }: ToggleProps) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-labelledby={labelledBy}
      aria-label={label}
      className="relative h-5 w-9 shrink-0 rounded-full bg-line-strong transition-colors duration-200 ease-out data-[state=checked]:bg-accent disabled:opacity-40"
    >
      <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-out data-[state=checked]:translate-x-[18px]" />
    </Switch.Root>
  );
}
