import { describe, expect, it } from "vitest";
import { addTriggerWord, compatibility, extractLoras, hasTriggerWord, promptWithLoras } from "./loras";

describe("promptWithLoras", () => {
  it("appends one tag per LoRA with a rounded strength", () => {
    expect(
      promptWithLoras("a cat", [
        { name: "Eren-yeager", weight: 0.8 },
        { name: "style", weight: 1 / 3 },
      ]),
    ).toBe("a cat <lora:Eren-yeager:0.8> <lora:style:0.33>");
  });

  it("leaves the prompt alone without LoRAs", () => {
    expect(promptWithLoras("a cat", [])).toBe("a cat");
  });
});

describe("extractLoras", () => {
  it("turns tags into separate LoRAs and tidies the prompt", () => {
    expect(extractLoras("1boy, <lora:Eren-yeager:0.7>, smiling, <lora:detail> outdoors")).toEqual({
      prompt: "1boy, smiling, outdoors",
      loras: [
        { name: "Eren-yeager", weight: 0.7 },
        { name: "detail", weight: 1 },
      ],
    });
  });

  it("keeps line breaks and ignores extra tag parts", () => {
    expect(extractLoras("a cat\nwith a hat <lora:hat:0.5:te=1>")).toEqual({
      prompt: "a cat\nwith a hat",
      loras: [{ name: "hat", weight: 0.5 }],
    });
  });

  it("round-trips with promptWithLoras", () => {
    const loras = [{ name: "a", weight: 0.5 }];
    expect(extractLoras(promptWithLoras("x, y", loras))).toEqual({ prompt: "x, y", loras });
  });
});

describe("compatibility", () => {
  it("flags LoRAs made for another model family", () => {
    expect(compatibility("sd1", "sdxl")).toBe("mismatch");
    expect(compatibility("sdxl", "sdxl")).toBe("ok");
    expect(compatibility("unknown", "sdxl")).toBe("unknown");
    expect(compatibility(undefined, "sdxl")).toBe("unknown");
  });
});

describe("trigger words", () => {
  it("adds a word once, after a comma", () => {
    expect(addTriggerWord("a cat", "eren")).toBe("a cat, eren");
    expect(addTriggerWord("a cat, eren", "Eren")).toBe("a cat, eren");
    expect(addTriggerWord("", "eren")).toBe("eren");
    expect(addTriggerWord("a cat,", "white hair,")).toBe("a cat, white hair");
  });

  it("knows when a word is already in the prompt", () => {
    expect(hasTriggerWord("1boy, EREN, smiling", "eren")).toBe(true);
    expect(hasTriggerWord("1boy", "eren")).toBe(false);
  });
});
