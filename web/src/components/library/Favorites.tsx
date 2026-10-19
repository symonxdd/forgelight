import { Star } from "lucide-react";
import { useToggleFavorite } from "../../hooks/useToggleFavorite";
import type { LibraryItem } from "../../lib/library";
import { Hint } from "../Hint";
import { IconButton } from "../IconButton";

/** In a tile's corner: shown while pointed at, and always once starred. */
export function TileStar({ item }: { item: LibraryItem }) {
  const { label, toggle } = useToggleFavorite(item);
  return (
    <Hint label={label}>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={item.favorite}
        className={`absolute top-2 right-2 grid size-6 place-items-center rounded-md bg-black/30 text-white shadow-sm hover:bg-black/50 motion-safe:transition-opacity motion-safe:duration-150 ${
          item.favorite ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        }`}
      >
        <Star className={`size-3.5 ${item.favorite ? "fill-current" : ""}`} aria-hidden />
      </button>
    </Hint>
  );
}

/** In the image view's toolbar; S does the same. */
export function ViewerStar({ item }: { item: LibraryItem }) {
  const { label, toggle } = useToggleFavorite(item);
  return (
    <IconButton label={`${label} (S)`} onClick={toggle} aria-pressed={item.favorite}>
      <Star className={`size-4 ${item.favorite ? "fill-current text-fg-strong" : ""}`} aria-hidden />
    </IconButton>
  );
}

/** Shows only starred images. */
export function FavoritesToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <Hint label={on ? "Show all images" : "Show only favorites"}>
      <button
        type="button"
        onClick={() => onChange(!on)}
        aria-pressed={on}
        className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] ${
          on
            ? "border-line-strong bg-raised text-fg-strong"
            : "border-line text-muted hover:border-line-strong hover:text-fg-strong"
        }`}
      >
        <Star className={`size-3.5 ${on ? "fill-current" : ""}`} aria-hidden />
        Favorites
      </button>
    </Hint>
  );
}
