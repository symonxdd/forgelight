import { describe, expect, it } from "vitest";
import type { LibraryItem } from "./library";
import { findJobResults, matchStoredImages, type PendingJob, type StoredImage } from "./sessionMemory";

const START = new Date(2026, 9, 20, 12, 0).getTime();

function item(id: string, secondsAfterStart: number, infotext: string): LibraryItem {
  return {
    id,
    width: 832,
    height: 1216,
    mtime: (START + secondsAfterStart * 1000) / 1000,
    bytes: 1,
    infotext,
    nsfw: false,
    favorite: false,
  };
}

const settings = (prompt: string, seed: number) => `${prompt}\nNegative prompt: blurry\nSteps: 25, Seed: ${seed}`;

const job: PendingJob = {
  taskId: "task(abc)",
  startedAt: START,
  width: 832,
  height: 1216,
  batchCount: 2,
  hires: null,
  prompt: "a lake <lora:soft:0.8>",
};

describe("findJobResults", () => {
  it("returns the job's images made since it started, oldest first", () => {
    const items = [
      item("txt2img/c.png", 40, settings("a lake <lora:soft:0.8>", 2)),
      item("txt2img/b.png", 20, settings("a lake <lora:soft:0.8>", 1)),
      item("txt2img/a.png", -60, settings("a lake <lora:soft:0.8>", 0)),
    ];
    expect(findJobResults(items, job).map((i) => i.id)).toEqual(["txt2img/b.png", "txt2img/c.png"]);
  });

  it("skips images with another prompt made meanwhile", () => {
    const items = [
      item("txt2img/other.png", 50, settings("a castle", 9)),
      item("txt2img/c.png", 40, settings("a lake <lora:soft:0.8>", 2)),
      item("txt2img/b.png", 20, settings("a lake <lora:soft:0.8>", 1)),
    ];
    expect(findJobResults(items, job).map((i) => i.id)).toEqual(["txt2img/b.png", "txt2img/c.png"]);
  });

  it("falls back to the newest images when none carry the prompt", () => {
    const items = [item("txt2img/x.png", 30, settings("rewritten", 1)), item("txt2img/old.png", -60, "")];
    expect(findJobResults(items, job).map((i) => i.id)).toEqual(["txt2img/x.png"]);
  });

  it("finds nothing when no image was saved after the start", () => {
    expect(findJobResults([item("txt2img/old.png", -60, settings("a lake <lora:soft:0.8>", 0))], job)).toEqual([]);
  });
});

describe("matchStoredImages", () => {
  const stored = (id: string, infotext: string): StoredImage => ({
    id,
    width: 832,
    height: 1216,
    seed: 1,
    infotext,
    createdAt: START,
  });

  it("pairs images with files by their settings, each file once", () => {
    const same = settings("a lake", 5);
    const items = [item("txt2img/2.png", 20, same), item("txt2img/1.png", 10, same), item("txt2img/0.png", 5, "x")];
    const pairs = matchStoredImages([stored("b", same), stored("a", same)], items);
    expect(pairs.map((p) => [p.stored.id, p.item.id])).toEqual([
      ["b", "txt2img/2.png"],
      ["a", "txt2img/1.png"],
    ]);
  });

  it("leaves out images without a saved file or without settings", () => {
    const pairs = matchStoredImages(
      [stored("gone", settings("deleted", 3)), stored("bare", "")],
      [item("t/1.png", 1, "")],
    );
    expect(pairs).toEqual([]);
  });
});
