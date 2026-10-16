import { create } from "zustand";

export type View = "generate" | "library";

function fromAddress(): View {
  return window.location.hash === "#library" ? "library" : "generate";
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
    window.history.pushState(null, "", view === "library" ? "#library" : `${pathname}${search}`);
    set({ view });
  },
}));

window.addEventListener("popstate", () => useView.setState({ view: fromAddress() }));
