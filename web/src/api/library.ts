import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
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
  /** Private images left out because the vault is locked. */
  lockedPrivate?: number;
}

const PAGE_SIZE = 120;

/** All images in Forge's output folders, newest first, a page at a time. */
export function useLibrary(query: string, model: string, rating: string, favoritesOnly = false, privateOnly = false) {
  return useInfiniteQuery({
    queryKey: ["library", query, model, rating, favoritesOnly, privateOnly],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ offset: String(pageParam), limit: String(PAGE_SIZE) });
      if (query) params.set("q", query);
      if (model) params.set("model", model);
      if (rating !== "all") params.set("rating", rating);
      if (favoritesOnly) params.set("favorites", "1");
      if (privateOnly) params.set("private", "1");
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

function markFavorite(data: InfiniteData<LibraryPage> | undefined, id: string, favorite: boolean) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === id ? { ...item, favorite } : item)),
    })),
  };
}

/**
 * Stars or unstars an image. The star changes at once; the Favorites view keeps an
 * unstarred image until it is opened again, so a mistaken click is easy to take back.
 */
export function useSetFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      request<{ favorite: boolean }>("library/favorite", { id, favorite }),
    onMutate: ({ id, favorite }) => {
      queryClient.setQueriesData<InfiniteData<LibraryPage>>({ queryKey: ["library"] }, (data) =>
        markFavorite(data, id, favorite),
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"], refetchType: "none" }),
  });
}

export interface PrivacyMove {
  ids: string[];
  /** "private" encrypts images into the vault; "public" saves them as normal files again. */
  to: "private" | "public";
}

/** Moves images into the private vault or back out of it, then reloads the Library. */
export function useMoveImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, to }: PrivacyMove) => request<{ moved: number; failed: number }>(`library/make-${to}`, { ids }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
  });
}

/** Moves images to the Windows Recycle Bin, then reloads the Library. */
export function useDeleteImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => request<{ deleted: number; failed: number }>("library/delete", { ids }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
  });
}
