import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Hint } from "../Hint";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  autoFocus?: boolean;
}

/** A password field with an eye button that shows or hides what was typed. */
export function PasswordInput({ id, value, onChange, autoComplete, autoFocus = false }: PasswordInputProps) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative flex">
      <input
        id={id}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-line bg-canvas pr-10 pl-3 text-[13.5px] text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-accent/80 focus:outline-none"
      />
      <Hint label={shown ? "Hide password" : "Show password"}>
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute inset-y-0 right-1 my-auto grid size-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
        >
          {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </Hint>
    </span>
  );
}
