import type { Job } from "../stores/session";
import { formatSeconds } from "./format";

type RunningJob = Extract<Job, { status: "running" }>;

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
  if (job.phase === "waiting") return "Waiting for Forge…";
  if (job.phase === "preparing") {
    // The first generation after switching checkpoints loads it from disk, which can take minutes.
    return now - job.startedAt > 8000 ? "Loading checkpoint…" : "Preparing…";
  }
  const percent = `${Math.round(job.progress * 100)}%`;
  const done = job.etaSeconds && job.etaSeconds > 0 ? `${percent} · ${formatSeconds(job.etaSeconds)} left` : percent;
  return job.hires && isRefining(job) ? `Refining at ${job.hires.width} × ${job.hires.height} · ${done}` : done;
}
