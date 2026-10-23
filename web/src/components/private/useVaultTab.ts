import { useEffect } from "react";

const TITLE = "Forgelight";
/** A small accent dot in the tab icon's lower right corner, ringed so it reads on any tab color. */
const DOT = '<circle cx="19" cy="19" r="5.2" fill="#0b0c0e"/><circle cx="19" cy="19" r="3.4" fill="#8ea6c4"/>';

/**
 * While private images are unlocked, the browser tab says so: "Forgelight · Unlocked" as its
 * title and a dot on its icon, visible in the tab strip even with another tab in front.
 */
export function useVaultTab(unlocked: boolean) {
  useEffect(() => {
    document.title = unlocked ? `${TITLE} · Unlocked` : TITLE;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!unlocked || !link) return;
    const plain = link.href;
    let dotted: string | null = null;
    let cancelled = false;
    void fetch(plain)
      .then((response) => response.text())
      .then((svg) => {
        if (cancelled) return;
        dotted = URL.createObjectURL(new Blob([svg.replace("</svg>", `${DOT}</svg>`)], { type: "image/svg+xml" }));
        link.href = dotted;
      })
      // Without the dot, the title still tells.
      .catch(() => undefined);
    return () => {
      cancelled = true;
      link.href = plain;
      if (dotted) URL.revokeObjectURL(dotted);
      document.title = TITLE;
    };
  }, [unlocked]);
}
