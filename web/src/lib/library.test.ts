import { describe, expect, it } from "vitest";
import { dayKey, dayLabel, fileName, groupBatches, groupByDay, imageUrl, seedOf, type LibraryItem } from "./library";

function item(id: string, date: Date, infotext = ""): LibraryItem {
  return {
    id,
    width: 832,
    height: 1216,
    mtime: date.getTime() / 1000,
    bytes: 1,
    infotext,
    nsfw: false,
    favorite: false,
  };
}

const now = new Date(2026, 9, 17, 15, 0);

describe("dayLabel", () => {
  it("names today and yesterday", () => {
    expect(dayLabel(new Date(2026, 9, 17, 0, 5), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 16, 23, 59), now)).toBe("Yesterday");
  });

  it("shows older days by date, adding the year only for other years", () => {
    expect(dayLabel(new Date(2026, 9, 15), now)).toBe("Thu, Oct 15");
    expect(dayLabel(new Date(2025, 11, 31), now)).toBe("Wed, Dec 31, 2025");
  });
});

describe("dayKey", () => {
  it("pads month and day like the server does", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("groupByDay", () => {
  it("keeps order and starts a group at each new day", () => {
    const groups = groupByDay(
      [item("a", new Date(2026, 9, 17, 14)), item("b", new Date(2026, 9, 17, 9)), item("c", new Date(2026, 9, 16, 22))],
      now,
    );
    expect(groups.map((g) => g.key)).toEqual(["2026-10-17", "2026-10-16"]);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Today", ["a", "b"]],
      ["Yesterday", ["c"]],
    ]);
  });
});

describe("library items", () => {
  it("reads the seed from the settings text", () => {
    expect(seedOf(item("x", now, "a cat\nSteps: 25, Seed: 1234, Size: 832x1216"))).toBe(1234);
    expect(seedOf(item("x", now, "no settings"))).toBe(-1);
  });

  it("builds an escaped image address and a file name", () => {
    const image = item("txt2img/2026-10-16/00001 a&b.png", new Date(1000));
    expect(imageUrl(image)).toBe("/forgelight/api/library/image?id=txt2img%2F2026-10-16%2F00001%20a%26b.png&v=1");
    expect(fileName(image)).toBe("00001 a&b.png");
  });
});

describe("groupBatches", () => {
  const at = (minutes: number) => new Date(2026, 9, 17, 12, minutes);
  const settings = (seed: number, prompt = "a cat") => `${prompt}
Steps: 25, Seed: ${seed}, Size: 832x1216`;

  it("stacks neighbors whose settings differ only in the seed", () => {
    const batches = groupBatches([
      item("c", at(30), settings(3)),
      item("b", at(29), settings(2)),
      item("a", at(28), settings(1)),
      item("x", at(20), settings(9, "a dog")),
    ]);
    expect(batches.map((b) => b.items.map((i) => i.id))).toEqual([["c", "b", "a"], ["x"]]);
    expect(batches[0]?.key).toBe("c");
  });

  it("splits the same settings after a long break, and never groups images without settings", () => {
    const batches = groupBatches([
      item("b", at(50), settings(2)),
      item("a", at(10), settings(1)),
      item("n2", at(9)),
      item("n1", at(9)),
    ]);
    expect(batches.map((b) => b.items.length)).toEqual([1, 1, 1, 1]);
  });
});
