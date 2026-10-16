import { Tooltip } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

interface HintProps {
  /** Nothing is shown when empty, so a hint can depend on state. */
  label: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * The short tooltip used across Forgelight for buttons and controls, shown instantly.
 * Never use the browser's own title attribute instead.
 */
export function Hint({ label, children, side = "bottom" }: HintProps) {
  if (label === null || label === undefined || label === "") return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-64 rounded-md bg-fg-strong px-2 py-1 text-xs text-canvas shadow-sm select-none"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
