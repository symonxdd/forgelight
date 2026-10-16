import { Check, Layers, Plus, Search, TriangleAlert, X } from "lucide-react";
import { Popover } from "radix-ui";
import { useMemo, useState } from "react";
import { useModels, useRefreshLoras, type ModelEntry } from "../../api/forgelight";
import { useCurrentCheckpoint } from "../../api/queries";
import { HELP } from "../../lib/help";
import { ARCH_LABEL, addTriggerWord, compatibility, hasTriggerWord, type Arch, type LoraSlot } from "../../lib/loras";
import { baseModelLabel, displayName } from "../../lib/modelNames";
import { useSettings } from "../../stores/settings";
import { CivitaiLink } from "../CivitaiLink";
import { Hint } from "../Hint";
import { InfoTip } from "../InfoTip";
import { RefreshButton } from "../RefreshButton";
import { NumberSlider } from "./NumberSlider";
import { Section } from "./Section";

function findEntry(loras: readonly ModelEntry[], name: string): ModelEntry | undefined {
  return loras.find((m) => m.stem.toLowerCase() === name.toLowerCase());
}

/** The model family of the selected checkpoint, for compatibility hints. */
function useCheckpointArch(): Arch | undefined {
  const models = useModels();
  const { checkpoint } = useCurrentCheckpoint(true);
  return models.data?.checkpoints.find((m) => m.title === checkpoint?.title)?.arch;
}

function Badge({ children }: { children: string }) {
  return <span className="shrink-0 rounded border border-line px-1.5 text-[11px] text-muted">{children}</span>;
}

function Warning({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-1.5 text-[12px] leading-snug text-bad">
      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function mismatchText(loraArch: Arch, checkpointArch: Arch): string {
  return `Made for ${ARCH_LABEL[loraArch]}; it won't work with this ${ARCH_LABEL[checkpointArch]} checkpoint.`;
}

function TriggerWords({ words }: { words: string[] }) {
  const prompt = useSettings((s) => s.prompt);
  const update = useSettings((s) => s.update);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[12px] text-muted">
        Trigger words
        <InfoTip topic="trigger words" text={HELP.triggerWords} />
      </span>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word) => {
          const added = hasTriggerWord(prompt, word);
          const chip = (
            <button
              key={word}
              type="button"
              onClick={() => update({ prompt: addTriggerWord(useSettings.getState().prompt, word) })}
              disabled={added}
              aria-label={added ? `${word} (in the prompt)` : `Add ${word} to the prompt`}
              className="flex max-w-full items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[12px] text-fg hover:border-line-strong hover:text-fg-strong disabled:border-transparent disabled:bg-raised disabled:text-muted"
            >
              {added ? (
                <Check className="size-3 shrink-0" aria-hidden />
              ) : (
                <Plus className="size-3 shrink-0" aria-hidden />
              )}
              <span className="truncate">{word.replace(/,+\s*$/, "")}</span>
            </button>
          );
          return word.length > 28 ? (
            <Hint key={word} label={word} side="top">
              {chip}
            </Hint>
          ) : (
            chip
          );
        })}
      </div>
    </div>
  );
}

function LoraCard({
  slot,
  entry,
  checkpointArch,
  onChange,
  onRemove,
}: {
  slot: LoraSlot;
  entry: ModelEntry | undefined;
  checkpointArch: Arch | undefined;
  onChange: (weight: number) => void;
  onRemove: () => void;
}) {
  const { name, detail } = displayName(entry?.stem ?? slot.name, entry?.civitai);
  const base = baseModelLabel(entry?.civitai.baseModel);
  const arch = entry?.arch;
  const fit = compatibility(arch, checkpointArch);
  const words = entry?.civitai.trainedWords?.filter((w) => w.trim()) ?? [];

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-3">
      <div className="flex items-start gap-2">
        <Layers className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="line-clamp-2 text-[13.5px] leading-snug font-medium text-fg-strong">{name}</span>
          {(detail || base) && (
            <span className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
              {detail && <span className="truncate">{detail}</span>}
              {base && <Badge>{base}</Badge>}
            </span>
          )}
        </div>
        {entry?.civitai.url && <CivitaiLink url={entry.civitai.url} name={name} />}
        <Hint label="Remove">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </Hint>
      </div>
      {!entry && <Warning>Not installed on this computer, so it is left out when generating.</Warning>}
      {entry && fit === "mismatch" && arch && checkpointArch && <Warning>{mismatchText(arch, checkpointArch)}</Warning>}
      <NumberSlider
        label="Strength"
        help={HELP.loraStrength}
        value={slot.weight}
        min={0}
        max={2}
        inputMin={-2}
        inputMax={4}
        step={0.05}
        onChange={onChange}
      />
      {words.length > 0 && <TriggerWords words={words} />}
    </li>
  );
}

function LoraPicker({
  loras,
  added,
  checkpointArch,
  onAdd,
}: {
  loras: readonly ModelEntry[];
  added: readonly LoraSlot[];
  checkpointArch: Arch | undefined;
  onAdd: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return loras
      .map((entry) => ({ entry, ...displayName(entry.stem, entry.civitai) }))
      .filter(({ entry, name }) => !q || name.toLowerCase().includes(q) || entry.file.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [loras, query]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <Popover.Trigger className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-[13px] text-muted hover:border-fg/40 hover:text-fg-strong data-[state=open]:text-fg-strong">
        <Plus className="size-3.5" aria-hidden />
        Add LoRA
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="right"
          sideOffset={10}
          collisionPadding={12}
          className="z-50 flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-surface text-fg shadow-lg shadow-black/15"
        >
          <label className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <Search className="size-3.5 shrink-0 text-faint" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search LoRAs…"
              aria-label="Search LoRAs"
              className="w-full bg-transparent text-[13.5px] text-fg-strong placeholder:text-faint focus:outline-none"
            />
          </label>
          <ul aria-label="LoRAs" className="flex flex-col overflow-y-auto p-1.5">
            {rows.length === 0 && (
              <li className="px-2.5 py-6 text-center text-[13px] text-faint">
                {loras.length === 0 ? "No LoRAs found in Forge's Lora folder." : "No LoRAs match the search."}
              </li>
            )}
            {rows.map(({ entry, name, detail }) => {
              const isAdded = added.some((a) => a.name.toLowerCase() === entry.stem.toLowerCase());
              const arch = entry.arch;
              const mismatch = compatibility(arch, checkpointArch) === "mismatch";
              const base = baseModelLabel(entry.civitai.baseModel);
              return (
                <li key={entry.file} className="flex items-center gap-1 rounded-md pr-1.5 hover:bg-raised">
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => {
                      onAdd(entry.stem);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left disabled:cursor-default"
                  >
                    <Layers className={`size-4 shrink-0 ${mismatch ? "text-faint/50" : "text-faint"}`} aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate text-[13.5px] ${mismatch ? "text-muted" : "text-fg-strong"}`}>
                        {name}
                      </span>
                      <span className="truncate text-[12px] text-muted">
                        {mismatch && arch && checkpointArch
                          ? `Made for ${ARCH_LABEL[arch]}, not this checkpoint`
                          : [detail, entry.civitai.status === "pending" ? "Looking up on Civitai…" : undefined]
                              .filter(Boolean)
                              .join(" · ") || entry.file}
                      </span>
                    </span>
                    {base && <Badge>{base}</Badge>}
                    <Check className={`size-3.5 shrink-0 text-accent ${isAdded ? "" : "invisible"}`} aria-hidden />
                  </button>
                  {entry.civitai.url && <CivitaiLink url={entry.civitai.url} name={name} />}
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function LoraSection() {
  const loras = useSettings((s) => s.loras);
  const open = useSettings((s) => s.openSections.loras ?? true);
  const update = useSettings((s) => s.update);
  const setSectionOpen = useSettings((s) => s.setSectionOpen);
  const models = useModels();
  const installed = models.data?.loras ?? [];
  const checkpointArch = useCheckpointArch();
  const refresh = useRefreshLoras();

  const setWeight = (index: number, weight: number) =>
    update({ loras: loras.map((l, i) => (i === index ? { ...l, weight } : l)) });
  const remove = (index: number) => update({ loras: loras.filter((_, i) => i !== index) });
  const add = (name: string) => update({ loras: [...loras, { name, weight: 1 }] });

  const summary = loras.length === 0 ? "None" : loras.length === 1 ? "1 LoRA" : `${loras.length} LoRAs`;

  return (
    <Section
      title="LoRAs"
      icon={Layers}
      help={HELP.loras}
      summary={summary}
      open={open}
      onOpenChange={(o) => setSectionOpen("loras", o)}
    >
      {loras.length > 0 && (
        <ul className="flex flex-col gap-2">
          {loras.map((slot, index) => (
            <LoraCard
              key={slot.name}
              slot={slot}
              entry={findEntry(installed, slot.name)}
              checkpointArch={checkpointArch}
              onChange={(weight) => setWeight(index, weight)}
              onRemove={() => remove(index)}
            />
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <LoraPicker loras={installed} added={loras} checkpointArch={checkpointArch} onAdd={add} />
        <RefreshButton
          label="Reload LoRA list"
          busy={refresh.isPending}
          onClick={() => refresh.mutate()}
          className="size-9 border border-line"
        />
      </div>
    </Section>
  );
}
