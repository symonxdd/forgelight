import { useCallback } from "react";
import { useSetFavorite } from "../api/library";
import type { LibraryItem } from "../lib/library";

/** Stars or unstars an image; the label says which a click does. */
export function useToggleFavorite(item: LibraryItem) {
  const { mutate } = useSetFavorite();
  const { id, favorite } = item;
  const toggle = useCallback(() => mutate({ id, favorite: !favorite }), [mutate, id, favorite]);
  return { label: favorite ? "Remove from favorites" : "Add to favorites", toggle };
}
