import { Check, ImageIcon, Layers, LoaderCircle, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModels } from "../../api/forgelight";
import { useLibrary } from "../../api/library";
import { fileName, groupBatches, groupByDay, singles, thumbUrl, type Batch } from "../../lib/library";
import { displayName, tidyName } from "../../lib/modelNames";
import { looksNsfw } from "../../lib/nsfw";
import { usePreferences } from "../../stores/preferences";
import { Hint } from "../Hint";
import { SelectMenu } from "../SelectMenu";
import { DeleteDialog } from "./DeleteDialog";
import { LibraryViewer } from "./LibraryViewer";

const ALL = "__all";

/** Readable names for the checkpoints named in images, using Civitai's name when known. */
function useModelLabels(): (name: string) => string {
  const models = useModels();
  const byStem = useMemo(
    () => new Map((models.data?.checkpoints ?? []).map((m) => [m.stem, displayName(m.stem, m.civitai).name])),
    [models.data],
  );
  return useCallback((name: string) => byStem.get(name) ?? tidyName(name), [byStem]);
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-full max-w-xs">
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

function ModelFilter({
  value,
  models,
  onChange,
}: {
  value: string;
  models: { name: string; count: number }[];
  onChange: (value: string) => void;
}) {
  const label = useModelLabels();
  const options = [
    { value: ALL, label: "All checkpoints" },
    ...models.map((m) => ({ value: m.name, label: label(m.name) })),
  ];
  return (
    <SelectMenu
      value={value || ALL}
      options={options}
      onChange={(v) => onChange(v === ALL ? "" : v)}
      aria-label="Checkpoint"
      className="h-8 max-w-64 min-w-40 rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg-strong hover:border-line-strong"
    />
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
  const blurred = useMemo(
    () => blurMode === "all" || (blurMode === "nsfw" && looksNsfw(item.infotext)),
    [blurMode, item.infotext],
  );
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
          className={`size-full object-cover object-top motion-safe:transition-[filter,scale,border-radius] motion-safe:duration-200 ${
            selected
              ? `scale-[0.86] rounded-md ${blurred ? "blur-lg" : ""}`
              : blurred
                ? "scale-110 blur-xl group-focus-within:scale-100 group-focus-within:blur-none group-hover:scale-100 group-hover:blur-none"
                : "group-hover:brightness-110"
          }`}
        />
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; next: string | null } | null>(null);
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

  // Search once typing pauses, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const library = useLibrary(query, model);
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
  const groups = useMemo(() => groupByDay(stacks ? batches : singles(items)), [stacks, batches, items]);
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
    // Back in the grid, keep the place of the image last shown.
    const tileId = (stacks && id && batchOf.get(id)?.key) || id;
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-library-id="${CSS.escape(tileId ?? "")}"]`)?.focus(),
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
  const onDeleted = (ids: string[]) => {
    setRemoved((current) => new Set([...current, ...ids]));
    setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))));
    if (openId && ids.includes(openId)) setOpenId(pendingDelete?.next ?? null);
    setPendingDelete(null);
  };

  const filtered = Boolean(query || model);
  let body;
  if (library.isPending) {
    body = (
      <div className="grid h-full place-items-center">
        <LoaderCircle className="size-6 animate-spin text-faint" aria-label="Loading" />
      </div>
    );
  } else if (library.isError) {
    body = <Message title="The Library couldn't be loaded" detail={library.error.message} />;
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
            }}
            className="h-8 rounded-md border border-line px-3 text-[13px] text-fg hover:bg-raised"
          >
            Clear search
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
                {latest?.days[group.key] ?? group.items.length}
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
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <SearchBox value={input} onChange={changeInput} />
        <ModelFilter value={model} models={models} onChange={changeModel} />
        <Hint label={stacks ? "Show every image on its own" : "Stack images made together"}>
          <button
            type="button"
            onClick={() => setStacks(!stacks)}
            aria-pressed={stacks}
            className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] ${
              stacks
                ? "border-line-strong bg-raised text-fg-strong"
                : "border-line text-muted hover:border-line-strong hover:text-fg-strong"
            }`}
          >
            <Layers className="size-3.5" aria-hidden />
            Stacks
          </button>
        </Hint>
        {selectedCount > 0 ? (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-1 text-[13px] text-fg-strong tabular-nums">
              {selectedCount.toLocaleString("en-US")} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="h-8 rounded-md px-2.5 text-[13px] text-muted hover:bg-raised hover:text-fg-strong"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete({ ids: [...selected], next: null })}
              className="flex h-8 items-center gap-1.5 rounded-md border border-bad/40 px-3 text-[13px] text-bad hover:bg-bad/10"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete
            </button>
          </div>
        ) : (
          !library.isPending && (
            <span className="ml-auto text-[12.5px] text-muted tabular-nums">
              {total === 1 ? "1 image" : `${total.toLocaleString("en-US")} images`}
            </span>
          )
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      {openIndex !== -1 && (
        <LibraryViewer
          items={items}
          index={openIndex}
          onIndex={(index) => setOpenId(items[index]?.id ?? null)}
          onClose={close}
          onNearEnd={loadMore}
          onDelete={deleteOpen}
          batch={batchOf.get(items[openIndex]!.id)?.items ?? []}
        />
      )}
      <DeleteDialog ids={pendingDelete?.ids ?? null} onClose={() => setPendingDelete(null)} onDeleted={onDeleted} />
    </main>
  );
}
