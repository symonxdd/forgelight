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
  /** Opens a page, or a topic given as "chapter/topic". Clears the search. */
  open: (target: string) => void;
  setQuery: (query: string) => void;
  /** Called once the topic is in view: it stays outlined until clearHighlight. */
  markFocused: () => void;
  clearHighlight: () => void;
}

export const useGuide = create<GuideState>((set) => ({
  page: pageFromAddress(),
  query: "",
  focusTopic: null,
  highlighted: null,
  open: (target) => {
    const [page, topic] = target.split("/");
    if (!page || !PAGES.has(page)) return;
    // Replaced rather than pushed: Back leaves the guide instead of stepping through chapters.
    window.history.replaceState(null, "", `#guide/${page}`);
    set({ page, query: "", focusTopic: topic ?? null });
  },
  setQuery: (query) => set({ query }),
  markFocused: () => set((s) => ({ focusTopic: null, highlighted: s.focusTopic })),
  clearHighlight: () => set({ highlighted: null }),
}));

window.addEventListener("popstate", () => {
  if (window.location.hash.startsWith("#guide")) useGuide.setState({ page: pageFromAddress() });
});
