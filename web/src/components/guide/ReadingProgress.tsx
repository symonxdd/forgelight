import { forwardRef } from "react";
import type { GuideChapter } from "../../lib/guide";
import { useGuide } from "../../stores/guide";

/**
 * How far through the chapter the reader is, styled like the generation progress bar.
 * The fill and percentage are written straight to the page while scrolling (see Guide),
 * so scrolling never re-renders the chapter.
 */
export const ReadingProgress = forwardRef<HTMLDivElement, { chapter: GuideChapter }>(function ReadingProgress(
  { chapter },
  ref,
) {
  const activeTopic = useGuide((s) => s.activeTopic);
  const title = chapter.topics.find((t) => t.id === activeTopic)?.title ?? chapter.topics[0]?.title;
  return (
    <div className="sticky top-0 z-10 bg-canvas pt-4 pb-3">
      <div
        ref={ref}
        role="progressbar"
        aria-label={`Reading progress in ${chapter.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative flex h-8 items-center overflow-hidden rounded-lg bg-raised"
      >
        <div data-fill className="absolute inset-y-0 left-0 w-0 bg-fg-strong/12" />
        <span className="relative min-w-0 flex-1 truncate px-3 text-[12.5px] text-fg-strong">
          {chapter.title}
          {title && <span className="text-muted"> · {title}</span>}
        </span>
        <span data-percent className="relative shrink-0 px-3 text-[12px] text-muted tabular-nums" />
      </div>
    </div>
  );
});
