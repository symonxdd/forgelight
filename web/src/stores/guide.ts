import { create } from "zustand";
import { CHAPTERS, GLOSSARY_ID } from "../lib/guide";

const PAGES = new Set([...CHAPTERS.map((c) => c.id), GLOSSARY_ID]);

/** The chapter in the address (#guide/models), or the first one. */
function pageFromAddress(): string {
  const page = /^#guide\/([\w-]+)/.exec(window.location.hash)?.[1];
  return page && PAGES.has(page) ? page : (CHAPTERS[0]?.id ?? GLOSSARY_ID);
}

interface GuideState {
  /** A chapter id, or GLOSSARY_ID. */
  page: string;
  query: string;
  /** A topic to scroll to once its chapter is on screen. */
  focusTopic: string | null;
  /** The topic just scrolled to, outlined for a moment. */
  highlighted: string | null;
  /** The topic being read, marked in the chapter list and the progress bar. */
  activeTopic: string | null;
  setActiveTopic: (topic: string | null) => void;
  /** Opens a page, or a topic given as "chapter/topic". Clears the search. */
  open: (target: string) => void;
  setQuery: (query: string) => void;
  /** A topic shown in the side panel over the current screen, opened from an info tip. */
  peek: string | null;
  openPeek: (topic: string) => void;
  closePeek: () => void;
  /** Called once the topic is in view: it stays outlined until clearHighlight. */
  markFocused: (topic: string) => void;
  clearHighlight: () => void;
}

export const useGuide = create<GuideState>((set) => ({
  page: pageFromAddress(),
  query: "",
  focusTopic: null,
  highlighted: null,
  activeTopic: null,
  peek: null,
  open: (target) => {
    const [page, topic] = target.split("/");
    if (!page || !PAGES.has(page)) return;
    // Replaced rather than pushed: Back leaves the guide instead of stepping through chapters.
    window.history.replaceState(null, "", `#guide/${page}`);
    set({ page, query: "", focusTopic: topic ?? null, activeTopic: topic ?? null });
  },
  setQuery: (query) => set({ query }),
  setActiveTopic: (topic) => set({ activeTopic: topic }),
  openPeek: (topic) => set({ peek: topic }),
  closePeek: () => set({ peek: null }),
  markFocused: (topic) => set({ focusTopic: null, highlighted: topic }),
  clearHighlight: () => set({ highlighted: null }),
}));

window.addEventListener("popstate", () => {
  if (window.location.hash.startsWith("#guide")) useGuide.setState({ page: pageFromAddress() });
});
