import { inlineParts, parseNotes } from "../../lib/releaseNotes";

function Inline({ text }: { text: string }) {
  return inlineParts(text).map((part, index) =>
    part.bold ? (
      <strong key={index} className="font-semibold text-fg-strong">
        {part.text}
      </strong>
    ) : (
      part.text
    ),
  );
}

/** A release's notes from the CHANGELOG, as plain text with its headings, items and bold. */
export function ReleaseNotes({ notes }: { notes: string }) {
  const blocks = parseNotes(notes);
  if (blocks.length === 0) return <p className="text-[13px] text-muted">No notes for this version.</p>;
  return (
    <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-fg">
      {blocks.map((block, index) =>
        block.kind === "heading" ? (
          <h4 key={index} className="pt-1.5 text-[12.5px] font-semibold text-fg-strong first:pt-0">
            {block.text}
          </h4>
        ) : block.kind === "item" ? (
          <p key={index} className="relative pl-3.5">
            <span className="absolute left-0.5 text-faint" aria-hidden>
              •
            </span>
            <Inline text={block.text} />
          </p>
        ) : (
          <p key={index}>
            <Inline text={block.text} />
          </p>
        ),
      )}
    </div>
  );
}
