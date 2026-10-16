import { Check, ExternalLink, LoaderCircle, Monitor, Settings, X } from "lucide-react";
import { Dialog, RadioGroup, Switch } from "radix-ui";
import type { CSSProperties, ReactNode } from "react";
import { useCreateDesktopShortcut, useSetOpenOnStart, useStartup } from "../api/forgelight";
import { useOptions, useSetOptions } from "../api/queries";
import { HELP } from "../lib/help";
import {
  LIVE_PREVIEW_CHOICES,
  currentLivePreview,
  livePreviewSettings,
  type LivePreviewChoice,
} from "../lib/livePreview";
import { FONTS, fontStack, parseFont } from "../lib/preferences";
import { usePreferences } from "../stores/preferences";
import { IconButton } from "./IconButton";
import { InfoTip } from "./InfoTip";

const choiceClass =
  "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[14px] text-fg hover:bg-raised disabled:opacity-40 disabled:hover:bg-transparent data-[state=checked]:bg-raised data-[state=checked]:text-fg-strong";

function Choice({ value, children, style }: { value: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <RadioGroup.Item value={value} className={choiceClass} style={style}>
      {children}
      <RadioGroup.Indicator>
        <Check className="size-3.5 text-accent" aria-hidden />
      </RadioGroup.Indicator>
    </RadioGroup.Item>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, help, children, id }: { label: string; help: string; children: ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5">
        <span id={id} className="text-[14px] text-fg">
          {label}
        </span>
        <InfoTip topic={label} text={help} side="right" />
      </span>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  labelledBy,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelledBy: string;
  disabled?: boolean;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-labelledby={labelledBy}
      className="relative h-5 w-9 shrink-0 rounded-full bg-line-strong data-[state=checked]:bg-accent disabled:opacity-40"
    >
      <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-surface shadow-sm data-[state=checked]:translate-x-[18px] motion-safe:transition-transform" />
    </Switch.Root>
  );
}

function AppearanceGroup() {
  const theme = usePreferences((s) => s.theme);
  const oled = usePreferences((s) => s.oled);
  const setOled = usePreferences((s) => s.setOled);
  const font = usePreferences((s) => s.font);
  const setFont = usePreferences((s) => s.setFont);

  return (
    <Group title="Appearance">
      {theme === "dark" && (
        <Row label="OLED black" help={HELP.oled} id="oled-label">
          <Toggle checked={oled === true} onChange={setOled} labelledBy="oled-label" />
        </Row>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5">
          <span id="font-label" className="text-[14px] text-fg">
            Font
          </span>
          <InfoTip topic="Font" text={HELP.font} side="right" />
        </span>
        <RadioGroup.Root
          value={font}
          onValueChange={(value) => setFont(parseFont(value))}
          aria-labelledby="font-label"
          className="grid grid-cols-2 gap-1"
        >
          {FONTS.map(({ id, label }) => (
            <Choice key={id} value={id} style={{ fontFamily: fontStack(id) }}>
              {label}
            </Choice>
          ))}
        </RadioGroup.Root>
      </div>
    </Group>
  );
}

function GenerationGroup() {
  const options = useOptions();
  const setOptions = useSetOptions();
  const current = currentLivePreview(options.data?.live_previews_enable, options.data?.show_progress_every_n_steps);

  return (
    <Group title="Generation">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5">
          <span id="preview-label" className="text-[14px] text-fg">
            Live preview
          </span>
          <InfoTip topic="Live preview" text={HELP.livePreview} side="right" />
        </span>
        <RadioGroup.Root
          value={current ?? ""}
          onValueChange={(value) => setOptions.mutate(livePreviewSettings(value as LivePreviewChoice))}
          disabled={!options.data || setOptions.isPending}
          aria-labelledby="preview-label"
          className="grid grid-cols-2 gap-1"
        >
          {LIVE_PREVIEW_CHOICES.map(({ id, label }) => (
            <Choice key={id} value={id}>
              {label}
            </Choice>
          ))}
        </RadioGroup.Root>
      </div>
    </Group>
  );
}

function StartupGroup() {
  const startup = useStartup();
  const setOpenOnStart = useSetOpenOnStart();
  const createShortcut = useCreateDesktopShortcut();
  const state = startup.data;
  const error = setOpenOnStart.error ?? createShortcut.error;

  return (
    <Group title="Startup">
      <Row label="Open Forgelight when Forge starts" help={HELP.openOnStart} id="open-on-start-label">
        <Toggle
          checked={state?.openOnStart ?? false}
          onChange={(enabled) => setOpenOnStart.mutate(enabled)}
          disabled={!state || setOpenOnStart.isPending}
          labelledBy="open-on-start-label"
        />
      </Row>
      <Row label="Desktop shortcut" help={HELP.desktopShortcut}>
        <button
          type="button"
          onClick={() => createShortcut.mutate()}
          disabled={!state || createShortcut.isPending}
          className="flex h-8 items-center gap-2 rounded-md border border-line px-3 text-[13px] text-fg hover:bg-raised disabled:opacity-50"
        >
          {createShortcut.isPending ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : state?.desktopShortcut ? (
            <Check className="size-3.5 text-good" aria-hidden />
          ) : (
            <Monitor className="size-3.5" aria-hidden />
          )}
          {state?.desktopShortcut ? "Created, recreate" : "Create shortcut"}
        </button>
      </Row>
      <p className="text-[12.5px] leading-relaxed text-faint">
        Creating the shortcut also switches on opening Forgelight when Forge starts.
      </p>
      {error && <p className="text-[12.5px] text-bad">{error.message}</p>}
    </Group>
  );
}

export function SettingsDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <IconButton label="Settings">
          <Settings className="size-4" aria-hidden />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-line bg-surface text-fg shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <Dialog.Title className="text-[15px] font-medium text-fg-strong">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close settings"
                className="grid size-8 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg-strong"
              >
                <X className="size-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Appearance, generation and startup settings.</Dialog.Description>
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pb-6">
            <AppearanceGroup />
            <GenerationGroup />
            <StartupGroup />
          </div>
          <div className="flex items-center justify-between border-t border-line px-6 py-3">
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1.5 text-[13px] text-muted hover:text-fg-strong"
            >
              Open classic Forge
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <span className="text-xs text-faint">Forgelight {__APP_VERSION__}</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
