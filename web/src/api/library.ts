import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LibraryItem } from "../lib/library";
import { request } from "./forgelight";

export interface LibraryPage {
  /** Images matching the search, across all pages. */
  total: number;
  /** Matching images per day, keyed like "2026-10-16". */
  days: Record<string, number>;
  offset: number;
  items: LibraryItem[];
  /** Every checkpoint named in the images' settings, most used first. */
  models: { name: string; count: number }[];
}

const PAGE_SIZE = 120;

/** All images in Forge's output folders, newest first, a page at a time. */
export function useLibrary(query: string, model: string, rating: string) {
  return useInfiniteQuery({
    queryKey: ["library", query, model, rating],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ offset: String(pageParam), limit: String(PAGE_SIZE) });
      if (query) params.set("q", query);
      if (model) params.set("model", model);
      if (rating !== "all") params.set("rating", rating);
      return request<LibraryPage>(`library?${params}`);
    },
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
    placeholderData: (previous) => previous,
  });
}

/** Opens the image's folder in File Explorer, with the image selected. */
export function useRevealImage() {
  return useMutation({ mutationFn: (id: string) => request<{ ok: boolean }>("library/reveal", { id }) });
}

/** Moves images to the Windows Recycle Bin, then reloads the Library. */
export function useDeleteImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => request<{ deleted: number; failed: number }>("library/delete", { ids }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
  });
}
