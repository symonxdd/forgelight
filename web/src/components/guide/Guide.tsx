import { useEffect, useRef } from "react";
import { CHAPTERS, GLOSSARY_ID } from "../../lib/guide";
import { useGuide } from "../../stores/guide";
import { ChapterView } from "./ChapterView";
import { GlossaryView } from "./GlossaryView";
import { GuideSidebar } from "./GuideSidebar";
import { SearchResults } from "./SearchResults";

/** How long a topic opened from a link keeps its outline, to show where it is. */
const HIGHLIGHT_MS = 1600;

/** Short explanations of Forge, models and settings, as chapters with a search. */
export function Guide() {
  const page = useGuide((s) => s.page);
  const query = useGuide((s) => s.query);
  const focusTopic = useGuide((s) => s.focusTopic);
  const markFocused = useGuide((s) => s.markFocused);
  const highlighted = useGuide((s) => s.highlighted);
  const clearHighlight = useGuide((s) => s.clearHighlight);
  const main = useRef<HTMLElement>(null);
  const searching = query.trim() !== "";
  const shown = useRef({ page, searching });

  // Keep the chapter in the address, so a reload opens it again.
  useEffect(() => {
    if (!window.location.hash.startsWith(`#guide/${page}`)) window.history.replaceState(null, "", `#guide/${page}`);
  }, [page]);

  // A topic link scrolls to its card; any other new page or search starts at the top.
  useEffect(() => {
    const changed = shown.current.page !== page || shown.current.searching !== searching;
    shown.current = { page, searching };
    if (focusTopic) {
      document.getElementById(`topic-${focusTopic}`)?.scrollIntoView({ block: "start" });
      markFocused(focusTopic);
    } else if (changed) {
      main.current?.scrollTo({ top: 0 });
    }
  }, [page, searching, focusTopic, markFocused]);

  useEffect(() => {
    if (!highlighted) return;
    const timer = window.setTimeout(clearHighlight, HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlighted, clearHighlight]);

  const chapter = CHAPTERS.find((c) => c.id === page);
  return (
    <div className="flex min-h-0 flex-1">
      <GuideSidebar />
      <main ref={main} className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-184 px-8 pt-8 pb-16">
          {searching ? (
            <SearchResults query={query} />
          ) : page === GLOSSARY_ID || !chapter ? (
            <GlossaryView />
          ) : (
            <ChapterView key={chapter.id} chapter={chapter} highlighted={highlighted} />
          )}
        </div>
      </main>
    </div>
  );
}
