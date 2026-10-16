import { Check, ExternalLink, Settings } from "lucide-react";
import { Popover, RadioGroup } from "radix-ui";
import type { CSSProperties, ReactNode } from "react";
import { useOptions, useSetOptions } from "../api/queries";
import {
  LIVE_PREVIEW_CHOICES,
  currentLivePreview,
  livePreviewSettings,
  type LivePreviewChoice as LivePreviewChoiceId,
} from "../lib/livePreview";
import { FONTS, fontStack, parseFont } from "../lib/preferences";
import { usePreferences } from "../stores/preferences";
import { IconButton } from "./IconButton";

const itemClass =
  "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[14px] text-fg hover:bg-raised disabled:opacity-40 disabled:hover:bg-transparent data-[state=checked]:text-fg-strong";

function Choice({ value, children, style }: { value: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <RadioGroup.Item value={value} className={itemClass} style={style}>
      {children}
      <RadioGroup.Indicator>
        <Check className="size-3.5 text-accent" aria-hidden />
      </RadioGroup.Indicator>
    </RadioGroup.Item>
  );
}

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted">
      {children}
    </p>
  );
}

function LivePreviewChoice() {
  const options = useOptions();
  const setOptions = useSetOptions();
  const current = currentLivePreview(options.data?.live_previews_enable, options.data?.show_progress_every_n_steps);

  return (
    <>
      <Heading id="preview-label">Live preview</Heading>
      <RadioGroup.Root
        value={current ?? ""}
        onValueChange={(value) => setOptions.mutate(livePreviewSettings(value as LivePreviewChoiceId))}
        disabled={!options.data || setOptions.isPending}
        aria-labelledby="preview-label"
        aria-describedby="preview-note"
        className="flex flex-col"
      >
        {LIVE_PREVIEW_CHOICES.map(({ id, label }) => (
          <Choice key={id} value={id}>
            {label}
          </Choice>
        ))}
      </RadioGroup.Root>
      <p id="preview-note" className="px-2.5 pt-1 pb-1 text-[12px] leading-snug text-faint">
        This is Forge&apos;s own setting, so the classic page uses it too.
      </p>
    </>
  );
}

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
          <Heading id="font-label">Font</Heading>
          <RadioGroup.Root
            value={font}
            onValueChange={(value) => setFont(parseFont(value))}
            aria-labelledby="font-label"
            className="flex flex-col"
          >
            {FONTS.map(({ id, label }) => (
              <Choice key={id} value={id} style={{ fontFamily: fontStack(id) }}>
                {label}
              </Choice>
            ))}
          </RadioGroup.Root>

          <div className="my-1.5 h-px bg-line" />
          <LivePreviewChoice />
          <div className="my-1.5 h-px bg-line" />

          <a href="/" target="_blank" rel="noopener" className={itemClass}>
            Open classic Forge
            <ExternalLink className="size-3.5 text-muted" aria-hidden />
          </a>

          <p className="px-2.5 pt-2 pb-1 text-xs text-faint">Forgelight {__APP_VERSION__}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
