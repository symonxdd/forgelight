import { ArrowRight, BookOpen, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { findTopic } from "../../lib/guide";
import { useGuide } from "../../stores/guide";
import { useView } from "../../stores/view";
import { TopicCard } from "./TopicCard";

/**
 * A guide topic in a panel at the right edge, opened from an info icon. The screen behind
 * stays usable, so a setting can be changed while reading about it. Esc or ✕ closes it.
 */
export function GuidePeek() {
  const peek = useGuide((s) => s.peek);
  const openPeek = useGuide((s) => s.openPeek);
  const closePeek = useGuide((s) => s.closePeek);
  const panel = useRef<HTMLElement>(null);
  const found = peek ? findTopic(peek) : null;

  useEffect(() => {
    if (!peek) return;
    panel.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      // A menu opened on top gets the Escape first.
      if (event.key !== "Escape" || document.querySelector("[data-radix-popper-content-wrapper]")) return;
      closePeek();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [peek, closePeek]);

  if (!peek || !found) return null;
  const { chapter, topic } = found;

  return (
    <aside
      ref={panel}
      tabIndex={-1}
      data-guide-peek
      aria-label={`Guide: ${topic.title}`}
      className="fixed top-12 right-0 bottom-0 z-40 flex w-[min(26rem,100vw)] flex-col border-l border-line bg-canvas shadow-2xl shadow-black/30 outline-none motion-safe:animate-[peek-in_140ms_ease-out]"
    >
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        <BookOpen className="size-4 text-accent" aria-hidden />
        <span className="text-[13px] font-medium text-fg-strong">Guide</span>
        <span className="truncate text-[13px] text-faint">{chapter.title}</span>
        <button
          type="button"
          onClick={closePeek}
          aria-label="Close the guide panel"
          className="-mr-1.5 ml-auto grid size-7 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg-strong"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      {/* Keyed by topic, so a Related link starts the new topic at the top. */}
      <div key={peek} className="min-h-0 flex-1 overflow-y-auto p-4">
        <TopicCard topic={topic} anchor={false} onOpenTopic={openPeek} />
      </div>
      <footer className="shrink-0 border-t border-line p-3">
        <button
          type="button"
          onClick={() => {
            closePeek();
            useView.getState().setView("guide");
            useGuide.getState().open(peek);
          }}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-line text-[13px] text-fg hover:border-line-strong hover:text-fg-strong"
        >
          Open in Guide
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </footer>
    </aside>
  );
}
