import { ArrowLeft, ArrowRight } from "lucide-react";
import { CHAPTERS, GLOSSARY_ID, type GuideChapter } from "../../lib/guide";
import { useGuide } from "../../stores/guide";
import { TopicCard } from "./TopicCard";

function PageLink({ target, label, direction }: { target: string; label: string; direction: "back" | "next" }) {
  const open = useGuide((s) => s.open);
  const Arrow = direction === "back" ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={() => open(target)}
      className={`flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl border border-line px-4 py-3 hover:border-line-strong ${
        direction === "next" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      <span className="flex items-center gap-1.5 text-[12px] text-faint">
        {direction === "back" && <Arrow className="size-3.5" aria-hidden />}
        {direction === "back" ? "Previous" : "Next"}
        {direction === "next" && <Arrow className="size-3.5" aria-hidden />}
      </span>
      <span className="truncate text-[13.5px] font-medium text-fg-strong">{label}</span>
    </button>
  );
}

/** A chapter's topics as cards, with links to the chapters before and after it. */
export function ChapterView({ chapter, highlighted }: { chapter: GuideChapter; highlighted: string | null }) {
  const index = CHAPTERS.indexOf(chapter);
  const previous = CHAPTERS[index - 1];
  const next = CHAPTERS[index + 1];
  const Icon = chapter.icon;

  return (
    <article className="flex flex-col gap-4">
      <header className="mb-2 flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-accent">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-fg-strong">{chapter.title}</h1>
          <p className="text-[14px] text-muted">{chapter.intro}</p>
        </div>
      </header>
      {chapter.topics.map((topic) => (
        <TopicCard key={topic.id} topic={topic} highlighted={highlighted === topic.id} />
      ))}
      <nav aria-label="More chapters" className="mt-4 flex gap-3">
        {previous ? (
          <PageLink target={previous.id} label={previous.title} direction="back" />
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <PageLink target={next.id} label={next.title} direction="next" />
        ) : (
          <PageLink target={GLOSSARY_ID} label="Glossary" direction="next" />
        )}
      </nav>
    </article>
  );
}
