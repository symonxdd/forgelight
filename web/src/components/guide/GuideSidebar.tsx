import { BookA, Search, X } from "lucide-react";
import { Collapsible } from "radix-ui";
import type { LucideIcon } from "lucide-react";
import { CHAPTERS, GLOSSARY_ID } from "../../lib/guide";
import { useGuide } from "../../stores/guide";

function SearchBox() {
  const query = useGuide((s) => s.query);
  const setQuery = useGuide((s) => s.setQuery);
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint"
        aria-hidden
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && query && (e.preventDefault(), setQuery(""))}
        placeholder="Search the guide…"
        aria-label="Search the guide"
        spellCheck={false}
        className="h-8 w-full rounded-md border border-line bg-surface pr-8 pl-8 text-[13px] text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded text-faint hover:text-fg-strong"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function PageButton({
  id,
  title,
  icon: Icon,
  active,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  active: boolean;
}) {
  const open = useGuide((s) => s.open);
  return (
    <button
      type="button"
      onClick={() => open(id)}
      aria-current={active ? "page" : undefined}
      className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13.5px] ${
        active ? "bg-raised font-medium text-fg-strong" : "text-muted hover:text-fg-strong"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${active ? "text-accent" : ""}`} aria-hidden />
      {title}
    </button>
  );
}

/** Chapters, with the open chapter's topics listed under it for jumping straight to one. */
export function GuideSidebar() {
  const page = useGuide((s) => s.page);
  const searching = useGuide((s) => s.query.trim() !== "");
  const open = useGuide((s) => s.open);
  const activeTopic = useGuide((s) => s.activeTopic);

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line px-3 py-4">
      <SearchBox />
      <nav aria-label="Guide chapters" className="flex flex-col gap-0.5">
        {CHAPTERS.map((chapter) => {
          const active = !searching && chapter.id === page;
          return (
            <Collapsible.Root key={chapter.id} open={active}>
              <PageButton id={chapter.id} title={chapter.title} icon={chapter.icon} active={active} />
              {/* Slides open and shut, so switching chapters reads as one list giving way to the next. */}
              <Collapsible.Content className="guide-list overflow-hidden">
                <ul className="mt-0.5 mb-1.5 ml-[17px] flex flex-col border-l border-line">
                  {chapter.topics.map((topic) => {
                    const reading = active && topic.id === activeTopic;
                    return (
                      <li key={topic.id}>
                        <button
                          type="button"
                          onClick={() => open(`${chapter.id}/${topic.id}`)}
                          aria-current={reading ? "location" : undefined}
                          className={`-ml-px w-full truncate border-l py-1 pr-2 pl-3.5 text-left text-[12.5px] ${
                            reading
                              ? "border-accent font-medium text-fg-strong"
                              : "border-transparent text-muted hover:text-fg-strong"
                          }`}
                        >
                          {topic.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Collapsible.Content>
            </Collapsible.Root>
          );
        })}
        <div className="my-1.5 h-px bg-line" />
        <PageButton id={GLOSSARY_ID} title="Glossary" icon={BookA} active={!searching && page === GLOSSARY_ID} />
      </nav>
    </aside>
  );
}
