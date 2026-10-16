import { useEffect } from "react";
import { generate, interrupt, isRunning, skip } from "../stores/generation";
import { useSession } from "../stores/session";
import { toggleFullscreen, useViewer } from "../stores/viewer";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** Viewer keys only apply when nothing else (a field, a slider, a menu) has the keyboard. */
function viewerHasKeyboard(target: EventTarget | null): boolean {
  return (
    target === document.body || (target instanceof HTMLElement && target.closest("[data-shortcuts='viewer']") !== null)
  );
}

/** A Radix menu or dropdown is open; Escape belongs to it. */
function menuOpen(): boolean {
  return document.querySelector("[data-radix-popper-content-wrapper]") !== null;
}

/**
 * Same generation keys as the classic Forge page: Ctrl+Enter generates,
 * Alt+Enter skips, Escape stops. Plus viewer keys: arrows, F, 0, 1, I, +, -.
 */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void generate();
        return;
      }
      if (event.key === "Enter" && event.altKey) {
        event.preventDefault();
        void skip();
        return;
      }
      if (event.key === "Escape" && !menuOpen()) {
        const viewer = useViewer.getState();
        if (viewer.infoOpen) viewer.setInfoOpen(false);
        else if (isRunning()) void interrupt();
        return;
      }

      if (isTyping(event.target) || !viewerHasKeyboard(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const viewer = useViewer.getState();
      const session = useSession.getState();
      const actions: Record<string, () => void> = {
        ArrowLeft: () => session.selectRelative(-1),
        ArrowUp: () => session.selectRelative(-1),
        ArrowRight: () => session.selectRelative(1),
        ArrowDown: () => session.selectRelative(1),
        f: toggleFullscreen,
        "0": viewer.fit,
        "1": viewer.actualSize,
        i: () => viewer.setInfoOpen(!viewer.infoOpen),
        "+": () => viewer.zoomBy(1.25),
        "=": () => viewer.zoomBy(1.25),
        "-": () => viewer.zoomBy(0.8),
      };
      const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
