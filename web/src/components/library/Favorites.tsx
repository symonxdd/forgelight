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
