export const PIN_MIN = 4;
export const PIN_MAX = 12;

/** True when both fields hold the same PIN of a valid length. */
export function pinReady(pin: string, repeat: string): boolean {
  return pin.length >= PIN_MIN && pin.length <= PIN_MAX && pin === repeat;
}

/** What may be typed into a PIN field: digits only, at most PIN_MAX of them. */
export function pinDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, PIN_MAX);
}
