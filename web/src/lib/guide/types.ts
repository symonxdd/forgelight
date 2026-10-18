import type { LucideIcon } from "lucide-react";

/** A small table, for comparisons such as model families or folders. */
export interface GuideTable {
  head: string[];
  rows: string[][];
}

/** One card in a chapter: a short summary first, details only where they help. */
export interface GuideTopic {
  id: string;
  title: string;
  /** One or two sentences that answer "what is this?" on their own. */
  summary: string;
  /** Short facts, one line each where possible. */
  points?: string[];
  /** Numbered steps, for things that happen in order. */
  steps?: string[];
  table?: GuideTable;
  /** Where the files go, relative to Forge's own folder. */
  folder?: string;
  /** How this shows up in Forgelight. */
  forgelight?: string;
  /** Other topics worth reading next, as "chapter/topic" ids. */
  related?: string[];
  /** Extra words people might search for. */
  keywords?: string[];
}

export interface GuideChapter {
  id: string;
  title: string;
  icon: LucideIcon;
  /** One line under the chapter title. */
  intro: string;
  topics: GuideTopic[];
}

/** A glossary entry: a term, a one-line meaning and the topic that explains it. */
export interface GlossaryTerm {
  term: string;
  meaning: string;
  /** "chapter/topic" id. */
  topic: string;
}
