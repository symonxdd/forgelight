import { Tooltip } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";

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
  if (!tooltip) return button;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          sideOffset={6}
          className="rounded-md bg-fg-strong px-2 py-1 text-xs text-canvas shadow-sm select-none"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
