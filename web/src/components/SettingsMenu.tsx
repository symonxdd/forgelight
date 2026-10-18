import { Check, ChevronRight, ExternalLink, LoaderCircle, Monitor, Power, Settings } from "lucide-react";
import { Popover } from "radix-ui";
import { useState, type ReactNode } from "react";
import { useCreateDesktopShortcut, useSetOpenOnStart, useStartup } from "../api/forgelight";
import { useConnection, useOptions, useSetOptions } from "../api/queries";
import { HELP } from "../lib/help";
import {
  LIVE_PREVIEW_CHOICES,
  currentLivePreview,
  livePreviewSettings,
  type LivePreviewChoice,
} from "../lib/livePreview";
import { CIVITAI_SITES, FONTS, fontStack, parseCivitaiSite, parseFont } from "../lib/preferences";
import { useCheckpointMemory } from "../stores/checkpointMemory";
import { usePreferences } from "../stores/preferences";
import { useSettings, type SectionId } from "../stores/settings";
import { AboutDialog } from "./about/AboutDialog";
import { Signature } from "./about/Signature";
import { IconButton } from "./IconButton";
import { InfoTip } from "./InfoTip";
import { SelectMenu, type MenuOption } from "./SelectMenu";
import { StopForgeDialog } from "./StopForgeDialog";
import { Toggle } from "./Toggle";

/** A compact dropdown for the settings menu. */
function Dropdown({
  value,
  options,
  onChange,
  labelledBy,
  disabled,
}: {
  value: string;
  options: readonly MenuOption[];
  onChange: (value: string) => void;
  labelledBy: string;
  disabled?: boolean;
}) {
  return (
    <SelectMenu
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      placeholder="Custom"
      align="end"
      aria-labelledby={labelledBy}
      className="h-8 w-36 shrink-0 rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg-strong hover:border-line-strong disabled:opacity-50"
    />
  );
}

function Heading({ children, help }: { children: string; help?: string }) {
  return (
    <h3 className="flex items-center gap-1.5 px-1 pt-1 text-[11px] font-medium tracking-wide text-faint uppercase">
      {children}
      {help && <InfoTip topic={children.toLowerCase()} text={help} side="left" />}
    </h3>
  );
}

function Row({
  id,
  label,
  help,
  note,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  /** Faint text after the label, e.g. "2 active". */
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 px-1">
      <span className="flex items-center gap-1.5">
        <span id={id} className="text-[13.5px] text-fg">
          {label}
        </span>
        {help && <InfoTip topic={label} text={help} side="left" />}
        {note && <span className="text-[12px] text-faint">{note}</span>}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-line" />;
}

function Appearance() {
  const theme = usePreferences((s) => s.theme);
  const oled = usePreferences((s) => s.oled);
  const setOled = usePreferences((s) => s.setOled);
  const font = usePreferences((s) => s.font);
  const setFont = usePreferences((s) => s.setFont);
  const fontOptions = FONTS.map(({ id, label }) => ({ value: id, label, style: { fontFamily: fontStack(id) } }));

  return (
    <>
      <Heading>Appearance</Heading>
      <Row id="font-label" label="Font" help={HELP.font}>
        <Dropdown value={font} options={fontOptions} onChange={(v) => setFont(parseFont(v))} labelledBy="font-label" />
      </Row>
      {theme === "dark" && (
        <Row id="oled-label" label="OLED black" help={HELP.oled}>
          <Toggle checked={oled === true} onChange={setOled} labelledBy="oled-label" />
        </Row>
      )}
    </>
  );
}

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "loras", label: "LoRAs" },
  { id: "size", label: "Size" },
  { id: "sampling", label: "Sampling" },
  { id: "hires", label: "Hires fix" },
];

/** Shows or hides sections of the Generate screen. The prompt is always shown. */
function PanelSections() {
  const hidden = useSettings((s) => s.hiddenSections);
  const toggle = useSettings((s) => s.toggleSectionHidden);
  const loraCount = useSettings((s) => s.loras.length);

  return (
    <>
      <Heading help={HELP.panelSections}>Sections</Heading>
      {SECTIONS.map(({ id, label }) => (
        <Row
          key={id}
          id={`section-${id}-label`}
          label={label}
          note={id === "loras" && loraCount > 0 ? `${loraCount} active` : undefined}
        >
          <Toggle checked={!hidden.includes(id)} onChange={() => toggle(id)} labelledBy={`section-${id}-label`} />
        </Row>
      ))}
    </>
  );
}

function Checkpoints() {
  const enabled = useCheckpointMemory((s) => s.enabled);
  const setEnabled = useCheckpointMemory((s) => s.setEnabled);
  return (
    <>
      <Heading>Checkpoints</Heading>
      <Row id="checkpoint-memory-label" label="Remember per checkpoint" help={HELP.checkpointMemory}>
        <Toggle checked={enabled} onChange={setEnabled} labelledBy="checkpoint-memory-label" />
      </Row>
    </>
  );
}

function LivePreview() {
  const options = useOptions();
  const setOptions = useSetOptions();
  const current = currentLivePreview(options.data?.live_previews_enable, options.data?.show_progress_every_n_steps);
  const choices = LIVE_PREVIEW_CHOICES.map(({ id, label }) => ({ value: id, label }));

  return (
    <>
      <Heading>Live preview</Heading>
      <Row id="preview-label" label="Updates" help={HELP.livePreview}>
        <Dropdown
          value={current ?? ""}
          options={choices}
          onChange={(v) => setOptions.mutate(livePreviewSettings(v as LivePreviewChoice))}
          labelledBy="preview-label"
          disabled={!options.data || setOptions.isPending}
        />
      </Row>
    </>
  );
}

function Civitai() {
  const site = usePreferences((s) => s.civitaiSite);
  const setSite = usePreferences((s) => s.setCivitaiSite);
  return (
    <>
      <Heading>Civitai</Heading>
      <Row id="civitai-site-label" label="Open links on" help={HELP.civitaiSite}>
        <Dropdown
          value={site}
          options={CIVITAI_SITES.map(({ id, label }) => ({ value: id, label }))}
          onChange={(v) => setSite(parseCivitaiSite(v))}
          labelledBy="civitai-site-label"
        />
      </Row>
    </>
  );
}

function Startup({ onStopForge }: { onStopForge: () => void }) {
  const startup = useStartup();
  const setOpenOnStart = useSetOpenOnStart();
  const createShortcut = useCreateDesktopShortcut();
  const state = startup.data;
  const error = setOpenOnStart.error ?? createShortcut.error;
  // Forge answers even without its API ("api-off"), and Forgelight's own stop works then too.
  const connection = useConnection();
  const forgeRunning = connection === "connected" || connection === "api-off";

  return (
    <>
      <Heading>Startup</Heading>
      <Row id="open-on-start-label" label="Open Forgelight on start" help={HELP.openOnStart}>
        <Toggle
          checked={state?.openOnStart ?? false}
          onChange={(enabled) => setOpenOnStart.mutate(enabled)}
          disabled={!state}
          labelledBy="open-on-start-label"
        />
      </Row>
      <Row id="shortcut-label" label="Desktop shortcut" help={HELP.desktopShortcut}>
        <button
          type="button"
          onClick={() => createShortcut.mutate()}
          disabled={!state || createShortcut.isPending}
          aria-describedby="shortcut-label"
          className="flex h-8 w-36 items-center justify-center gap-2 rounded-md border border-line text-[13px] text-fg hover:bg-raised disabled:opacity-50"
        >
          {createShortcut.isPending ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : state?.desktopShortcut ? (
            <Check className="size-3.5 text-good" aria-hidden />
          ) : (
            <Monitor className="size-3.5" aria-hidden />
          )}
          {state?.desktopShortcut ? "Recreate" : "Create"}
        </button>
      </Row>
      <Row id="stop-forge-label" label="Stop Forge" help={HELP.stopForge}>
        <button
          type="button"
          onClick={onStopForge}
          disabled={!forgeRunning}
          aria-describedby="stop-forge-label"
          className="flex h-8 w-36 items-center justify-center gap-2 rounded-md border border-line text-[13px] text-fg enabled:hover:border-bad enabled:hover:text-bad disabled:text-faint"
        >
          <Power className="size-3.5" aria-hidden />
          {forgeRunning ? "Stop" : "Not running"}
        </button>
      </Row>
      {error && <p className="px-1 text-[12.5px] text-bad">{error.message}</p>}
    </>
  );
}

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <IconButton label="Settings" tooltip={false}>
            <Settings className="size-4" aria-hidden />
          </IconButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            // Opening with focus on an info icon would pop its tooltip up uninvited.
            onOpenAutoFocus={(event) => event.preventDefault()}
            align="end"
            sideOffset={8}
            collisionPadding={12}
            aria-label="Settings"
            className="z-40 flex max-h-[var(--radix-popover-content-available-height)] w-80 flex-col overflow-y-auto rounded-lg border border-line bg-surface p-2 text-fg shadow-lg shadow-black/15"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAboutOpen(true);
              }}
              aria-label="About Forgelight"
              className="group flex items-center gap-2.5 rounded-md px-1 pt-0.5 pb-1.5 text-left"
            >
              <img
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt=""
                className="size-8 rounded-lg ring-1 ring-line"
              />
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold tracking-tight text-fg-strong">Forgelight</span>
                <span className="text-[11.5px] text-faint">Version {__APP_VERSION__} · About</span>
              </div>
              <ChevronRight className="ml-auto size-4 text-faint group-hover:text-fg-strong" aria-hidden />
            </button>
            <Divider />
            <Appearance />
            <Divider />
            <PanelSections />
            <Divider />
            <Checkpoints />
            <Divider />
            <LivePreview />
            <Divider />
            <Civitai />
            <Divider />
            <Startup
              onStopForge={() => {
                setOpen(false);
                setStopOpen(true);
              }}
            />
            <Divider />
            <div className="flex items-center px-1 py-1">
              <a
                href="/"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 text-[13px] text-muted hover:text-fg-strong"
              >
                Open classic Forge
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </div>
            <div className="pt-3 pb-1">
              <Signature />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <StopForgeDialog open={stopOpen} onOpenChange={setStopOpen} />
    </>
  );
}
