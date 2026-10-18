import { GLOSSARY } from "./glossary";
import type { GlossaryTerm, GuideChapter, GuideTopic } from "./types";

export interface SearchHit {
  chapter: GuideChapter;
  topic: GuideTopic;
  /** The sentence that best shows why this topic matched. */
  snippet: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[“”]/g, '"');
}

/** The topic's readable sentences, in the order a snippet is picked from. */
function sentences(topic: GuideTopic): string[] {
  return [
    topic.summary,
    ...(topic.points ?? []),
    ...(topic.steps ?? []),
    ...(topic.table?.rows.map((row) => row.filter(Boolean).join(": ")) ?? []),
    ...(topic.forgelight ? [topic.forgelight] : []),
    ...(topic.folder ? [`Folder: ${topic.folder}`] : []),
  ];
}

/**
 * Finds topics containing every word of the query. Titles, glossary terms and keywords
 * count most, so the topic that explains a word comes before ones that only mention it.
 */
export function searchGuide(query: string, chapters: GuideChapter[], glossary: GlossaryTerm[] = GLOSSARY): SearchHit[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const hits: (SearchHit & { score: number; order: number })[] = [];
  let order = 0;
  for (const chapter of chapters) {
    for (const topic of chapter.topics) {
      order += 1;
      const ref = `${chapter.id}/${topic.id}`;
      const title = normalize(topic.title);
      const names = normalize(
        [...(topic.keywords ?? []), ...glossary.filter((g) => g.topic === ref).map((g) => g.term)].join(" | "),
      );
      const body = sentences(topic).map(normalize);
      const all = [title, names, ...body].join(" | ");
      if (!words.every((w) => all.includes(w))) continue;

      const phrase = words.join(" ");
      let score = 0;
      if (title.includes(phrase)) score += 20;
      if (names.includes(phrase)) score += 12;
      for (const w of words) {
        if (title.includes(w)) score += 6;
        if (names.includes(w)) score += 3;
        if (body.some((s) => s.includes(w))) score += 1;
      }
      const best = body.findIndex((s) => words.every((w) => s.includes(w)));
      const some = body.findIndex((s) => s.includes(words[0] ?? ""));
      const snippet = sentences(topic)[best >= 0 ? best : some >= 0 ? some : 0] ?? topic.summary;
      hits.push({ chapter, topic, snippet, score, order });
    }
  }
  return hits
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ chapter, topic, snippet }) => ({
      chapter,
      topic,
      snippet,
    }));
}
