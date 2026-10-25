import { ChevronRight, ExternalLink, Power, Settings, SlidersHorizontal } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { usePrivateStatus } from "../api/private";
import { useConnection } from "../api/queries";
import { HELP } from "../lib/help";
import { IconButton } from "./IconButton";
import { ChangePasswordDialog } from "./private/ChangePasswordDialog";
import { ClearThumbnailsDialog } from "./private/ClearThumbnailsDialog";
import { NewRecoveryKeyDialog } from "./private/NewRecoveryKeyDialog";
import { PinDialog } from "./private/PinDialog";
import { RemovePinDialog } from "./private/RemovePinDialog";
import { OledRow } from "./settings/AppearancePage";
import { Group, Row } from "./settings/parts";
import { SettingsWindow, type SettingsPageId } from "./settings/SettingsWindow";
import { useSettingsWindow } from "../stores/settingsWindow";
import { StopForgeDialog } from "./StopForgeDialog";
import { UpdateDialog } from "./updates/UpdateDialog";
import { UpdateDot, UpdateNotice } from "./updates/UpdateNotice";

/** Stop Forge, from the gear menu. Forge answers even without its API ("api-off"), and the stop works then too. */
function StopForgeRow({ onStop }: { onStop: () => void }) {
  const connection = useConnection();
  const forgeRunning = connection === "connected" || connection === "api-off";
  return (
    <Row id="stop-forge-label" label="Stop Forge" help={HELP.stopForge}>
      <button
        type="button"
        onClick={onStop}
        disabled={!forgeRunning}
        aria-describedby="stop-forge-label"
        className="flex h-8 w-28 items-center justify-center gap-2 rounded-md border border-line bg-surface text-[13px] text-fg enabled:hover:border-bad enabled:hover:text-bad disabled:text-faint"
      >
        <Power className="size-3.5" aria-hidden />
        {forgeRunning ? "Stop" : "Not running"}
      </button>
    </Row>
  );
}

/**
 * The gear: a short menu with the everyday things, and All settings for the settings window.
 * The dialogs both open live here, so they stay put while the menu or the window closes.
 */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const page = useSettingsWindow((s) => s.page);
  const setPage = useSettingsWindow((s) => s.setPage);
  const [stopOpen, setStopOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [removePinOpen, setRemovePinOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const privateStatus = usePrivateStatus();
  const openPage = (next: SettingsPageId) => {
    setOpen(false);
    setPage(next);
  };

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <IconButton label="Settings" tooltip={false} className="relative">
            <Settings className="size-4" aria-hidden />
            <UpdateDot />
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
            className="z-40 flex w-[19rem] flex-col gap-2 rounded-lg border border-line bg-surface p-2 text-fg shadow-lg shadow-black/15"
          >
            <button
              type="button"
              onClick={() => openPage("about")}
              aria-label="About Forgelight"
              className="group flex items-center gap-2.5 rounded-md px-1 pt-0.5 text-left"
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
            <UpdateNotice
              onOpen={() => {
                setOpen(false);
                setUpdateOpen(true);
              }}
            />
            <Group>
              <OledRow />
              <Row id="classic-forge-label" label="Classic Forge">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener"
                  aria-describedby="classic-forge-label"
                  className="flex h-8 w-28 items-center justify-center gap-2 rounded-md border border-line bg-surface text-[13px] text-fg hover:border-line-strong hover:text-fg-strong"
                >
                  Open
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </Row>
              <StopForgeRow
                onStop={() => {
                  setOpen(false);
                  setStopOpen(true);
                }}
              />
            </Group>
            <button
              type="button"
              onClick={() => openPage("appearance")}
              className="group flex h-9 items-center gap-2.5 rounded-md px-2 text-left text-[13.5px] text-fg hover:bg-raised hover:text-fg-strong"
            >
              <SlidersHorizontal className="size-4 text-muted group-hover:text-fg-strong" aria-hidden />
              All settings…
              <ChevronRight className="ml-auto size-4 text-faint group-hover:text-fg-strong" aria-hidden />
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <SettingsWindow
        page={page}
        onPage={setPage}
        onOpenUpdate={() => setUpdateOpen(true)}
        onPin={() => setPinOpen(true)}
        onRemovePin={() => setRemovePinOpen(true)}
        onPassword={() => setPasswordOpen(true)}
        onRecoveryKey={() => setRecoveryOpen(true)}
        onThumbnails={() => setThumbnailsOpen(true)}
      />
      <UpdateDialog open={updateOpen} onOpenChange={setUpdateOpen} />
      <StopForgeDialog open={stopOpen} onOpenChange={setStopOpen} />
      <PinDialog open={pinOpen} replacing={privateStatus.data?.pin ?? false} onOpenChange={setPinOpen} />
      <RemovePinDialog open={removePinOpen} onOpenChange={setRemovePinOpen} />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      <NewRecoveryKeyDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} />
      <ClearThumbnailsDialog open={thumbnailsOpen} onOpenChange={setThumbnailsOpen} />
    </>
  );
}
