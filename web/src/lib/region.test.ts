import { afterEach, describe, expect, it } from "vitest";
import {
  LIKE_WINDOWS,
  US_FORMAT,
  formatDate,
  formatDecimal,
  formatNumber,
  localizeDecimal,
  parseDecimal,
  setFormatChoices,
  setRegionalFormat,
  windowsExamples,
} from "./region";

const BELGIUM = { locale: "en-BE", decimal: ",", group: ".", hour12: false, dayFirst: true };
const evening = new Date(2026, 9, 15, 15, 31);
const dayAndTime = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } as const;

afterEach(() => {
  setRegionalFormat(US_FORMAT);
  setFormatChoices(LIKE_WINDOWS);
});

describe("US style, until Windows' format is known", () => {
  it("formats numbers and dates", () => {
    expect(formatNumber(2431)).toBe("2,431");
    expect(formatNumber(4.1)).toBe("4.1");
    expect(formatDate(evening, dayAndTime)).toBe("Oct 15, 3:31 PM");
  });
});

describe("Windows set to English (Belgium)", () => {
  it("swaps the separators", () => {
    setRegionalFormat(BELGIUM);
    expect(formatNumber(2431)).toBe("2.431");
    expect(formatNumber(4.1)).toBe("4,1");
    expect(formatNumber(1234567.891)).toBe("1.234.567,89");
    expect(formatDecimal(0.35, 2)).toBe("0,35");
    expect(formatDecimal(7, 1)).toBe("7,0");
    expect(localizeDecimal("0.35")).toBe("0,35");
  });

  it("writes dates day first, with a 24-hour clock", () => {
    setRegionalFormat(BELGIUM);
    expect(formatDate(evening, { weekday: "short", month: "short", day: "numeric" })).toBe("Thu, 15 Oct");
    expect(formatDate(evening, dayAndTime)).toBe("15 Oct, 15:31");
  });

  it("keeps dates in English whatever Windows' language", () => {
    setRegionalFormat({ ...BELGIUM, locale: "nl-BE" });
    expect(formatDate(evening, { weekday: "short", month: "short", day: "numeric" })).toBe("Thu, 15 Oct");
  });
});

describe("choices in Settings", () => {
  it("override Windows' separators", () => {
    setRegionalFormat(BELGIUM);
    setFormatChoices({ ...LIKE_WINDOWS, numbers: "space" });
    expect(formatNumber(1234.5)).toBe("1 234,5");
    setFormatChoices({ ...LIKE_WINDOWS, numbers: "dot" });
    expect(formatNumber(1234.5)).toBe("1,234.5");
    expect(formatDecimal(0.35, 2)).toBe("0.35");
    setFormatChoices({ ...LIKE_WINDOWS, numbers: "comma" });
    expect(formatNumber(1234.5)).toBe("1.234,5");
  });

  it("override the date order and the clock", () => {
    setRegionalFormat(BELGIUM);
    setFormatChoices({ numbers: "windows", dates: "month", clock: "12" });
    expect(formatDate(evening, dayAndTime)).toBe("Oct 15, 3:31 PM");
    setRegionalFormat(US_FORMAT);
    setFormatChoices({ numbers: "windows", dates: "day", clock: "24" });
    expect(formatDate(evening, dayAndTime)).toBe("15 Oct, 15:31");
  });

  it("leave the Like Windows examples alone", () => {
    setRegionalFormat(BELGIUM);
    setFormatChoices({ numbers: "dot", dates: "month", clock: "12" });
    expect(windowsExamples(evening)).toEqual({ number: "1.234,5", date: "Thu, 15 Oct", time: "15:31" });
  });
});

describe("parseDecimal", () => {
  it("takes a comma or a dot", () => {
    expect(parseDecimal("4,5")).toBe(4.5);
    expect(parseDecimal(" 4.5 ")).toBe(4.5);
    expect(parseDecimal("abc")).toBeNaN();
  });
});

describe("localizeDecimal", () => {
  it("leaves anything but a plain decimal alone", () => {
    setRegionalFormat(BELGIUM);
    expect(localizeDecimal("f2.0.1v1.10.1")).toBe("f2.0.1v1.10.1");
    expect(localizeDecimal("832x1216")).toBe("832x1216");
    expect(localizeDecimal("25")).toBe("25");
  });
});
