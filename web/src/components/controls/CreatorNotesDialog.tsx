import { ScrollText, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { noteLines, type NoteLine } from "../../lib/recommended";
import { CivitaiLink } from "../CivitaiLink";
import { Toggle } from "../Toggle";

function Tab({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={checked}
      onClick={onClick}
      className={`flex h-full items-center rounded-[5px] px-2.5 text-[13px] whitespace-nowrap ${
        checked ? "bg-raised font-medium text-fg-strong" : "text-muted hover:text-fg-strong"
      }`}
    >
      {children}
    </button>
  );
}

/** The lines of one part. Headings stand apart, settings lines carry an accent bar. */
function Lines({ lines }: { lines: NoteLine[] }) {
  return (
    <div className="flex flex-col gap-1 text-[13px] leading-normal">
      {lines.map((line, index) => (
        <p
          key={index}
          className={`border-l-2 pl-2.5 wrap-break-word ${line.settings ? "border-accent" : "border-transparent"} ${
            line.heading
              ? "mt-3 font-semibold text-fg-strong first:mt-0"
              : line.settings
                ? "text-fg-strong"
                : "text-fg/80"
          }`}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}

interface CreatorNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  version?: string;
  notes?: string;
  versionNotes?: string;
  url?: string;
}

/**
 * The creator's full description from Civitai: the model's, and the notes of the installed
 * version, on two tabs. Lines about settings are highlighted, and a switch shows only those.
 * Plain text: Civitai's formatting and images are left out.
 */
export function CreatorNotesDialog({
  open,
  onOpenChange,
  name,
  version,
  notes,
  versionNotes,
  url,
}: CreatorNotesDialogProps) {
  const [tab, setTab] = useState<"model" | "version">("model");
  const [onlySettings, setOnlySettings] = useState(false);
  const parts = { model: noteLines(notes), version: noteLines(versionNotes) };
  const bothParts = parts.model.length > 0 && parts.version.length > 0;
  // With only one part there are no tabs, and that part is shown.
  const shownTab = parts[tab].length > 0 ? tab : tab === "model" ? "version" : "model";
  const lines = parts[shownTab].filter((line) => !onlySettings || line.settings);
  const versionLabel = version ? `Version ${version}` : "This version";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex h-[min(40rem,calc(100vh-2rem))] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]">
          <div className="flex flex-col gap-3 border-b border-line px-5 pt-4 pb-3">
            <div className="flex items-center gap-2 pr-8">
              <ScrollText className="size-4 shrink-0 text-accent" aria-hidden />
              <Dialog.Title className="min-w-0 truncate text-[15px] font-semibold text-fg-strong">
                Creator's notes · {name}
              </Dialog.Title>
              {url && <CivitaiLink url={url} name={name} />}
            </div>
            <Dialog.Description className="sr-only">
              The description of {name} on Civitai, with the lines about settings highlighted.
            </Dialog.Description>
            <div className="flex items-center gap-3">
              {bothParts ? (
                <div
                  role="tablist"
                  aria-label="Part"
                  className="flex h-8 items-center gap-0.5 rounded-md border border-line bg-surface p-0.5"
                >
                  <Tab checked={shownTab === "model"} onClick={() => setTab("model")}>
                    About the model
                  </Tab>
                  <Tab checked={shownTab === "version"} onClick={() => setTab("version")}>
                    {versionLabel}
                  </Tab>
                </div>
              ) : (
                <span className="text-[13px] font-medium text-fg-strong">
                  {shownTab === "model" ? "About the model" : versionLabel}
                </span>
              )}
              <span className="ml-auto flex items-center gap-2 text-[12.5px] text-muted">
                <span id="notes-settings-only">Settings lines only</span>
                <Toggle checked={onlySettings} onChange={setOnlySettings} labelledBy="notes-settings-only" />
              </span>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="absolute top-3 right-3 grid size-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-5 py-4">
            {lines.length > 0 ? (
              <Lines lines={lines} />
            ) : (
              <p className="text-[13px] text-muted">No line here talks about settings.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
