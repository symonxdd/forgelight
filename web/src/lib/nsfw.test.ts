import { describe, expect, it } from "vitest";
import { looksNsfw } from "./nsfw";

describe("looksNsfw", () => {
  it("spots adult words in the prompt, with weights and underscores", () => {
    expect(looksNsfw("1girl, (nude:1.2), beach\nSteps: 20")).toBe(true);
    expect(looksNsfw("rating_explicit, 1girl")).toBe(true);
  });

  it("ignores the negative prompt and words that merely contain a match", () => {
    expect(looksNsfw("a lighthouse at dusk\nNegative prompt: nsfw, nude\nSteps: 20")).toBe(false);
    expect(looksNsfw("Sussex countryside, cumulus clouds, analog film")).toBe(false);
  });
});
