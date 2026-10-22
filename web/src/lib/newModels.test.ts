import { describe, expect, it } from "vitest";
import { cardModels, formatSize, moveExplanation, moveNote, offerTitle, type FoundModelInfo } from "./newModels";

const found: FoundModelInfo = {
  id: "desktop/meadowXL_v20.safetensors",
  place: "desktop",
  placeLabel: "Desktop",
  file: "meadowXL_v20.safetensors",
  size: 6938040682,
  kind: "checkpoint",
  targetLabel: "Checkpoints",
  targetName: "meadowXL_v20.safetensors",
  hidden: false,
};

describe("formatSize", () => {
  it("rounds to what is worth reading", () => {
    expect(formatSize(6938040682)).toBe("6.5 GB");
    expect(formatSize(12 * 1024 ** 3)).toBe("12 GB");
    expect(formatSize(228458292)).toBe("218 MB");
    expect(formatSize(10)).toBe("1 MB");
  });
});

describe("moveExplanation", () => {
  it("says where the file goes and that it is moved, not copied", () => {
    expect(moveExplanation(found)).toBe(
      "Moves it from the Desktop into Forge's Checkpoints folder. Not a copy, so it leaves the Desktop.",
    );
    expect(moveExplanation({ ...found, place: "downloads", kind: "lora", targetLabel: "Lora" })).toBe(
      "Moves it from Downloads into Forge's Lora folder. Not a copy, so it leaves Downloads.",
    );
  });
});

describe("offerTitle", () => {
  it("names the kind and the place", () => {
    expect(offerTitle(found)).toBe("New checkpoint on the Desktop");
    expect(offerTitle({ kind: "lora", place: "downloads" })).toBe("New LoRA in Downloads");
  });
});

describe("moveNote", () => {
  it("says where the file goes and that it is not copied", () => {
    expect(moveNote(found)).toBe("Moves into Forge's Checkpoints folder. Not a copy.");
  });

  it("mentions a new name when Forge has a different file by the same name", () => {
    expect(moveNote({ ...found, targetName: "meadowXL_v20 (2).safetensors" })).toBe(
      "Moves into Forge's Checkpoints folder as meadowXL_v20 (2).safetensors, since Forge has a different file by that name. Not a copy.",
    );
  });
});

describe("cardModels", () => {
  it("leaves out hidden files and files put off for this visit", () => {
    const other = { ...found, id: "downloads/other.safetensors" };
    const hidden = { ...found, id: "downloads/hidden.safetensors", hidden: true };
    expect(cardModels([found, other, hidden], [found.id])).toEqual([other]);
  });
});
