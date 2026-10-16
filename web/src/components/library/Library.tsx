import { Check, ChevronDown, ImageIcon, LoaderCircle, Search, X } from "lucide-react";
import { Select } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModels } from "../../api/forgelight";
import { useLibrary } from "../../api/library";
import { fileName, groupByDay, thumbUrl, type LibraryItem } from "../../lib/library";
import { displayName, tidyName } from "../../lib/modelNames";
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
    { value: ALL, text: "All checkpoints" },
    ...models.map((m) => ({ value: m.name, text: label(m.name) })),
  ];
  return (
    <Select.Root value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <Select.Trigger
        aria-label="Checkpoint"
        className="flex h-8 max-w-64 min-w-40 items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 text-left text-[13px] text-fg-strong hover:border-line-strong"
      >
        <span className="truncate">
          <Select.Value />
        </span>
        <Select.Icon>
          <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-surface p-1 text-fg shadow-lg shadow-black/10"
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="flex cursor-default items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] outline-none data-[highlighted]:bg-raised data-[state=checked]:text-fg-strong"
              >
                <Select.ItemText>{option.text}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="size-3.5 text-accent" aria-hidden />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
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

function Tile({ item, onOpen }: { item: LibraryItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-library-id={item.id}
      aria-label={`Open ${fileName(item)}`}
      className="group aspect-[3/4] overflow-hidden rounded-lg bg-raised outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <img
        src={thumbUrl(item)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="size-full object-cover object-top group-hover:brightness-110 motion-safe:transition-[filter] motion-safe:duration-150"
      />
    </button>
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
    return pages.flatMap((page) => page.items).filter((item) => !seen.has(item.id) && seen.add(item.id));
  }, [pages]);
  const groups = useMemo(() => groupByDay(items), [items]);
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
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-library-id="${CSS.escape(id ?? "")}"]`)?.focus(),
    );
  }, [openId]);

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
              setInput("");
              setModel("");
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
              {group.items.map((item) => (
                <Tile key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
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
        <SearchBox value={input} onChange={setInput} />
        <ModelFilter value={model} models={models} onChange={setModel} />
        {!library.isPending && (
          <span className="ml-auto text-[12.5px] text-muted tabular-nums">
            {total === 1 ? "1 image" : `${total.toLocaleString("en-US")} images`}
          </span>
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
        />
      )}
    </main>
  );
}
