import { FolderOpen } from "lucide-react";
import { findTopic, type GuideTable, type GuideTopic } from "../../lib/guide";
import { useGuide } from "../../stores/guide";
import { LogoMark } from "../Logo";

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-raised text-[11.5px] font-medium text-fg-strong tabular-nums">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Points({ points }: { points: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {points.map((point) => (
        <li key={point} className="flex gap-3">
          <span className="mt-[9px] size-1 shrink-0 rounded-full bg-faint" aria-hidden />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function Table({ table }: { table: GuideTable }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-raised/60">
            {table.head.map((cell) => (
              <th key={cell} className="px-3 py-2 font-medium whitespace-nowrap text-fg-strong">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.join("|")} className="border-t border-line align-top">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`px-3 py-2 ${i === 0 ? "font-medium whitespace-nowrap text-fg-strong" : ""} ${
                    cell.includes("\\") ? "whitespace-nowrap" : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Related({ refs, onOpen }: { refs: string[]; onOpen: (ref: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[12px] text-faint">Related</span>
      {refs.map((ref) => {
        const found = findTopic(ref);
        if (!found) return null;
        return (
          <button
            key={ref}
            type="button"
            onClick={() => onOpen(ref)}
            className="h-7 rounded-md border border-line px-2.5 text-[12.5px] text-muted hover:border-line-strong hover:text-fg-strong"
          >
            {found.topic.title}
          </button>
        );
      })}
    </div>
  );
}

/** One topic: the summary on its own answers the question, the rest adds detail. */
interface TopicCardProps {
  topic: GuideTopic;
  highlighted?: boolean;
  /** Where Related links lead; the guide screen by default, the same panel in the side panel. */
  onOpenTopic?: (ref: string) => void;
  /** Whether the card carries the id that topic links scroll to. Off in the side panel. */
  anchor?: boolean;
}

export function TopicCard({ topic, highlighted = false, onOpenTopic, anchor = true }: TopicCardProps) {
  const openInGuide = useGuide((s) => s.open);
  const titleId = `topic-${topic.id}-title${anchor ? "" : "-peek"}`;
  return (
    <section
      id={anchor ? `topic-${topic.id}` : undefined}
      aria-labelledby={titleId}
      className={`flex scroll-mt-20 flex-col gap-4 rounded-xl border bg-surface p-5 text-[13.5px] leading-relaxed text-fg ${
        highlighted ? "border-accent" : "border-line"
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-fg-strong">
          {topic.title}
        </h2>
        <p className="text-[14px] text-fg-strong/90">{topic.summary}</p>
      </div>
      {topic.steps && <Steps steps={topic.steps} />}
      {topic.table && <Table table={topic.table} />}
      {topic.points && <Points points={topic.points} />}
      {(topic.folder || topic.forgelight) && (
        <div className="flex flex-col gap-2">
          {topic.folder && (
            <p className="flex items-center gap-2.5 text-[13px]">
              <FolderOpen className="size-4 shrink-0 text-faint" aria-hidden />
              <span className="text-muted">Folder</span>
              <span className="rounded bg-raised px-1.5 py-0.5 text-[12.5px] text-fg-strong">{topic.folder}</span>
            </p>
          )}
          {topic.forgelight && (
            <p className="flex gap-2.5 rounded-lg bg-raised/60 px-3 py-2.5 text-[13px]">
              <LogoMark className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>
                <span className="font-medium text-fg-strong">In Forgelight: </span>
                {topic.forgelight}
              </span>
            </p>
          )}
        </div>
      )}
      {topic.related && topic.related.length > 0 && (
        <Related refs={topic.related} onOpen={onOpenTopic ?? openInGuide} />
      )}
    </section>
  );
}
