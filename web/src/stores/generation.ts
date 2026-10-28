import { ForgeError, forgePost, type PostResponse } from "../api/client";
import { request, type LoadingState, type ModelEntry } from "../api/forgelight";
import type { LibraryPage } from "../api/library";
import { addPrivateImage, privateGenerate, privateModeOn, waitForPrivateResult } from "../api/private";
import { queryClient } from "../api/queryClient";
import { jobStats } from "../api/system";
import { randomTaskId } from "../lib/format";
import { buildImg2imgRequest } from "../lib/img2img";
import { imageUrl, seedOf } from "../lib/library";
import { promptWithLoras } from "../lib/loras";
import { nextLoadStep } from "../lib/progress";
import { findJobResults, type PendingJob } from "../lib/sessionMemory";
import { seedFromInfotext } from "../lib/infotext";
import { buildTxt2imgRequest, friendlyError, hiresSize, parseTxt2imgResult } from "../lib/txt2img";
import { buildEnhanceRequest, buildExtrasRequest, upscaleTarget } from "../lib/upscale";
import { useSession, type Job, type JobPhase, type SessionImage } from "./session";
import { clearPendingJob, readPendingJob, writePendingJob } from "./sessionMemory";
import { currentSettings } from "./settings";
import { useStartImage } from "./startImage";
import { useUpscale } from "./upscale";

const POLL_MS = 400;

function base64ToObjectUrl(base64: string): string {
  const bytes = Uint8Array.from(atob(base64.replace(/^data:[^,]+,/, "")), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
}

function updateRunning(changes: Partial<Extract<Job, { status: "running" }>>) {
  const { job, setJob } = useSession.getState();
  if (job.status === "running") setJob({ ...job, ...changes });
}

/**
 * Polls Forge's progress endpoint (the same one the classic page uses) until stopped.
 * With `onEnd`, also watches for the task to end: `completed` is false when Forge doesn't
 * know the task (it was restarted, or the task never arrived).
 */
function pollProgress(taskId: string, onEnd?: (completed: boolean) => void) {
  let stopped = false;
  let previewId = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    try {
      const job = useSession.getState().job;
      // Until the image itself starts, also ask whether a checkpoint is loading.
      const askLoading = job.status === "running" && job.phase !== "sampling";
      const [p, loading] = await Promise.all([
        forgePost("/internal/progress", { id_task: taskId, id_live_preview: previewId, live_preview: true }),
        askLoading ? request<LoadingState>("loading").catch(() => null) : null,
      ]);
      if (stopped) return;
      if (onEnd && (p.completed || (!p.active && !p.queued))) {
        stopped = true;
        onEnd(Boolean(p.completed));
        return;
      }
      const progress = p.progress ?? 0;
      const phase: JobPhase = !p.active ? "waiting" : progress > 0 || p.live_preview ? "sampling" : "preparing";
      const changes: Partial<Extract<Job, { status: "running" }>> = {
        phase,
        progress,
        etaSeconds: p.eta ?? null,
      };
      if (loading && job.status === "running") {
        changes.loading = nextLoadStep(job.loading, loading);
        changes.loadingKnown = true;
      }
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

/** A job just started, or picked up again after a reload: nothing known about its progress yet. */
function runningJob(pending: PendingJob): Extract<Job, { status: "running" }> {
  const { taskId, startedAt, width, height, batchCount, hires } = pending;
  return {
    status: "running",
    taskId,
    phase: "waiting",
    progress: 0,
    etaSeconds: null,
    previewUrl: null,
    startedAt,
    width,
    height,
    batchCount,
    hires,
    loading: null,
    loadingKnown: false,
    stopping: false,
    enlarging: false,
  };
}

function errorMessage(error: unknown): string {
  return friendlyError(error instanceof Error ? error.message : String(error));
}

/** Ends the job and shows why it failed; the message stays until dismissed or the next job starts. */
function fail(message: string): void {
  const { setJob, showNotice } = useSession.getState();
  setJob({ status: "idle" });
  showNotice({ tone: "error", text: message });
}

export async function generate(): Promise<void> {
  if (isRunning()) return;
  useSession.getState().dismissErrors();
  // With an image attached for upscaling, Generate enlarges it instead.
  if (useUpscale.getState().source) return upscale();
  const settings = withInstalledLoras(currentSettings());
  // With a starting image attached, Generate makes a new version of it (img2img, no hires fix).
  const startImage = useStartImage.getState().image;
  const taskId = randomTaskId();

  const pending: PendingJob = {
    taskId,
    startedAt: Date.now(),
    width: settings.width,
    height: settings.height,
    batchCount: settings.batchCount,
    hires:
      settings.hiresEnabled && !startImage ? hiresSize(settings.width, settings.height, settings.hiresScale) : null,
    prompt: promptWithLoras(settings.prompt, settings.loras),
  };
  useSession.getState().setJob(runningJob(pending));
  await markPrivate(pending);
  await runGeneration(pending, () => {
    if (startImage) {
      const body = buildImg2imgRequest(settings, startImage.dataUrl, taskId);
      return pending.private ? privateGenerate("img2img", body) : forgePost("/sdapi/v1/img2img", body);
    }
    const body = buildTxt2imgRequest(settings, taskId);
    return pending.private ? privateGenerate("txt2img", body) : forgePost("/sdapi/v1/txt2img", body);
  });
}

/** Private mode is asked right before sending; a private job keeps no prompt in the tab's memory. */
async function markPrivate(pending: PendingJob): Promise<void> {
  if (!(await privateModeOn())) return;
  pending.private = true;
  pending.prompt = "";
}

type GenerationResult =
  PostResponse<"/sdapi/v1/txt2img"> | PostResponse<"/sdapi/v1/img2img"> | { images: string[]; info: string };

/** The images of a finished generation, as Session strip entries, in generation order. */
async function sessionImages(result: GenerationResult | undefined, pending: PendingJob): Promise<SessionImage[]> {
  const images = parseTxt2imgResult(result?.images ?? [], result?.info ?? "");
  const stats = await jobStats(pending.startedAt, images.length);
  return images.map((img) => ({
    id: crypto.randomUUID(),
    url: base64ToObjectUrl(img.base64),
    width: pending.width,
    height: pending.height,
    seed: img.seed,
    infotext: img.infotext,
    createdAt: Date.now(),
    private: pending.private,
    stats,
  }));
}

/**
 * Sends a generation to Forge, shows its progress, then its images. The job is remembered
 * meanwhile, so a reload or a broken connection picks it up again.
 */
async function runGeneration(pending: PendingJob, send: () => Promise<GenerationResult>): Promise<void> {
  const { setJob, addImages } = useSession.getState();
  writePendingJob(pending);
  const stopPolling = pollProgress(pending.taskId);

  let result;
  try {
    result = await send();
  } catch (error) {
    stopPolling();
    // Without an answer from Forge (the page is reloading, or the connection broke), the
    // generation itself goes on: follow it by its task id. It stays remembered meanwhile,
    // so a reload picks it up too.
    if (!(error instanceof ForgeError)) return followJob(pending);
    clearPendingJob();
    fail(friendlyError(error.message));
    return;
  }

  try {
    // Results arrive in generation order; the session lists newest first.
    addImages((await sessionImages(result, pending)).reverse());
    // Forge saved public ones to its outputs folder too, so the Library has news.
    if (!pending.private) void queryClient.invalidateQueries({ queryKey: ["library"] });
    setJob({ status: "idle" });
  } catch (error) {
    fail(errorMessage(error));
  } finally {
    stopPolling();
    clearPendingJob();
  }
}

/**
 * Enlarges the attached image with Forge's upscaler. Enhance then redraws it lightly at the
 * new size, like hires fix, and Forge saves the result; Upscale only is saved by the
 * extension, in Forge's extras folder.
 */
async function upscale(): Promise<void> {
  const card = useUpscale.getState();
  const source = card.source;
  if (!source) return;
  const { setJob, addImages } = useSession.getState();
  const enhance = card.method === "enhance";
  const target = upscaleTarget(source, enhance ? card.enhanceScale : card.upscaleScale, card.method);
  const settings = withInstalledLoras(currentSettings());
  const pending: PendingJob = {
    taskId: randomTaskId(),
    startedAt: Date.now(),
    ...target,
    batchCount: 1,
    hires: null,
    prompt: promptWithLoras(settings.prompt, settings.loras),
  };
  setJob({ ...runningJob(pending), enlarging: true });
  await markPrivate(pending);

  let enlarged: string;
  try {
    const result = await forgePost(
      "/sdapi/v1/extra-single-image",
      buildExtrasRequest(source.dataUrl, target, card.upscaler),
    );
    if (!result?.image) throw new Error("Forge returned no image.");
    enlarged = result.image;
  } catch (error) {
    fail(errorMessage(error));
    return;
  }

  if (enhance) {
    updateRunning({ enlarging: false });
    const body = buildEnhanceRequest(settings, enlarged, target, card.strength, pending.taskId);
    return runGeneration(pending, () =>
      pending.private ? privateGenerate("img2img", body) : forgePost("/sdapi/v1/img2img", body),
    );
  }

  try {
    const note = `Postprocess upscale to: ${target.width}x${target.height}, Postprocess upscaler: ${card.upscaler}`;
    const saved = pending.private
      ? await savePrivateUpscale(enlarged, source.infotext, note)
      : await request<{ id: string; infotext: string }>("library/save-upscaled", {
          image: enlarged,
          infotext: source.infotext,
          note,
          name: source.name,
        });
    addImages([
      {
        id: crypto.randomUUID(),
        url: base64ToObjectUrl(enlarged),
        ...target,
        seed: seedFromInfotext(saved.infotext),
        infotext: saved.infotext,
        createdAt: Date.now(),
        private: pending.private,
        stats: await jobStats(pending.startedAt, 1),
      },
    ]);
    if (!pending.private) void queryClient.invalidateQueries({ queryKey: ["library"] });
    setJob({ status: "idle" });
  } catch (error) {
    fail(errorMessage(error));
  }
}

/** Upscale only, in private mode: the enlarged image goes into the vault with the note added. */
async function savePrivateUpscale(image: string, infotext: string, note: string): Promise<{ infotext: string }> {
  const withNote = infotext ? `${infotext}, ${note}` : note;
  await addPrivateImage(image, withNote);
  return { infotext: withNote };
}

const RESULT_TRIES = 6;
const RESULT_RETRY_MS = 1000;

/** The images a resumed job saved, read from the outputs folder once they show up there. */
async function savedResults(job: PendingJob): Promise<SessionImage[]> {
  let found: ReturnType<typeof findJobResults> = [];
  for (let attempt = 0; attempt < RESULT_TRIES; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RESULT_RETRY_MS));
    const page = await request<LibraryPage>(`library?offset=0&limit=${job.batchCount + 40}`);
    found = findJobResults(page.items, job);
    // A stopped batch saves fewer images, so after a few tries the ones found are all.
    if (found.length >= job.batchCount) break;
  }
  const stats = await jobStats(job.startedAt, found.length);
  return found.map((item) => ({
    id: crypto.randomUUID(),
    url: imageUrl(item),
    width: job.width,
    height: job.height,
    seed: seedOf(item),
    infotext: item.infotext,
    createdAt: item.mtime * 1000,
    stats,
  }));
}

/**
 * Follows a generation by its task id until Forge is done with it, then shows the images
 * it saved. Used when the page lost the request's answer: after a reload, or a broken
 * connection.
 */
function followJob(pending: PendingJob): void {
  const { setJob, addImages, showNotice } = useSession.getState();
  if (pending.private) return followPrivateJob(pending);
  pollProgress(pending.taskId, (completed) => {
    clearPendingJob();
    void (async () => {
      try {
        const images = completed ? await savedResults(pending) : [];
        addImages(images.reverse());
        if (!completed) {
          showNotice({ tone: "warning", text: "The generation was not found in Forge. Forge may have restarted." });
        } else if (images.length === 0) {
          showNotice({
            tone: "warning",
            text: "The generation finished, but its images weren't found in the outputs folder.",
          });
        } else {
          void queryClient.invalidateQueries({ queryKey: ["library"] });
        }
      } catch {
        showNotice({ tone: "warning", text: "The finished images could not be shown here. They are in the Library." });
      }
      setJob({ status: "idle" });
    })();
  });
}

/** The same for a private generation: the extension holds its reply until the page asks. */
function followPrivateJob(pending: PendingJob): void {
  const { setJob, addImages, showNotice } = useSession.getState();
  const stopPolling = pollProgress(pending.taskId);
  void (async () => {
    try {
      addImages((await sessionImages(await waitForPrivateResult(pending.taskId), pending)).reverse());
    } catch (error) {
      showNotice({ tone: "warning", text: errorMessage(error) });
    } finally {
      stopPolling();
      clearPendingJob();
      setJob({ status: "idle" });
    }
  })();
}

/** Picks up a generation that was running when the page reloaded: Forge kept going. */
export function resumeAfterReload(): void {
  const pending = readPendingJob();
  if (!pending || isRunning()) return;
  useSession.getState().setJob(runningJob(pending));
  followJob(pending);
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
