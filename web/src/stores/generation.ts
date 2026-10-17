import { forgePost } from "../api/client";
import type { ModelEntry } from "../api/forgelight";
import { queryClient } from "../api/queryClient";
import { randomTaskId } from "../lib/format";
import { buildTxt2imgRequest, friendlyError, hiresSize, parseTxt2imgResult } from "../lib/txt2img";
import { useSession, type Job, type JobPhase, type SessionImage } from "./session";
import { currentSettings } from "./settings";

const POLL_MS = 400;

function base64ToObjectUrl(base64: string): string {
  const bytes = Uint8Array.from(atob(base64.replace(/^data:[^,]+,/, "")), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
}

function updateRunning(changes: Partial<Extract<Job, { status: "running" }>>) {
  const { job, setJob } = useSession.getState();
  if (job.status === "running") setJob({ ...job, ...changes });
}

/** Polls Forge's progress endpoint (the same one the classic page uses) until stopped. */
function pollProgress(taskId: string) {
  let stopped = false;
  let previewId = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    try {
      const p = await forgePost("/internal/progress", {
        id_task: taskId,
        id_live_preview: previewId,
        live_preview: true,
      });
      if (stopped) return;
      const progress = p.progress ?? 0;
      const phase: JobPhase = !p.active ? "waiting" : progress > 0 || p.live_preview ? "sampling" : "preparing";
      const changes: Partial<Extract<Job, { status: "running" }>> = {
        phase,
        progress,
        etaSeconds: p.eta ?? null,
      };
      if (p.live_preview) {
        changes.previewUrl = p.live_preview;
        previewId = p.id_live_preview ?? previewId;
      }
      updateRunning(changes);
    } catch {
      // A missed poll is harmless; the next one catches up.
    }
    if (!stopped) timer = setTimeout(tick, POLL_MS);
  };

  timer = setTimeout(tick, POLL_MS);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

/**
 * Keeps only LoRAs that are installed, using their exact file name. Pasted settings can
 * name LoRAs this computer doesn't have; those stay visible in the panel but aren't sent.
 */
function withInstalledLoras<T extends { loras: { name: string; weight: number }[] }>(settings: T): T {
  const installed = queryClient.getQueryData<{ loras: ModelEntry[] }>(["forgelight-models"])?.loras;
  if (!installed) return settings;
  const loras = settings.loras.flatMap((lora) => {
    const match = installed.find((m) => m.stem.toLowerCase() === lora.name.toLowerCase());
    return match ? [{ name: match.stem, weight: lora.weight }] : [];
  });
  return { ...settings, loras };
}

export function isRunning(): boolean {
  return useSession.getState().job.status === "running";
}

export async function generate(): Promise<void> {
  if (isRunning()) return;
  const settings = withInstalledLoras(currentSettings());
  const taskId = randomTaskId();
  const { setJob, addImages } = useSession.getState();

  setJob({
    status: "running",
    taskId,
    phase: "waiting",
    progress: 0,
    etaSeconds: null,
    previewUrl: null,
    startedAt: Date.now(),
    width: settings.width,
    height: settings.height,
    batchCount: settings.batchCount,
    hires: settings.hiresEnabled ? hiresSize(settings.width, settings.height, settings.hiresScale) : null,
    stopping: false,
  });
  const stopPolling = pollProgress(taskId);

  try {
    const result = await forgePost("/sdapi/v1/txt2img", buildTxt2imgRequest(settings, taskId));
    const images: SessionImage[] = parseTxt2imgResult(result?.images ?? [], result?.info ?? "").map((img) => ({
      id: crypto.randomUUID(),
      url: base64ToObjectUrl(img.base64),
      width: settings.width,
      height: settings.height,
      seed: img.seed,
      infotext: img.infotext,
      createdAt: Date.now(),
    }));
    // Results arrive in generation order; the session lists newest first.
    addImages(images.reverse());
    // Forge saved them to its outputs folder too, so the Library has news.
    void queryClient.invalidateQueries({ queryKey: ["library"] });
    setJob({ status: "idle" });
  } catch (error) {
    setJob({ status: "error", message: friendlyError(error instanceof Error ? error.message : String(error)) });
  } finally {
    stopPolling();
  }
}

/** Stops the whole job. Images already finished in a batch are still returned. */
export async function interrupt(): Promise<void> {
  if (!isRunning()) return;
  updateRunning({ stopping: true });
  await forgePost("/sdapi/v1/interrupt").catch(() => undefined);
}

/** Skips the image currently being made and continues with the rest of the batch. */
export async function skip(): Promise<void> {
  if (!isRunning()) return;
  await forgePost("/sdapi/v1/skip").catch(() => undefined);
}

export function dismissError(): void {
  const { job, setJob } = useSession.getState();
  if (job.status === "error") setJob({ status: "idle" });
}
