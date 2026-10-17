import { LabelWithTip } from "../InfoTip";
import { SelectMenu } from "../SelectMenu";

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
      <SelectMenu
        value={value}
        options={items.map((option) => ({ value: option, label: option }))}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
        className="h-8 rounded-md border border-line bg-canvas px-2.5 text-[13px] text-fg-strong hover:border-line-strong disabled:opacity-50"
      />
    </div>
  );
}
