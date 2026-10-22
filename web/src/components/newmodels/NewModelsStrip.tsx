import { Box, Check, FolderOpen, Layers, TriangleAlert, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { revealModel, useFoundModels, type FoundModel } from "../../api/newModels";
import { useCheckpoints, useSetCheckpoint } from "../../api/queries";
import { ARCH_LABEL } from "../../lib/loras";
import { displayName } from "../../lib/modelNames";
import { cardModels, formatSize, moveNote, offerTitle } from "../../lib/newModels";
import { startMove, useNewModels, type MoveState } from "../../stores/newModels";
import { usePreferences } from "../../stores/preferences";
import { useSession } from "../../stores/session";
import { useSettings } from "../../stores/settings";
import { Hint } from "../Hint";
import { FoundMenu, MoveButton } from "./MoveControls";

const secondary =
  "flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12px] text-fg hover:border-line-strong hover:text-fg-strong disabled:opacity-50 disabled:hover:border-line";

function forget(id: string): void {
  useNewModels.setState((s) => ({ moves: Object.fromEntries(Object.entries(s.moves).filter(([key]) => key !== id)) }));
}

/** One line of the strip: an icon, two lines of text, and the buttons at the right. */
function Row({
  icon: Icon,
  iconClass,
  title,
  note,
  children,
}: {
  icon: LucideIcon;
  iconClass: string;
  title: ReactNode;
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 basis-72 items-start gap-2.5">
        <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} aria-hidden />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-[13px] text-fg">{title}</p>
          <p className="text-[12px] leading-snug text-muted">{note}</p>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}

function OfferRow({ found }: { found: FoundModel }) {
  const snooze = useNewModels((s) => s.snooze);
  const { name } = displayName(found.stem, found.civitai);
  const details = [found.arch !== "unknown" ? ARCH_LABEL[found.arch] : undefined, formatSize(found.size)];
  return (
    <Row
      icon={found.kind === "checkpoint" ? Box : Layers}
      iconClass="text-faint"
      title={
        <>
          {offerTitle(found)}: <span className="font-medium text-fg-strong">{name}</span>
          <span className="text-muted"> · {details.filter(Boolean).join(" · ")}</span>
        </>
      }
      note={moveNote(found)}
    >
      <FoundMenu found={found} />
      <button
        type="button"
        onClick={() => snooze([found.id])}
        className="h-7 shrink-0 rounded-md px-2 text-[12px] text-muted hover:bg-raised hover:text-fg-strong"
      >
        Not now
      </button>
      <MoveButton found={found} />
    </Row>
  );
}

function CloseButton({ id }: { id: string }) {
  return (
    <Hint label="Close">
      <button
        type="button"
        onClick={() => forget(id)}
        aria-label="Close"
        className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </Hint>
  );
}

/** After the move: where the file went, and the obvious next step. */
function MovedRow({ move }: { move: Extract<MoveState, { status: "moved" }> }) {
  const { found, moved } = move;
  const { name } = displayName(found.stem, found.civitai);
  const checkpoints = useCheckpoints(moved.kind === "checkpoint");
  const setCheckpoint = useSetCheckpoint();
  const running = useSession((s) => s.job.status === "running");
  const title = checkpoints.data?.find((c) => c.filename.replace(/\\/g, "/").endsWith(`/${moved.file}`))?.title;
  const loraName = moved.file.replace(/\.safetensors$/i, "");

  const useIt = () => {
    if (moved.kind === "checkpoint") {
      if (title) setCheckpoint.mutate(title, { onSuccess: () => forget(found.id) });
      return;
    }
    const { loras, update } = useSettings.getState();
    if (!loras.some((l) => l.name.toLowerCase() === loraName.toLowerCase())) {
      update({ loras: [...loras, { name: loraName, weight: 1 }] });
    }
    forget(found.id);
  };

  return (
    <Row
      icon={Check}
      iconClass="text-accent"
      title={<span className="font-medium text-fg-strong">{name}</span>}
      note={`Moved into Forge's ${moved.targetLabel} folder${moved.file !== found.file ? ` as ${moved.file}` : ""}.`}
    >
      <button type="button" onClick={() => void revealModel(moved)} className={secondary}>
        <FolderOpen className="size-3.5" aria-hidden />
        Show in folder
      </button>
      <button
        type="button"
        onClick={useIt}
        disabled={moved.kind === "checkpoint" && (!title || running || setCheckpoint.isPending)}
        className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-[12px] font-medium text-on-primary hover:bg-primary-hover disabled:opacity-50"
      >
        {moved.kind === "checkpoint" ? "Switch to it" : "Add to prompt"}
      </button>
      <CloseButton id={found.id} />
    </Row>
  );
}

function ErrorRow({ move }: { move: Extract<MoveState, { status: "error" }> }) {
  const { name } = displayName(move.found.stem, move.found.civitai);
  return (
    <Row
      icon={TriangleAlert}
      iconClass="text-bad"
      title={<span className="font-medium text-fg-strong">{name}</span>}
      note={<span className="text-bad">{move.message}</span>}
    >
      <button type="button" onClick={() => void startMove(move.found)} className={secondary}>
        Try again
      </button>
      <CloseButton id={move.found.id} />
    </Row>
  );
}

/**
 * New checkpoints and LoRAs from Downloads or the Desktop, as a strip beside the prompt
 * card, styled like it. "Not now" puts a file off until the page is opened again; files
 * also stay listed at the top of the model lists.
 */
export function NewModelsStrip() {
  const enabled = usePreferences((s) => s.findNewModels);
  const found = useFoundModels();
  const snoozed = useNewModels((s) => s.snoozed);
  const moves = useNewModels((s) => s.moves);
  if (!enabled) return null;

  const finished = Object.values(moves).filter((m) => m.status === "moved" || m.status === "error");
  const offered = cardModels(found.data ?? [], snoozed).filter(
    (f) => !moves[f.id] || moves[f.id]?.status === "moving" || moves[f.id]?.status === "waiting",
  );
  if (offered.length === 0 && finished.length === 0) return null;

  return (
    <section aria-label="New models" className="rounded-xl border border-line bg-surface px-4 py-3">
      <ul className="flex flex-col gap-3">
        {finished.map((move) =>
          move.status === "moved" ? (
            <MovedRow key={move.found.id} move={move} />
          ) : move.status === "error" ? (
            <ErrorRow key={move.found.id} move={move} />
          ) : null,
        )}
        {offered.map((f) => (
          <OfferRow key={f.id} found={f} />
        ))}
      </ul>
    </section>
  );
}
