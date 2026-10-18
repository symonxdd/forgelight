import { create } from "zustand";

export type View = "generate" | "library" | "guide";

function fromAddress(): View {
  const { hash } = window.location;
  if (hash === "#library") return "library";
  if (hash === "#guide" || hash.startsWith("#guide/")) return "guide";
  return "generate";
}

interface ViewState {
  view: View;
  setView: (view: View) => void;
}

/** Which screen is shown. Kept in the address, so reloading stays put and Back works. */
export const useView = create<ViewState>((set, get) => ({
  view: fromAddress(),
  setView: (view) => {
    if (view === get().view) return;
    const { pathname, search } = window.location;
    window.history.pushState(null, "", view === "generate" ? `${pathname}${search}` : `#${view}`);
    set({ view });
  },
}));

window.addEventListener("popstate", () => useView.setState({ view: fromAddress() }));
