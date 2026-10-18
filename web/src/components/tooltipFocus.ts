import { useRef, useState, type FocusEvent } from "react";

/**
 * Open state for a tooltip that opens on focus only when the focus came from the keyboard.
 * Otherwise a clicked link keeps its tooltip open after returning from the tab it opened:
 * the browser gives focus back to the link, with no pointer near to close it again.
 *
 * Spread `root` on Tooltip.Root and `trigger` on Tooltip.Trigger. Focus events can't be
 * cancelled, so the trigger's focus handler (which runs just before the tooltip's own)
 * marks the open request that follows as one to ignore.
 */
export function useTooltipOpen() {
  const [open, setOpen] = useState(false);
  const ignoreNextOpen = useRef(false);
  return {
    root: {
      open,
      onOpenChange: (next: boolean) => {
        if (next && ignoreNextOpen.current) {
          ignoreNextOpen.current = false;
          return;
        }
        setOpen(next);
      },
    },
    trigger: {
      onFocus: (event: FocusEvent<HTMLElement>) => {
        ignoreNextOpen.current = !event.currentTarget.matches(":focus-visible");
        // The tooltip asks to open right away; anything later is a separate request.
        queueMicrotask(() => {
          ignoreNextOpen.current = false;
        });
      },
    },
  };
}
