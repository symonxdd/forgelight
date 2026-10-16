import { Moon, Sun } from "lucide-react";
import { ToggleGroup } from "radix-ui";
import { parseTheme } from "../lib/preferences";
import { usePreferences } from "../stores/preferences";

const OPTIONS = [
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "dark", label: "Dark theme", Icon: Moon },
] as const;

/** Exactly two choices. Until one is picked the theme follows Windows. */
export function ThemeSwitch() {
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);

  return (
    <ToggleGroup.Root
      type="single"
      value={theme}
      onValueChange={(value) => {
        const next = parseTheme(value);
        if (next) setTheme(next);
      }}
      aria-label="Theme"
      className="flex rounded-md border border-line p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroup.Item
          key={value}
          value={value}
          aria-label={label}
          title={label}
          className="grid size-7 place-items-center rounded-[5px] text-faint hover:text-fg data-[state=on]:bg-raised data-[state=on]:text-fg-strong"
        >
          <Icon className="size-3.5" aria-hidden />
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
