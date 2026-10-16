import { Box, Check, ChevronDown, LoaderCircle } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { useModels, useRefreshCheckpoints, type ModelEntry } from "../api/forgelight";
import { useCheckpoints, useCurrentCheckpoint, useSetCheckpoint } from "../api/queries";
import { HELP } from "../lib/help";
import { baseModelLabel, displayName, tidyName } from "../lib/modelNames";
import { useSession } from "../stores/session";
import { Hint } from "./Hint";
import { CivitaiLink } from "./CivitaiLink";
import { InfoTip } from "./InfoTip";
import { RefreshButton } from "./RefreshButton";

interface Row {
  title: string;
  name: string;
  detail?: string;
  base?: string;
  url?: string;
  file: string;
  lookingUp: boolean;
}

/** Forge's checkpoint list, enriched with Civitai details where the extension has them. */
function useRows(enabled: boolean): Row[] {
  const checkpoints = useCheckpoints(enabled);
  const models = useModels(enabled);
  const byTitle = new Map<string, ModelEntry>((models.data?.checkpoints ?? []).map((m) => [m.title ?? "", m]));
  return (checkpoints.data ?? []).map((c) => {
    const entry = byTitle.get(c.title);
    const stem = entry?.stem ?? c.model_name;
    const { name, detail } = displayName(stem, entry?.civitai);
    return {
      title: c.title,
      name,
      detail,
      base: baseModelLabel(entry?.civitai.baseModel),
      url: entry?.civitai.url,
      file: entry?.file ?? c.title,
      lookingUp: entry?.civitai.status === "pending",
    };
  });
}

/**
 * Chooses the checkpoint Forge uses, like the dropdown in the classic page.
 * Forge loads the new file at the next generation, which then takes longer.
 */
export function CheckpointPicker({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const rows = useRows(enabled);
  const { checkpoint, setting, isLoading } = useCurrentCheckpoint(enabled);
  const setCheckpoint = useSetCheckpoint();
  const refresh = useRefreshCheckpoints();
  const running = useSession((s) => s.job.status === "running");
  if (!enabled) return null;

  const current = rows.find((r) => r.title === checkpoint?.title);
  const label = setCheckpoint.isPending
    ? "Switching…"
    : isLoading
      ? "Loading…"
      : (current?.name ?? (setting ? tidyName(setting.replace(/\.(safetensors|ckpt).*$/i, "")) : "None"));
  const disabled = running || setCheckpoint.isPending;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Hint label={running ? "The checkpoint can be changed once the current generation finishes" : null}>
          <span className="flex min-w-0" tabIndex={running ? 0 : -1}>
            <Popover.Trigger
              disabled={disabled}
              className="group flex max-w-[26rem] min-w-0 items-center gap-2 rounded-md border border-line py-1 pr-2 pl-2.5 text-left hover:border-line-strong disabled:opacity-60 disabled:hover:border-line data-[state=open]:border-line-strong"
            >
              {setCheckpoint.isPending ? (
                <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted" aria-hidden />
              ) : (
                <Box className="size-3.5 shrink-0 text-muted" aria-hidden />
              )}
              <span className="text-[12px] text-muted">Checkpoint</span>
              <span className="truncate text-[13px] font-medium text-fg-strong">{label}</span>
              {current?.base && (
                <span className="shrink-0 rounded border border-line px-1.5 text-[11px] text-muted">
                  {current.base}
                </span>
              )}
              <ChevronDown className="size-3.5 shrink-0 text-muted group-data-[state=open]:rotate-180" aria-hidden />
            </Popover.Trigger>
          </span>
        </Hint>
        <Popover.Portal>
          <Popover.Content
            // Opening with focus on an info icon would pop its tooltip up uninvited.
            onOpenAutoFocus={(event) => event.preventDefault()}
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 flex max-h-[min(30rem,var(--radix-popover-content-available-height))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-surface text-fg shadow-lg shadow-black/15"
          >
            <div className="flex items-center gap-1.5 px-3.5 pt-3 pb-1.5">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">Checkpoints</span>
              <InfoTip topic="checkpoints" text={HELP.checkpoint} side="right" />
              <RefreshButton
                label="Reload checkpoint list"
                busy={refresh.isPending}
                onClick={() => refresh.mutate()}
                className="ml-auto size-7"
              />
            </div>
            <ul role="listbox" aria-label="Checkpoints" className="flex flex-col overflow-y-auto px-1.5 pb-1.5">
              {rows.map((row) => {
                const selected = row.title === checkpoint?.title;
                return (
                  <li key={row.title} className="group flex items-center gap-1 rounded-md pr-1.5 hover:bg-raised">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setOpen(false);
                        if (!selected) setCheckpoint.mutate(row.title);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left"
                    >
                      <Box className="size-4 shrink-0 text-faint" aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={`truncate text-[13.5px] ${selected ? "font-medium text-fg-strong" : "text-fg"}`}
                        >
                          {row.name}
                        </span>
                        <span className="truncate text-[12px] text-muted">
                          {[row.detail, row.lookingUp ? "Looking up on Civitai…" : undefined]
                            .filter(Boolean)
                            .join(" · ") || row.file}
                        </span>
                      </span>
                      {row.base && (
                        <span className="shrink-0 rounded border border-line px-1.5 text-[11px] text-muted">
                          {row.base}
                        </span>
                      )}
                      <Check className={`size-3.5 shrink-0 text-accent ${selected ? "" : "invisible"}`} aria-hidden />
                    </button>
                    {row.url && <CivitaiLink url={row.url} name={row.name} />}
                  </li>
                );
              })}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
