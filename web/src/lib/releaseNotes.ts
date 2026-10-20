/**
 * Release notes arrive as the CHANGELOG's Markdown. Only what the CHANGELOG uses is
 * understood: "###" headings, "- " list items, paragraphs and **bold**. Everything is
 * shown as plain text otherwise, never as HTML.
 */
export type NoteBlock =
  { kind: "heading"; text: string } | { kind: "item"; text: string } | { kind: "paragraph"; text: string };

export interface InlinePart {
  text: string;
  bold: boolean;
}

export function parseNotes(markdown: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  let open: Extract<NoteBlock, { kind: "item" | "paragraph" }> | null = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const item = /^[-*]\s+(.*)$/.exec(line);
    if (!line) {
      open = null;
    } else if (heading) {
      blocks.push({ kind: "heading", text: heading[1] ?? "" });
      open = null;
    } else if (item) {
      open = { kind: "item", text: item[1] ?? "" };
      blocks.push(open);
    } else if (open) {
      open.text += ` ${line}`;
    } else {
      open = { kind: "paragraph", text: line };
      blocks.push(open);
    }
  }
  return blocks;
}

/** Splits text at **bold** markers. An unmatched marker stays as typed. */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), bold: false });
    parts.push({ text: match[1] ?? "", bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts;
}
