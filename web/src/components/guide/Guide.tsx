import { useEffect, useRef } from "react";
import { CHAPTERS, GLOSSARY_ID, type GuideChapter } from "../../lib/guide";
import { useGuide } from "../../stores/guide";
import { ChapterView } from "./ChapterView";
import { GlossaryView } from "./GlossaryView";
import { GuideSidebar } from "./GuideSidebar";
import { ReadingProgress } from "./ReadingProgress";
import { SearchResults } from "./SearchResults";

/** How long a topic opened from a link keeps its outline, to show where it is. */
const HIGHLIGHT_MS = 1600;
/** A topic counts as being read once its card's top passes this far below the top edge. */
const READING_LINE = 120;
/** Longest a smooth jump may take before the reading marker follows the scroll again. */
const JUMP_MS = 1200;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The topic whose card has most recently passed the reading line. */
function topicInView(scroller: HTMLElement, chapter: GuideChapter): string | null {
  const max = scroller.scrollHeight - scroller.clientHeight;
  // At the very end, the last topic may never reach the line; it is the one being read.
  if (max > 0 && scroller.scrollTop >= max - 2) return chapter.topics.at(-1)?.id ?? null;
  const line = scroller.getBoundingClientRect().top + READING_LINE;
  let current = chapter.topics[0]?.id ?? null;
  for (const topic of chapter.topics) {
    const card = document.getElementById(`topic-${topic.id}`);
    if (card && card.getBoundingClientRect().top <= line) current = topic.id;
  }
  return current;
}

/** Short explanations of Forge, models and settings, as chapters with a search. */
export function Guide() {
  const page = useGuide((s) => s.page);
  const query = useGuide((s) => s.query);
  const focusTopic = useGuide((s) => s.focusTopic);
  const markFocused = useGuide((s) => s.markFocused);
  const highlighted = useGuide((s) => s.highlighted);
  const clearHighlight = useGuide((s) => s.clearHighlight);
  const main = useRef<HTMLElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  // While a jump scrolls, the clicked topic stays marked instead of each one passed on the way.
  const jumping = useRef(false);
  const jumpTimer = useRef(0);
  const searching = query.trim() !== "";
  const shown = useRef({ page, searching });
  const chapter = searching ? undefined : CHAPTERS.find((c) => c.id === page);

  // Keep the chapter in the address, so a reload opens it again.
  useEffect(() => {
    if (!window.location.hash.startsWith(`#guide/${page}`)) window.history.replaceState(null, "", `#guide/${page}`);
  }, [page]);

  // A topic link glides to its card within a chapter, and jumps when the chapter changes.
  // Any other new page or search starts at the top.
  useEffect(() => {
    const changed = shown.current.page !== page || shown.current.searching !== searching;
    shown.current = { page, searching };
    if (focusTopic) {
      jumping.current = true;
      const smooth = !changed && !reducedMotion();
      document
        .getElementById(`topic-${focusTopic}`)
        ?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
      markFocused(focusTopic);
      // Normally the end of the scroll releases the marker; this covers a jump that never scrolls.
      window.clearTimeout(jumpTimer.current);
      jumpTimer.current = window.setTimeout(() => (jumping.current = false), JUMP_MS);
      return;
    }
    if (changed) main.current?.scrollTo({ top: 0 });
  }, [page, searching, focusTopic, markFocused]);

  useEffect(() => () => window.clearTimeout(jumpTimer.current), []);

  useEffect(() => {
    if (!highlighted) return;
    const timer = window.setTimeout(clearHighlight, HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlighted, clearHighlight]);

  // Reading progress and the topic being read, updated once per frame while scrolling.
  useEffect(() => {
    const scroller = main.current;
    if (!scroller || !chapter) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const percent = Math.round((max > 0 ? scroller.scrollTop / max : 1) * 100);
      const bar = progress.current;
      if (bar) {
        bar.querySelector<HTMLElement>("[data-fill]")?.style.setProperty("width", `${percent}%`);
        const label = bar.querySelector<HTMLElement>("[data-percent]");
        if (label) label.textContent = `${percent}%`;
        bar.setAttribute("aria-valuenow", String(percent));
      }
      if (jumping.current) return;
      const topic = topicInView(scroller, chapter);
      if (useGuide.getState().activeTopic !== topic) useGuide.getState().setActiveTopic(topic);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    const onScrollEnd = () => {
      jumping.current = false;
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    // A wider or narrower window changes how far there is to read.
    const resize = new ResizeObserver(onScroll);
    resize.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
      resize.disconnect();
    };
  }, [chapter]);

  return (
    <div className="flex min-h-0 flex-1">
      <GuideSidebar />
      <main ref={main} className="min-w-0 flex-1 overflow-y-auto">
        {/* Wider on large monitors, still an easy line length to read. */}
        <div className={`mx-auto max-w-208 px-8 pb-16 2xl:max-w-240 ${chapter ? "" : "pt-8"}`}>
          {searching ? (
            <SearchResults query={query} />
          ) : page === GLOSSARY_ID || !chapter ? (
            <GlossaryView />
          ) : (
            <>
              <ReadingProgress ref={progress} chapter={chapter} />
              <div className="pt-4">
                <ChapterView key={chapter.id} chapter={chapter} highlighted={highlighted} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
