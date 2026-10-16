import { describe, expect, it } from "vitest";
import { baseModelLabel, displayName, tidyName } from "./modelNames";

describe("tidyName", () => {
  it("splits camelCase and underscores into words", () => {
    expect(tidyName("blackPearlSDXL_v170")).toBe("Black Pearl SDXL v170");
    expect(tidyName("sashaAOTCheckpoint_potatoV9")).toBe("Sasha AOT Checkpoint Potato V9");
    expect(tidyName("jackSparrowILLBase_v40")).toBe("Jack Sparrow ILL Base v40");
  });

  it("leaves short words and version numbers alone", () => {
    expect(tidyName("tortuga_v23")).toBe("Tortuga v23");
    expect(tidyName("surveyCorpsXL_ilV190")).toBe("Survey Corps XL il V190");
  });
});

describe("displayName", () => {
  it("prefers Civitai's name and version", () => {
    expect(displayName("wai_v170", { status: "found", name: "WAI-illustrious-SDXL", version: "v17.0" })).toEqual({
      name: "WAI-illustrious-SDXL",
      detail: "v17.0",
    });
  });

  it("falls back to the tidied file name", () => {
    expect(displayName("tortuga_v23", { status: "not_found" })).toEqual({ name: "Tortuga v23" });
  });
});

describe("baseModelLabel", () => {
  it("shortens common base model names", () => {
    expect(baseModelLabel("SDXL 1.0")).toBe("SDXL");
    expect(baseModelLabel("Illustrious")).toBe("Illustrious");
    expect(baseModelLabel(undefined)).toBeUndefined();
  });
});
