import type { LoadingStage, LoadingState } from "../api/forgelight";
import type { Job } from "../stores/session";
import { formatSeconds } from "./format";

type RunningJob = Extract<Job, { status: "running" }>;

/** Where a checkpoint load stands: "pending" until Forge starts on it. */
export interface LoadStep {
  stage: LoadingStage | "pending";
  /** 0 to 1 when known. */
  progress: number | null;
}

/**
 * The job's loading step after a new report from the extension. A job counts as loading
 * once a load is pending or under way; moving parts to the graphics card alone also
 * happens in ordinary generations, so it only shows after a load. Between steps the last
 * one stays on screen.
 */
export function nextLoadStep(previous: LoadStep | null, state: LoadingState): LoadStep | null {
  const loading = state.pending || state.stage === "unloading" || state.stage === "reading";
  if (!loading && !previous) return null;
  if (state.stage === "reading") return { stage: "reading", progress: state.isCheckpoint ? state.progress : null };
  if (state.stage) return { stage: state.stage, progress: state.progress };
  return previous ?? { stage: "pending", progress: null };
}

/** True while the checkpoint is loading, before the first step of the image itself. */
export function isLoading(job: RunningJob): boolean {
  return job.loading !== null && job.phase !== "sampling";
}

/**
 * How full the bar is for a loading step. Reading the file from disk is by far the
 * longest part, so it fills the first 90%; setting up the model's parts fills the rest.
 */
export function loadFraction(step: LoadStep): number {
  const p = step.progress ?? 0;
  switch (step.stage) {
    case "pending":
    case "unloading":
      return 0;
    case "reading":
      return 0.9 * p;
    case "building":
      return 0.9 + 0.1 * p;
    case "moving":
      return 1;
  }
}

/** How full the progress bar is, 0 to 1. */
export function barFraction(job: RunningJob): number {
  return isLoading(job) && job.loading ? loadFraction(job.loading) : job.progress;
}

/** True when the bar can't show how far along the current step is, so it pulses instead. */
export function barPulses(job: RunningJob): boolean {
  if (!isLoading(job) || !job.loading) return false;
  const { stage, progress } = job.loading;
  return stage === "pending" || stage === "unloading" || stage === "moving" || progress === null;
}

const LOAD_LABEL: Record<LoadStep["stage"], string> = {
  pending: "Loading checkpoint…",
  unloading: "Loading checkpoint · clearing the previous one",
  reading: "Loading checkpoint · reading from disk",
  building: "Loading checkpoint · setting up the model",
  moving: "Loading checkpoint · moving to the graphics card",
};

/**
 * True during hires fix's second pass. Forge counts each image as two equal jobs,
 * first pass then second, so progress runs through both halves for every image.
 */
export function isRefining(job: RunningJob): boolean {
  if (!job.hires) return false;
  return Math.floor(job.progress * job.batchCount * 2) % 2 === 1;
}

/** The words shown on the progress bar while a job runs. */
export function progressLabel(job: RunningJob, now = Date.now()): string {
  if (job.stopping) return "Stopping…";
  if (job.enlarging) return "Enlarging…";
  if (isLoading(job) && job.loading) {
    const { stage, progress } = job.loading;
    return stage === "reading" && progress !== null
      ? `${LOAD_LABEL.reading} · ${Math.floor(progress * 100)}%`
      : LOAD_LABEL[stage];
  }
  if (job.phase === "waiting") return "Waiting for Forge…";
  if (job.phase === "preparing") {
    // Without word from the extension, a long wait most likely means a checkpoint load.
    return !job.loadingKnown && now - job.startedAt > 8000 ? "Loading checkpoint…" : "Preparing…";
  }
  const percent = `${Math.round(job.progress * 100)}%`;
  const done = job.etaSeconds && job.etaSeconds > 0 ? `${percent} · ${formatSeconds(job.etaSeconds)} left` : percent;
  return job.hires && isRefining(job) ? `Refining at ${job.hires.width} × ${job.hires.height} · ${done}` : done;
}
