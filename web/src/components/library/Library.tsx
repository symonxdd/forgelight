import { Check, ImageIcon, Layers, LoaderCircle, Lock, LockOpen, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivateStatus } from "../../api/private";
import { useLibrary, type PrivacyMove } from "../../api/library";
import { fileName, groupBatches, groupByDay, singles, thumbUrl, type Batch } from "../../lib/library";
import { formatNumber } from "../../lib/region";
import { usePreferences } from "../../stores/preferences";
import { Hint } from "../Hint";
import { FiltersMenu } from "./FiltersMenu";
import { DeleteDialog } from "./DeleteDialog";
import { PrivacyDialog } from "./PrivacyDialog";
import { FloatingMessages } from "../controls/Messages";
import { ViewSwitch, type LibraryView } from "./ViewSwitch";
import { TileStar } from "./Favorites";
import { LibraryViewer } from "./LibraryViewer";

/** The prompt search. Compact by default, it widens with what is typed, up to a limit. */
function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div
      className="relative max-w-full transition-[width] duration-150 motion-reduce:transition-none"
      style={{ width: `clamp(15rem, ${value.length}ch + 4.5rem, 28rem)` }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search prompts…"
        aria-label="Search prompts"
        spellCheck={false}
        className="h-8 w-full rounded-md border border-line bg-surface pr-8 pl-8 text-[13px] text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded text-faint hover:text-fg-strong"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Asks for the next page once the end of the grid comes near. */
function LoadMore({ onVisible, watch }: { onVisible: () => void; watch: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onVisible(), {
      rootMargin: "800px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisible, watch]);
  return <div ref={ref} className="h-px" aria-hidden />;
}

interface TileProps {
  /** One image, or a stacked batch shown by its newest image. */
  batch: Batch;
  selected: boolean;
  /** Once anything is selected, a click selects instead of opening. */
  selecting: boolean;
  onOpen: () => void;
  /** `range` is true with Shift held: select everything from the last clicked image. */
  onToggle: (range: boolean) => void;
}

function Tile({ batch, selected, selecting, onOpen, onToggle }: TileProps) {
  const item = batch.items[0]!;
  const count = batch.items.length;
  const name = count > 1 ? `batch of ${count} images` : fileName(item);
  const blurMode = usePreferences((s) => s.libraryBlur);
  const blurred = blurMode === "all" || (blurMode === "nsfw" && item.nsfw);
  return (
    <div className="group relative aspect-[3/4]">
      <button
        type="button"
        onClick={(e) => (selecting ? onToggle(e.shiftKey) : onOpen())}
        data-library-id={item.id}
        aria-label={`Open ${name}`}
        className={`block size-full overflow-hidden rounded-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent ${
          selected ? "bg-accent/25 ring-2 ring-accent ring-inset" : "bg-raised"
        }`}
      >
        <img
          src={thumbUrl(item)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          // A blurred preview clears while pointed at, or reached with the keyboard. Focus
          // left behind by a mouse click doesn't count, so the blur returns once the pointer leaves.
          // The slight zoom hides the blur's soft edges and stays put on hover, so only the blur moves,
          // quickly and easing out, so the picture is mostly clear right away.
          className={`size-full object-cover object-top motion-safe:transition-[filter,scale,border-radius] ${
            blurred ? "motion-safe:duration-[120ms] motion-safe:ease-out" : "motion-safe:duration-200"
          } ${
            selected
              ? `scale-[0.86] rounded-md ${blurred ? "blur-lg group-hover:blur-none group-has-[:focus-visible]:blur-none" : ""}`
              : blurred
                ? "scale-110 blur-xl group-hover:blur-none group-has-[:focus-visible]:blur-none"
                : "group-hover:brightness-110"
          }`}
        />
        {item.private && (
          <span className="absolute bottom-2 left-2 grid size-6 place-items-center rounded-md bg-black/60 text-white backdrop-blur-sm">
            <Lock className="size-3.5" aria-label="Private" />
          </span>
        )}
        {count > 1 && (
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11.5px] font-medium text-white tabular-nums backdrop-blur-sm">
            <Layers className="size-3" aria-hidden />
            {count}
          </span>
        )}
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={`Select ${name}`}
        onClick={(e) => onToggle(e.shiftKey)}
        className={`absolute top-2 left-2 grid size-5 place-items-center rounded-md border-[1.5px] shadow-sm motion-safe:transition-opacity motion-safe:duration-150 ${
          selected
            ? "border-accent bg-accent text-canvas"
            : `border-white/90 bg-black/30 text-transparent hover:bg-black/45 ${
                selecting ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              }`
        }`}
      >
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </button>
      <TileStar item={item} />
    </div>
  );
}

/** Floats at the bottom center while images are selected, close to wherever the pointer is. */
function SelectionBar({
  count,
  publicCount,
  privateCount,
  onClear,
  onMove,
  onDelete,
}: {
  count: number;
  /** Selected images that can be made private; zero hides the button (also before setup). */
  publicCount: number;
  privateCount: number;
  onClear: () => void;
  onMove: (to: "private" | "public") => void;
  onDelete: () => void;
}) {
  const mixed = publicCount > 0 && privateCount > 0;
  const moveButton =
    "flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] text-fg hover:border-line-strong hover:text-fg-strong";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
      <div
        role="toolbar"
        aria-label="Selected images"
        className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface py-1.5 pr-1.5 pl-4 shadow-lg shadow-black/25"
      >
        <span className="mr-2 text-[13px] font-medium text-fg-strong tabular-nums">{formatNumber(count)} selected</span>
        <button
          type="button"
          onClick={onClear}
          className="h-8 rounded-md px-2.5 text-[13px] text-muted hover:bg-raised hover:text-fg-strong"
        >
          Clear
        </button>
        {publicCount > 0 && (
          <button type="button" onClick={() => onMove("private")} className={moveButton}>
            <Lock className="size-3.5" aria-hidden />
            Make private{mixed ? ` (${formatNumber(publicCount)})` : ""}
          </button>
        )}
        {privateCount > 0 && (
          <button type="button" onClick={() => onMove("public")} className={moveButton}>
            <LockOpen className="size-3.5" aria-hidden />
            Make public{mixed ? ` (${formatNumber(privateCount)})` : ""}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="flex h-8 items-center gap-1.5 rounded-md border border-bad/40 px-3 text-[13px] text-bad hover:bg-bad/10"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Delete
        </button>
      </div>
    </div>
  );
}

function Message({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <ImageIcon className="size-8 text-faint" strokeWidth={1.25} aria-hidden />
        <p className="text-[15px] font-medium text-fg">{title}</p>
        {detail && <p className="text-[13px] leading-relaxed text-muted">{detail}</p>}
        {action}
      </div>
    </div>
  );
}

/** Every image in Forge's output folders, including ones made in classic Forge. */
export function Library() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("");
  const [view, setView] = useState<LibraryView>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; next: string | null } | null>(null);
  const [pendingMove, setPendingMove] = useState<(PrivacyMove & { next: string | null }) | null>(null);
  // Deleted images leave the grid at once, before the Library has reloaded.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());

  // A new search starts a new selection: nothing hidden by it stays selected.
  const changeInput = (value: string) => {
    setInput(value);
    setSelected(new Set());
  };
  const changeModel = (value: string) => {
    setModel(value);
    setSelected(new Set());
  };
  const changeView = (value: LibraryView) => {
    setView(value);
    setSelected(new Set());
  };

  // Search once typing pauses, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const rating = usePreferences((s) => s.libraryRating);
  const setRating = usePreferences((s) => s.setLibraryRating);
  const privateStatus = usePrivateStatus();
  const favoritesOnly = view === "favorites";
  // Locking leaves nothing to show in the private view, so it falls back to all images.
  const showPrivateOnly = view === "private" && privateStatus.data?.unlocked === true;
  const library = useLibrary(query, model, rating, favoritesOnly, showPrivateOnly);
  const pages = useMemo(() => library.data?.pages ?? [], [library.data]);
  const items = useMemo(() => {
    // New images shift later pages by a few places; drop the repeats that causes.
    const seen = new Set<string>();
    return pages
      .flatMap((page) => page.items)
      .filter((item) => !removed.has(item.id) && !seen.has(item.id) && seen.add(item.id));
  }, [pages, removed]);
  const stacks = usePreferences((s) => s.libraryStacks);
  const setStacks = usePreferences((s) => s.setLibraryStacks);
  // Batches are always known, for the image view's strip; the grid stacks them only if wanted.
  const batches = useMemo(() => groupBatches(items), [items]);
  const batchOf = useMemo(() => new Map(batches.flatMap((b) => b.items.map((i) => [i.id, b] as const))), [batches]);
  const dateOrder = usePreferences((s) => s.dateOrder);
  // The day labels are text, so they are made again when the date order changes.
  const groups = useMemo(
    () => groupByDay(stacks ? batches : singles(items)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stacks, batches, items, dateOrder],
  );
  const latest = pages[pages.length - 1];
  const total = latest?.total ?? 0;
  const models = pages[0]?.models ?? [];
  const openIndex = openId ? items.findIndex((item) => item.id === openId) : -1;

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = library;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const close = useCallback(() => {
    const id = openId;
    setOpenId(null);
    // Back in the grid, keep the place of the image last shown. Without a visible focus
    // ring, which would also lift that tile's blur until something else is clicked.
    const tileId = (stacks && id && batchOf.get(id)?.key) || id;
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(`[data-library-id="${CSS.escape(tileId ?? "")}"]`)
        ?.focus({ focusVisible: false } as FocusOptions),
    );
  }, [openId, stacks, batchOf]);

  /** Selects or unselects a tile's images: one image, or a whole stacked batch. */
  const toggle = (ids: string[], range: boolean) => {
    const next = new Set(selected);
    const id = ids[0]!;
    const from = anchor ? items.findIndex((item) => item.id === anchor) : -1;
    const to = items.findIndex((item) => item.id === id);
    if (range && from !== -1 && to !== -1) {
      for (const item of items.slice(Math.min(from, to), Math.max(from, to) + 1)) next.add(item.id);
      for (const each of ids) next.add(each);
    } else if (ids.every((each) => next.has(each))) {
      for (const each of ids) next.delete(each);
    } else {
      for (const each of ids) next.add(each);
    }
    setSelected(next);
    setAnchor(id);
  };
  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setAnchor(null);
  }, []);
  const selectedCount = selected.size;

  // Escape clears the selection, before the app-wide shortcuts see the key.
  useEffect(() => {
    if (selectedCount === 0 || openId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("[role='alertdialog'], [role='listbox'], [role='menu']"))
        return;
      event.preventDefault();
      clearSelection();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [selectedCount, openId, clearSelection]);

  const deleteOpen = () => {
    const current = items[openIndex];
    if (!current) return;
    const next = items[openIndex + 1] ?? items[openIndex - 1];
    setPendingDelete({ ids: [current.id], next: next?.id ?? null });
  };
  /** Deleted or moved images leave the grid at once, and the image view goes on to the next one. */
  const leave = (ids: string[], next: string | null) => {
    setRemoved((current) => new Set([...current, ...ids]));
    setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))));
    if (openId && ids.includes(openId)) setOpenId(next);
  };
  const onDeleted = (ids: string[]) => {
    leave(ids, pendingDelete?.next ?? null);
    setPendingDelete(null);
  };
  const moveOpen = () => {
    const current = items[openIndex];
    if (!current) return;
    const next = items[openIndex + 1] ?? items[openIndex - 1];
    setPendingMove({ ids: [current.id], to: current.private ? "public" : "private", next: next?.id ?? null });
  };
  const onMoved = (ids: string[]) => {
    leave(ids, pendingMove?.next ?? null);
    setPendingMove(null);
  };
  const selectedPrivate = [...selected].filter((id) => id.startsWith("private/"));
  const selectedPublic = [...selected].filter((id) => !id.startsWith("private/"));

  const filtered = Boolean(query || model || rating !== "all" || favoritesOnly || showPrivateOnly);
  let body;
  if (library.isPending) {
    body = (
      <div className="grid h-full place-items-center">
        <LoaderCircle className="size-6 animate-spin text-faint" aria-label="Loading" />
      </div>
    );
  } else if (library.isError) {
    body = <Message title="The Library couldn't be loaded" detail={library.error.message} />;
  } else if (items.length === 0 && favoritesOnly && !query && !model && rating === "all") {
    body = <Message title="No favorites yet" detail="The star in an image's corner adds it to the favorites." />;
  } else if (items.length === 0 && filtered) {
    body = (
      <Message
        title="No images match"
        action={
          <button
            type="button"
            onClick={() => {
              changeInput("");
              changeModel("");
              changeView("all");
              setRating("all");
            }}
            className="h-8 rounded-md border border-line px-3 text-[13px] text-fg hover:bg-raised"
          >
            Show all images
          </button>
        }
      />
    );
  } else if (items.length === 0) {
    body = (
      <Message
        title="No images yet"
        detail="Every image Forge saves shows up here, including ones made in classic Forge."
      />
    );
  } else {
    body = (
      <div className="px-4 pb-8">
        {groups.map((group) => (
          <section key={group.key} aria-label={group.label}>
            <h2 className="sticky top-0 z-[1] flex items-baseline gap-2 bg-canvas/90 py-3 text-[13px] font-medium text-fg-strong backdrop-blur-sm">
              {group.label}
              <span className="text-[12px] font-normal text-faint tabular-nums">
                {formatNumber(latest?.days[group.key] ?? group.items.length)}
              </span>
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
              {group.items.map((batch) => (
                <Tile
                  key={batch.key}
                  batch={batch}
                  selected={batch.items.every((item) => selected.has(item.id))}
                  selecting={selectedCount > 0}
                  onOpen={() => setOpenId(batch.key)}
                  onToggle={(range) =>
                    toggle(
                      batch.items.map((item) => item.id),
                      range,
                    )
                  }
                />
              ))}
            </div>
          </section>
        ))}
        <LoadMore onVisible={loadMore} watch={items.length} />
        {isFetchingNextPage && <LoaderCircle className="mx-auto mt-6 size-5 animate-spin text-faint" aria-hidden />}
      </div>
    );
  }

  return (
    <main aria-label="Library" className="relative flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="border-b border-line px-4 py-3">
        {/* One centered band, so on a wide screen search and controls stay together. */}
        <div className="mx-auto flex max-w-[70rem] flex-wrap items-center gap-2">
          <SearchBox value={input} onChange={changeInput} />
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <ViewSwitch
              view={showPrivateOnly ? "private" : view === "private" ? "all" : view}
              hidden={latest?.lockedPrivate ?? 0}
              onChange={changeView}
            />
            <FiltersMenu model={model} models={models} onModelChange={changeModel} />
            <Hint label={stacks ? "Show every image on its own" : "Stack images made together"}>
              <button
                type="button"
                onClick={() => setStacks(!stacks)}
                aria-pressed={stacks}
                aria-label="Stacks"
                className={`grid size-8 place-items-center rounded-md border ${
                  stacks
                    ? "border-line-strong bg-raised text-fg-strong"
                    : "border-line text-muted hover:border-line-strong hover:text-fg-strong"
                }`}
              >
                <Layers className="size-3.5" aria-hidden />
              </button>
            </Hint>
            {/* A fixed width, so a changing count ("13 images", "0 images") never shifts the controls. */}
            <span className="w-20 text-right text-[12.5px] text-muted tabular-nums">
              {library.isPending ? "" : total === 1 ? "1 image" : `${formatNumber(total)} images`}
            </span>
          </div>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        {/* Floats just under the toolbar, over the pictures, so nothing moves when selecting starts. */}
        {selectedCount > 0 && openIndex === -1 && (
          <SelectionBar
            count={selectedCount}
            publicCount={privateStatus.data?.setUp ? selectedPublic.length : 0}
            privateCount={selectedPrivate.length}
            onClear={clearSelection}
            onMove={(to) =>
              setPendingMove({ ids: to === "private" ? selectedPublic : selectedPrivate, to, next: null })
            }
            onDelete={() => setPendingDelete({ ids: [...selected], next: null })}
          />
        )}
        <FloatingMessages />
      </div>
      {openIndex !== -1 && (
        <LibraryViewer
          items={items}
          index={openIndex}
          onIndex={(index) => setOpenId(items[index]?.id ?? null)}
          onClose={close}
          onNearEnd={loadMore}
          onDelete={deleteOpen}
          onMove={privateStatus.data?.setUp ? moveOpen : undefined}
          batch={batchOf.get(items[openIndex]!.id)?.items ?? []}
        />
      )}
      <DeleteDialog ids={pendingDelete?.ids ?? null} onClose={() => setPendingDelete(null)} onDeleted={onDeleted} />
      <PrivacyDialog move={pendingMove} onClose={() => setPendingMove(null)} onMoved={onMoved} />
    </main>
  );
}
