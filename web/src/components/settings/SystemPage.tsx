import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSystemLive, useSystemOverview } from "../../api/system";
import { useModelLabels } from "../../hooks/useModelLabels";
import { HELP } from "../../lib/help";
import { formatNumber } from "../../lib/region";
import { formatBytes, formatGb, gpuLabel, share, systemReport, versionLine } from "../../lib/system";
import { Hint } from "../Hint";
import { InfoTip } from "../InfoTip";
import { Group, Page, Row } from "./parts";

// Shown until a value arrives.
const WAITING = "…";

function Bar({ fill }: { fill: number }) {
  return (
    <span className="mt-2.5 h-1 overflow-hidden rounded-full bg-line">
      <span className="block h-full rounded-full bg-accent" style={{ width: `${fill * 100}%` }} />
    </span>
  );
}

/** One of the four numbers at the top, with an optional bar. */
function Tile({
  label,
  help,
  value,
  detail,
  fill,
}: {
  label: string;
  help?: string;
  value: string;
  detail: string;
  fill?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-raised/60 px-3.5 pt-3 pb-3.5">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
        {label}
        {help && <InfoTip topic={label} text={help} side="top" boldStart={label} />}
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-fg-strong tabular-nums">{value}</span>
      <span className="truncate text-[12px] text-muted tabular-nums">{detail}</span>
      {fill !== undefined && <Bar fill={fill} />}
    </div>
  );
}

function Value({ children }: { children: ReactNode }) {
  return <span className="min-w-0 truncate text-[13px] text-fg-strong tabular-nums">{children}</span>;
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-[12px] text-muted">{label}</span>
      <span className="text-[13.5px] text-fg-strong tabular-nums">{value}</span>
    </span>
  );
}

function CopyDetails({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Hint label="Copy system details">
      <button
        type="button"
        aria-label="Copy system details"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }}
        className="grid size-6 shrink-0 place-items-center rounded text-muted hover:bg-raised hover:text-fg-strong"
      >
        {copied ? <Check className="size-3.5 text-good" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      </button>
    </Hint>
  );
}

/** This computer as Forge uses it: memory, the graphics card, storage, usage and versions. */
export function SystemPage() {
  const overview = useSystemOverview();
  const live = useSystemLive();
  const modelLabel = useModelLabels();
  const system = overview.data;
  const now = live.data;
  const storage = system?.storage;
  const usage = system?.usage;
  const gpu = system ? gpuLabel(system.gpu, system.portable) : null;
  const top = usage?.topModel;

  return (
    <Page title="System" intro="Memory and temperature update every few seconds while this page is open.">
      <div className="grid grid-cols-4 gap-2.5">
        <Tile
          label="VRAM"
          help={HELP.vram}
          value={now?.vram ? formatGb(now.vram.used) : WAITING}
          detail={now?.vram ? `used of ${formatGb(now.vram.total)}` : system && !system.gpu ? "No Nvidia card" : ""}
          fill={now?.vram ? share(now.vram.used, now.vram.total) : 0}
        />
        <Tile
          label="RAM"
          help={HELP.ram}
          value={now ? formatGb(now.ram.used) : WAITING}
          detail={now ? `used of ${formatGb(now.ram.total)}` : ""}
          fill={now ? share(now.ram.used, now.ram.total) : 0}
        />
        <Tile
          label={storage ? `Drive ${storage.drive}` : "Drive"}
          value={storage ? formatBytes(storage.free) : WAITING}
          detail={storage ? `free of ${formatGb(storage.total)}` : ""}
          fill={storage ? share(storage.total - storage.free, storage.total) : 0}
        />
        <Tile
          label="Images made"
          value={usage ? formatNumber(usage.total) : WAITING}
          detail={usage ? `${formatNumber(usage.today)} today` : ""}
        />
      </div>

      <Group title="Details" help={HELP.systemDetails}>
        <Row id="system-gpu" label="Graphics card">
          <Value>
            {gpu ?? (system ? "No Nvidia card found" : WAITING)}
            {now?.gpu && (
              <span className="text-muted">
                {" "}
                · <span className="text-fg-strong">{now.gpu.temperature} °C</span> ·{" "}
                <span className="text-fg-strong">{now.gpu.load}% busy</span>
              </span>
            )}
          </Value>
        </Row>
        <div className="grid min-h-11 grid-cols-3 items-center gap-3 py-2">
          <Amount label="Generated images" value={storage ? formatBytes(storage.images) : WAITING} />
          <Amount label="Checkpoints and LoRAs" value={storage ? formatBytes(storage.models) : WAITING} />
          <Amount label="Private vault" value={storage ? formatBytes(storage.vault) : WAITING} />
        </div>
        <Row id="system-top-model" label="Most used checkpoint">
          <Value>
            {top ? (
              <>
                {modelLabel(top.name)}{" "}
                <span className="text-muted">
                  · {top.count === 1 ? "1 image" : `${formatNumber(top.count)} images`}
                </span>
              </>
            ) : usage ? (
              "None yet"
            ) : (
              WAITING
            )}
          </Value>
        </Row>
      </Group>

      {system && (
        <div className="-mt-2 flex items-center justify-between gap-3 px-1">
          <span className="truncate text-[12.5px] text-muted">{versionLine(system.versions)}</span>
          <CopyDetails text={systemReport(system)} />
        </div>
      )}
      {overview.error && <p className="px-1 text-[12.5px] text-bad">{overview.error.message}</p>}
    </Page>
  );
}
