import { describe, expect, it } from "vitest";
import type { LoadingState } from "../api/forgelight";
import type { Job } from "../stores/session";
import { barFraction, barPulses, nextLoadStep, progressLabel } from "./progress";

type RunningJob = Extract<Job, { status: "running" }>;

const job: RunningJob = {
  status: "running",
  taskId: "task(x)",
  phase: "preparing",
  progress: 0,
  etaSeconds: null,
  previewUrl: null,
  startedAt: 0,
  width: 832,
  height: 1216,
  batchCount: 1,
  hires: null,
  loading: null,
  loadingKnown: true,
  stopping: false,
  enlarging: false,
};

const report = (changes: Partial<LoadingState>): LoadingState => ({
  pending: false,
  checkpoint: "model.safetensors",
  stage: null,
  progress: null,
  ...changes,
});

describe("nextLoadStep", () => {
  it("stays null for an ordinary generation, even while parts move to the graphics card", () => {
    expect(nextLoadStep(null, report({}))).toBeNull();
    expect(nextLoadStep(null, report({ stage: "moving" }))).toBeNull();
  });

  it("starts as pending when a load is due", () => {
    expect(nextLoadStep(null, report({ pending: true }))).toEqual({ stage: "pending", progress: null });
  });

  it("follows the steps of a load, with real progress only for the checkpoint file", () => {
    const reading = nextLoadStep(null, report({ pending: true, stage: "reading", progress: 0.4, isCheckpoint: true }));
    expect(reading).toEqual({ stage: "reading", progress: 0.4 });
    const extra = nextLoadStep(
      reading,
      report({ pending: true, stage: "reading", progress: 0.9, isCheckpoint: false }),
    );
    expect(extra).toEqual({ stage: "reading", progress: null });
    const moving = nextLoadStep(extra, report({ stage: "moving" }));
    expect(moving).toEqual({ stage: "moving", progress: null });
  });

  it("keeps the last step on screen between steps", () => {
    const building = { stage: "building" as const, progress: 0.5 };
    expect(nextLoadStep(building, report({}))).toBe(building);
  });
});

describe("loading progress", () => {
  it("fills the bar from reading the file, then setting up the model", () => {
    expect(barFraction({ ...job, loading: { stage: "reading", progress: 0.5 } })).toBeCloseTo(0.45);
    expect(barFraction({ ...job, loading: { stage: "building", progress: 0.5 } })).toBeCloseTo(0.95);
  });

  it("labels the step, with a percentage while reading", () => {
    expect(progressLabel({ ...job, loading: { stage: "reading", progress: 0.437 } })).toBe(
      "Loading checkpoint · reading from disk · 43%",
    );
    expect(progressLabel({ ...job, loading: { stage: "moving", progress: null } })).toBe(
      "Loading checkpoint · moving to the graphics card",
    );
  });

  it("pulses when the step has no measurable progress", () => {
    expect(barPulses({ ...job, loading: { stage: "moving", progress: null } })).toBe(true);
    expect(barPulses({ ...job, loading: { stage: "reading", progress: 0.2 } })).toBe(false);
  });

  it("hands over to the image's own progress once sampling starts", () => {
    const sampling: RunningJob = {
      ...job,
      phase: "sampling",
      progress: 0.3,
      loading: { stage: "moving", progress: null },
    };
    expect(barFraction(sampling)).toBe(0.3);
    expect(progressLabel(sampling)).toBe("30%");
  });

  it("guesses a checkpoint load after a long wait only without word from the extension", () => {
    expect(progressLabel({ ...job, loadingKnown: false }, 9000)).toBe("Loading checkpoint…");
    expect(progressLabel(job, 9000)).toBe("Preparing…");
  });
});
