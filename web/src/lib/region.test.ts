import { afterEach, describe, expect, it } from "vitest";
import {
  US_FORMAT,
  formatDate,
  formatDecimal,
  formatNumber,
  localizeDecimal,
  parseDecimal,
  setRegionalFormat,
} from "./region";

const BELGIUM = { locale: "en-BE", decimal: ",", group: ".", hour12: false };
const evening = new Date(2026, 9, 15, 15, 31);

afterEach(() => setRegionalFormat(US_FORMAT));

describe("US style, until Windows' format is known", () => {
  it("formats numbers and dates", () => {
    expect(formatNumber(2431)).toBe("2,431");
    expect(formatNumber(4.1)).toBe("4.1");
    expect(formatDate(evening, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })).toBe(
      "Oct 15, 3:31 PM",
    );
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
    expect(formatDate(evening, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })).toBe(
      "15 Oct, 15:31",
    );
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

describe("setRegionalFormat", () => {
  it("keeps the separators when the browser doesn't know the locale", () => {
    setRegionalFormat({ ...BELGIUM, locale: "not a locale!" });
    expect(formatNumber(2431.5)).toBe("2.431,5");
    expect(formatDate(evening, { month: "short", day: "numeric" })).toBe("Oct 15");
  });
});
