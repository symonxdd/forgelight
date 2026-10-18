import { basics } from "./basics";
import { gettingModels } from "./gettingModels";
import { GLOSSARY } from "./glossary";
import { hardware } from "./hardware";
import { models } from "./models";
import { prompting } from "./prompting";
import { recreating } from "./recreating";
import { settings } from "./settings";
import { troubleshooting } from "./troubleshooting";
import type { GuideChapter, GuideTopic } from "./types";

export { GLOSSARY };
export type { GlossaryTerm, GuideChapter, GuideTable, GuideTopic } from "./types";

/** In reading order: the basics first, reference material last. */
export const CHAPTERS: GuideChapter[] = [
  basics,
  models,
  gettingModels,
  prompting,
  settings,
  recreating,
  troubleshooting,
  hardware,
];

/** The glossary is a chapter of its own in the sidebar, built from GLOSSARY rather than topics. */
export const GLOSSARY_ID = "glossary";

export interface TopicRef {
  chapter: GuideChapter;
  topic: GuideTopic;
}

/** Looks up a "chapter/topic" id. */
export function findTopic(ref: string, chapters: GuideChapter[] = CHAPTERS): TopicRef | null {
  const [chapterId, topicId] = ref.split("/");
  const chapter = chapters.find((c) => c.id === chapterId);
  const topic = chapter?.topics.find((t) => t.id === topicId);
  return chapter && topic ? { chapter, topic } : null;
}
