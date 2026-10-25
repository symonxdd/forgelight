import type { ClockStyle, DateOrder, NumberStyle } from "./preferences";

/**
 * Numbers and dates in Windows' regional format, read by the extension, unless a choice in
 * Settings > Appearance overrides it. US style until Windows' format is known. Dates stay in
 * English, like the rest of the interface; only their order and the clock follow the format.
 */
export interface RegionalFormat {
  locale: string;
  decimal: string;
  group: string;
  hour12: boolean;
  dayFirst: boolean;
}

export interface FormatChoices {
  numbers: NumberStyle;
  dates: DateOrder;
  clock: ClockStyle;
}

export const US_FORMAT: RegionalFormat = { locale: "en-US", decimal: ".", group: ",", hour12: true, dayFirst: false };
export const LIKE_WINDOWS: FormatChoices = { numbers: "windows", dates: "windows", clock: "windows" };

/** [decimal, thousands]; the space never breaks a number across two lines. */
const SEPARATORS: Record<Exclude<NumberStyle, "windows">, [string, string]> = {
  space: [",", " "],
  comma: [",", "."],
  dot: [".", ","],
};

// "Thu, 15 Oct" and "Oct 15"; en-GB stands in where a browser lacks en-BE.
const DAY_FIRST = Intl.DateTimeFormat.supportedLocalesOf("en-BE").length ? "en-BE" : "en-GB";
const MONTH_FIRST = "en-US";

interface Resolved {
  decimal: string;
  group: string;
  hour12: boolean;
  dateLocale: string;
}

function resolve(windows: RegionalFormat, choices: FormatChoices): Resolved {
  const [decimal, group] =
    choices.numbers === "windows" ? [windows.decimal, windows.group] : SEPARATORS[choices.numbers];
  const dayFirst = choices.dates === "windows" ? windows.dayFirst : choices.dates === "day";
  return {
    decimal,
    group,
    hour12: choices.clock === "windows" ? windows.hour12 : choices.clock === "12",
    dateLocale: dayFirst ? DAY_FIRST : MONTH_FIRST,
  };
}

let windows = US_FORMAT;
let choices = LIKE_WINDOWS;
let current = resolve(windows, choices);

export function setRegionalFormat(format: RegionalFormat): void {
  windows = format;
  current = resolve(windows, choices);
}

export function setFormatChoices(next: FormatChoices): void {
  choices = next;
  current = resolve(windows, choices);
}

/** Asked once before the page first draws, so nothing switches format after it shows. */
export async function loadRegionalFormat(): Promise<void> {
  try {
    const response = await fetch("/forgelight/api/region", { signal: AbortSignal.timeout(2000) });
    if (response.ok) setRegionalFormat({ ...US_FORMAT, ...((await response.json()) as Partial<RegionalFormat>) });
  } catch {
    // Forge isn't answering; US style until the next load.
  }
}

function number(value: number, maxDecimals: number, format: Resolved): string {
  const us = value.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
  return us.replace(/[.,]/g, (c) => (c === "." ? format.decimal : format.group));
}

function date(value: Date, options: Intl.DateTimeFormatOptions, format: Resolved): string {
  const clock = options.hour === undefined ? options : { ...options, hour12: format.hour12 };
  return value.toLocaleString(format.dateLocale, clock);
}

/** "2.431", "4,1": rounded to at most `maxDecimals` places, with the chosen separators. */
export function formatNumber(value: number, maxDecimals = 2): string {
  return number(value, maxDecimals, current);
}

/** For a number field: a fixed number of decimals and no thousands separator, "0,35". */
export function formatDecimal(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", current.decimal);
}

/** A typed number, where "4,5" and "4.5" both mean four and a half. */
export function parseDecimal(text: string): number {
  return Number(text.trim().replace(",", "."));
}

/** A plain decimal kept as text, such as a value from Forge's saved settings: "0.35" becomes "0,35". */
export function localizeDecimal(text: string): string {
  return /^-?\d+\.\d+$/.test(text) ? text.replace(".", current.decimal) : text;
}

/** A date, or a date and time: "Thu, 15 Oct" or "15 Oct, 15:31". */
export function formatDate(value: Date, options: Intl.DateTimeFormatOptions): string {
  return date(value, options, current);
}

/** What "Like Windows" gives on this computer, for Settings: "1.234,5", "Thu, 15 Oct", "15:31". */
export function windowsExamples(sample: Date): { number: string; date: string; time: string } {
  const format = resolve(windows, LIKE_WINDOWS);
  return {
    number: number(1234.5, 1, format),
    date: date(sample, { weekday: "short", month: "short", day: "numeric" }, format),
    time: date(sample, { hour: "numeric", minute: "2-digit" }, format),
  };
}
