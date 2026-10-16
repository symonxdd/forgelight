import { describe, expect, it } from "vitest";
import { checkpointLabel, findCheckpoint } from "./checkpoints";

const checkpoints = [
  {
    title: "animeModel_v2.safetensors [f116b0c78f]",
    model_name: "animeModel_v2",
    hash: "f116b0c78f",
    sha256: null,
    filename: "C:\\forge\\models\\Stable-diffusion\\animeModel_v2.safetensors",
  },
  {
    title: "sub\\photoModel.safetensors",
    model_name: "sub_photoModel",
    hash: null,
    sha256: null,
    filename: "C:\\forge\\models\\Stable-diffusion\\sub\\photoModel.safetensors",
  },
];

describe("findCheckpoint", () => {
  it("matches the full title, the title without hash, the file name and the model name", () => {
    expect(findCheckpoint(checkpoints, "animeModel_v2.safetensors [f116b0c78f]")).toBe(checkpoints[0]);
    expect(findCheckpoint(checkpoints, "animeModel_v2.safetensors")).toBe(checkpoints[0]);
    expect(findCheckpoint(checkpoints, "photoModel.safetensors")).toBe(checkpoints[1]);
    expect(findCheckpoint(checkpoints, "sub_photoModel")).toBe(checkpoints[1]);
  });

  it("returns nothing for an empty or unknown setting", () => {
    expect(findCheckpoint(checkpoints, "")).toBeUndefined();
    expect(findCheckpoint(checkpoints, "missing.safetensors")).toBeUndefined();
  });
});

describe("checkpointLabel", () => {
  it("uses the model name when the checkpoint is known", () => {
    expect(checkpointLabel(checkpoints[0])).toBe("animeModel_v2");
  });

  it("derives a name from the setting when the checkpoint is unknown", () => {
    expect(checkpointLabel(undefined, "folder\\other_v1.safetensors [abc123]")).toBe("other_v1");
    expect(checkpointLabel(undefined, null)).toBe("No checkpoint");
  });
});
