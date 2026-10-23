import { PIN_MAX, PIN_MIN, pinDigits } from "../../lib/pin";
import { PasswordInput } from "./PasswordInput";

/** A new PIN, typed twice. Only digits can be typed. */
export function PinFields({
  pin,
  repeat,
  onPin,
  onRepeat,
  autoFocus = false,
}: {
  pin: string;
  repeat: string;
  onPin: (pin: string) => void;
  onRepeat: (repeat: string) => void;
  autoFocus?: boolean;
}) {
  const tooShort = pin.length > 0 && pin.length < PIN_MIN;
  const mismatch = repeat.length > 0 && repeat !== pin;
  return (
    <>
      <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
        PIN
        <PasswordInput
          id="private-pin"
          autoComplete="new-password"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={pin}
          onChange={(value) => onPin(pinDigits(value))}
        />
        <span className={`text-[12px] ${tooShort ? "text-bad" : "text-faint"}`}>
          {PIN_MIN} to {PIN_MAX} digits
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-[12.5px] text-fg">
        Repeat PIN
        <PasswordInput
          id="private-pin-repeat"
          autoComplete="new-password"
          inputMode="numeric"
          value={repeat}
          onChange={(value) => onRepeat(pinDigits(value))}
        />
        {mismatch && <span className="text-[12px] text-bad">The PINs don't match yet</span>}
      </label>
    </>
  );
}
