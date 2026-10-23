import { Download, Folder, Info, LockKeyhole, Palette, Server, Sparkles, X, type LucideIcon } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect } from "react";
import { useUpdates } from "../../api/updates";
import { showsNotice } from "../../lib/updates";
import { useGuide } from "../../stores/guide";
import { AboutPage } from "../about/AboutPage";
import { AppearancePage } from "./AppearancePage";
import { FoldersPage } from "./FoldersPage";
import { ForgePage } from "./ForgePage";
import { GeneratingPage } from "./GeneratingPage";
import { PrivacyPage, type PrivacyActions } from "./PrivacyPage";
import { UpdatesPage } from "./UpdatesPage";

export type SettingsPageId = "appearance" | "generating" | "privacy" | "folders" | "forge" | "updates" | "about";

const PAGES: { id: SettingsPageId; label: string; icon: LucideIcon }[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "generating", label: "Generating", icon: Sparkles },
  { id: "privacy", label: "Privacy", icon: LockKeyhole },
  { id: "folders", label: "Folders", icon: Folder },
  { id: "forge", label: "Forge", icon: Server },
  { id: "updates", label: "Updates", icon: Download },
];
const ABOUT = { id: "about", label: "About", icon: Info } as const;

interface SettingsWindowProps extends PrivacyActions {
  /** The page shown, or null while the window is closed. */
  page: SettingsPageId | null;
  onPage: (page: SettingsPageId | null) => void;
  onOpenUpdate: () => void;
}

function NavItem({
  item,
  active,
  dot,
  onSelect,
}: {
  item: { id: SettingsPageId; label: string; icon: LucideIcon };
  active: boolean;
  dot?: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] ${
        active ? "bg-raised font-medium text-fg-strong" : "text-muted hover:bg-raised/60 hover:text-fg-strong"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {item.label}
      {dot && <span className="ml-auto size-2 rounded-full bg-accent" aria-label="Update available" />}
    </button>
  );
}

/** Every setting, one short page per topic with a sidebar, so nothing needs scrolling. */
export function SettingsWindow({ page, onPage, onOpenUpdate, ...privacy }: SettingsWindowProps) {
  const updateWaiting = showsNotice(useUpdates().data);
  const current = page ?? "appearance";
  // An info icon's "click for more" opens the guide's side panel, which this window would cover.
  useEffect(
    () =>
      useGuide.subscribe((state, previous) => {
        if (state.peek && state.peek !== previous.peek) onPage(null);
      }),
    [onPage],
  );

  return (
    <Dialog.Root open={page !== null} onOpenChange={(open) => !open && onPage(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          // Opening with focus on an info icon would pop its tooltip up uninvited.
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="fixed top-1/2 left-1/2 z-50 flex h-[min(36rem,calc(100vh-2rem))] w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]"
        >
          <nav aria-label="Settings pages" className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-line p-2">
            <Dialog.Title className="px-2.5 pt-2 pb-3 text-[15px] font-semibold tracking-tight text-fg-strong">
              Settings
            </Dialog.Title>
            {PAGES.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={current === item.id}
                dot={item.id === "updates" && updateWaiting}
                onSelect={() => onPage(item.id)}
              />
            ))}
            <div className="mx-2.5 my-2 h-px bg-line" />
            <NavItem item={ABOUT} active={current === "about"} onSelect={() => onPage("about")} />
          </nav>
          <div className="relative min-w-0 flex-1 overflow-y-auto px-6 py-5">
            <Dialog.Close
              aria-label="Close"
              className="absolute top-3 right-3 grid size-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
            {current === "appearance" && <AppearancePage />}
            {current === "generating" && <GeneratingPage />}
            {current === "privacy" && <PrivacyPage {...privacy} />}
            {current === "folders" && <FoldersPage />}
            {current === "forge" && <ForgePage />}
            {current === "updates" && <UpdatesPage onOpenUpdate={onOpenUpdate} />}
            {current === "about" && <AboutPage onOpenUpdate={onOpenUpdate} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
