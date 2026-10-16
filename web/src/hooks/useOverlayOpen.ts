import { useEffect, useState } from "react";

const OVERLAY = "[data-radix-popper-content-wrapper]";

/**
 * True while a menu or dropdown is open; tooltips don't count. Radix renders these
 * into the end of <body>, so watching body's direct children is enough.
 */
export function useOverlayOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const update = () =>
      setOpen(
        [...document.body.querySelectorAll(`:scope > ${OVERLAY}`)].some((el) => !el.querySelector("[role='tooltip']")),
      );
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true });
    update();
    return () => observer.disconnect();
  }, []);
  return open;
}
