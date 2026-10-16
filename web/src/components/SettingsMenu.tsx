import { Check, ExternalLink, Settings } from "lucide-react";
import { Popover, RadioGroup } from "radix-ui";
import { FONTS, fontStack, parseFont } from "../lib/preferences";
import { usePreferences } from "../stores/preferences";
import { IconButton } from "./IconButton";

export function SettingsMenu() {
  const font = usePreferences((s) => s.font);
  const setFont = usePreferences((s) => s.setFont);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton label="Settings">
          <Settings className="size-4" aria-hidden />
        </IconButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-64 rounded-lg border border-line bg-surface p-1.5 text-fg shadow-lg shadow-black/10"
        >
          <p id="font-label" className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted">
            Font
          </p>
          <RadioGroup.Root
            value={font}
            onValueChange={(value) => setFont(parseFont(value))}
            aria-labelledby="font-label"
            className="flex flex-col"
          >
            {FONTS.map(({ id, label }) => (
              <RadioGroup.Item
                key={id}
                value={id}
                className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[14px] text-fg hover:bg-raised data-[state=checked]:text-fg-strong"
                style={{ fontFamily: fontStack(id) }}
              >
                {label}
                <RadioGroup.Indicator>
                  <Check className="size-3.5 text-accent" aria-hidden />
                </RadioGroup.Indicator>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>

          <div className="my-1.5 h-px bg-line" />

          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-[14px] text-fg hover:bg-raised"
          >
            Open classic Forge
            <ExternalLink className="size-3.5 text-muted" aria-hidden />
          </a>

          <p className="px-2.5 pt-2 pb-1 text-xs text-faint">Forgelight {__APP_VERSION__}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
