import type { ComponentPropsWithRef, ReactNode } from "react";
import { Hint } from "./Hint";

interface IconButtonProps extends ComponentPropsWithRef<"button"> {
  label: string;
  children: ReactNode;
  /** Off for icons whose meaning is obvious, like the settings gear. */
  tooltip?: boolean;
}

/** A square icon-only button. Its label is the accessible name and, by default, its tooltip. */
export function IconButton({ label, children, className = "", tooltip = true, ...props }: IconButtonProps) {
  const button = (
    <button
      type="button"
      aria-label={label}
      className={`grid size-8 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg-strong data-[state=open]:bg-raised data-[state=open]:text-fg-strong ${className}`}
      {...props}
    >
      {children}
    </button>
  );
  // The same tooltip as everywhere else, which also shows above the Library's image view.
  return tooltip ? <Hint label={label}>{button}</Hint> : button;
}
