/**
 * Numbers and dates in Windows' regional format, read by the extension, so "2.431" and
 * "4,1 GB" look the way they do in the rest of Windows. US style until it is known.
 */
export interface RegionalFormat {
  locale: string;
  decimal: string;
  group: string;
  hour12: boolean;
}

export const US_FORMAT: RegionalFormat = { locale: "en-US", decimal: ".", group: ",", hour12: true };

let current = US_FORMAT;

export function setRegionalFormat(format: RegionalFormat): void {
  try {
    // Throws for a locale name the browser can't use; the separators still apply.
    new Intl.DateTimeFormat(format.locale);
    current = format;
  } catch {
    current = { ...format, locale: US_FORMAT.locale };
  }
}

/** Asked once before the page first draws, so nothing switches format after it shows. */
export async function loadRegionalFormat(): Promise<void> {
  try {
    const response = await fetch("/forgelight/api/region", { signal: AbortSignal.timeout(2000) });
    if (response.ok) setRegionalFormat((await response.json()) as RegionalFormat);
  } catch {
    // Forge isn't answering; US style until the next load.
  }
}

function separators(usText: string): string {
  return usText.replace(/[.,]/g, (c) => (c === "." ? current.decimal : current.group));
}

/** "2.431", "4,1": rounded to at most `maxDecimals` places, with Windows' separators. */
export function formatNumber(value: number, maxDecimals = 2): string {
  return separators(value.toLocaleString("en-US", { maximumFractionDigits: maxDecimals }));
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

/** A date, or a date and time, in Windows' format: "Thu, 15 Oct" or "15 Oct, 15:31". */
export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  const clock = options.hour === undefined ? options : { ...options, hour12: current.hour12 };
  return date.toLocaleString(current.locale, clock);
}
