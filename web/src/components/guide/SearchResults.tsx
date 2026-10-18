import { SearchX } from "lucide-react";
import { useMemo } from "react";
import { CHAPTERS } from "../../lib/guide";
import { searchGuide } from "../../lib/guide/search";
import { useGuide } from "../../stores/guide";

export function SearchResults({ query }: { query: string }) {
  const open = useGuide((s) => s.open);
  const hits = useMemo(() => searchGuide(query, CHAPTERS), [query]);

  if (hits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <SearchX className="size-6 text-faint" aria-hidden />
        <p className="text-[14px] font-medium text-fg-strong">Nothing found</p>
        <p className="text-[13px] text-muted">Fewer or shorter words often help, such as “lora” or “memory”.</p>
      </div>
    );
  }

  return (
    <section aria-label="Search results" className="flex flex-col gap-2">
      <p className="mb-1 text-[12.5px] text-faint">
        {hits.length === 1 ? "1 topic" : `${hits.length} topics`} for “{query.trim()}”
      </p>
      {hits.map(({ chapter, topic, snippet }) => (
        <button
          key={`${chapter.id}/${topic.id}`}
          type="button"
          onClick={() => open(`${chapter.id}/${topic.id}`)}
          className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-line-strong"
        >
          <span className="text-[11.5px] font-medium tracking-wide text-faint uppercase">{chapter.title}</span>
          <span className="text-[14px] font-semibold text-fg-strong">{topic.title}</span>
          <span className="line-clamp-2 text-[13px] leading-relaxed text-muted">{snippet}</span>
        </button>
      ))}
    </section>
  );
}
