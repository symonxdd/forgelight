import { describe, expect, it } from "vitest";
import { CHAPTERS, GLOSSARY, findTopic } from ".";
import { HELP } from "../help";
import { HELP_TOPICS, guideTopicFor } from "./helpLinks";
import { searchGuide } from "./search";

const ids = (query: string) => searchGuide(query, CHAPTERS).map((h) => `${h.chapter.id}/${h.topic.id}`);

describe("guide content", () => {
  it("links only to topics that exist", () => {
    const refs = [
      ...CHAPTERS.flatMap((c) => c.topics.flatMap((t) => t.related ?? [])),
      ...GLOSSARY.map((g) => g.topic),
      ...Object.values(HELP_TOPICS),
    ];
    expect(refs.filter((ref) => findTopic(ref) === null)).toEqual([]);
  });

  it("uses unique ids", () => {
    const chapterIds = CHAPTERS.map((c) => c.id);
    expect(new Set(chapterIds).size).toBe(chapterIds.length);
    for (const chapter of CHAPTERS) {
      const topicIds = chapter.topics.map((t) => t.id);
      expect(new Set(topicIds).size).toBe(topicIds.length);
    }
  });

  it("keeps the glossary in A to Z order", () => {
    const terms = GLOSSARY.map((g) => g.term);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  });

  it("follows the writing style: no em or en dashes, no second person", () => {
    const text = JSON.stringify([CHAPTERS, GLOSSARY]);
    expect(text).not.toMatch(/[–—]/);
    expect(text).not.toMatch(/\b(you|your|we|our)\b/i);
  });
});

describe("guideTopicFor", () => {
  it("finds the topic for an info tip's text", () => {
    expect(guideTopicFor(HELP.cfgScale)).toBe("settings/cfg-scale");
    expect(guideTopicFor(HELP.font)).toBeUndefined();
  });
});

describe("searchGuide", () => {
  it("finds nothing for an empty query", () => {
    expect(searchGuide("  ", CHAPTERS)).toEqual([]);
  });

  it("puts the explaining topic first", () => {
    expect(ids("pickle")[0]).toBe("getting-models/file-formats");
    expect(ids("textual inversion")[0]).toBe("models/embedding");
    expect(ids("vram")[0]).toBe("hardware/graphics-memory");
  });

  it("requires every word", () => {
    const hits = ids("lora folder");
    expect(hits).toContain("getting-models/folders");
    expect(hits).not.toContain("hardware/speed");
  });

  it("ignores case and picks a matching snippet", () => {
    const [hit] = searchGuide("SAFETENSORS", CHAPTERS);
    expect(hit?.snippet.toLowerCase()).toContain("safetensors");
  });
});
