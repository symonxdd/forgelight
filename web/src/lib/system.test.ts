import { afterEach, describe, expect, it } from "vitest";
import type { SystemOverview } from "../api/system";
import { US_FORMAT, setRegionalFormat } from "./region";
import { formatBytes, formatGb, gpuLabel, share, statsLines, systemReport, versionLine } from "./system";

const GB = 1024 ** 3;
const VERSIONS = {
  forge: "dfdcbab",
  forgelight: "1.4.0",
  python: "3.10.6",
  torch: "2.3.1",
  cuda: "12.1",
  windows: "Windows 11",
};

afterEach(() => setRegionalFormat(US_FORMAT));

describe("sizes", () => {
  it("writes memory in GB", () => {
    expect(formatGb(4.1 * GB)).toBe("4.1 GB");
    expect(formatGb(6 * GB)).toBe("6.0 GB");
    expect(formatGb(476.4 * GB)).toBe("476 GB");
  });

  it("writes small files in MB", () => {
    expect(formatBytes(14794830)).toBe("14 MB");
    expect(formatBytes(1000)).toBe("1 MB");
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(18.4 * GB)).toBe("18.4 GB");
  });

  it("follows the number format", () => {
    setRegionalFormat({ locale: "en-BE", decimal: ",", group: ".", hour12: false, dayFirst: true });
    expect(formatGb(4.1 * GB)).toBe("4,1 GB");
  });

  it("keeps a bar's share between 0 and 1", () => {
    expect(share(3, 4)).toBe(0.75);
    expect(share(5, 4)).toBe(1);
    expect(share(1, 0)).toBe(0);
  });
});

describe("gpuLabel", () => {
  it("drops the maker's prefixes and marks a notebook", () => {
    expect(gpuLabel("NVIDIA GeForce RTX 2060", true)).toBe("RTX 2060 (notebook)");
    expect(gpuLabel("NVIDIA GeForce RTX 3060", false)).toBe("RTX 3060");
    expect(gpuLabel("NVIDIA GeForce RTX 3060 Laptop GPU", true)).toBe("RTX 3060 Laptop GPU");
    expect(gpuLabel(null, true)).toBeNull();
  });
});

describe("versions", () => {
  it("lists what is known", () => {
    expect(versionLine(VERSIONS)).toBe("Forge dfdcbab · Python 3.10.6 · PyTorch 2.3.1 · CUDA 12.1 · Windows 11");
    expect(versionLine({ ...VERSIONS, forge: null, cuda: null })).toBe("Python 3.10.6 · PyTorch 2.3.1 · Windows 11");
  });

  it("makes a report to paste", () => {
    const system = {
      gpu: "NVIDIA GeForce RTX 2060",
      vramTotal: 6 * GB,
      ramTotal: 16 * GB,
      portable: true,
      versions: VERSIONS,
    } as SystemOverview;
    expect(systemReport(system)).toBe(
      [
        "Forgelight 1.4.0",
        "Forge dfdcbab · Python 3.10.6 · PyTorch 2.3.1 · CUDA 12.1 · Windows 11",
        "RTX 2060 (notebook), 6.0 GB VRAM",
        "16.0 GB RAM",
      ].join("\n"),
    );
  });
});

describe("statsLines", () => {
  it("shows the time and the peak", () => {
    expect(statsLines({ seconds: 14.23, images: 1, peakVram: 5.6 * GB, totalVram: 6 * GB })).toEqual([
      ["Time", "14.2 s"],
      ["Peak VRAM", "5.6 of 6.0 GB"],
    ]);
  });

  it("names a batch and leaves out an unknown peak", () => {
    expect(statsLines({ seconds: 28.4, images: 2, peakVram: null, totalVram: null })).toEqual([
      ["Time", "28.4 s for 2 images"],
    ]);
  });
});
