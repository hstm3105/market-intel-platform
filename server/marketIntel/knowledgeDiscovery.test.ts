import { describe, expect, it } from "vitest";
import { filterKnowledgeAssets, normalizeTags, tagDirectory } from "../../shared/knowledgeDiscovery";

const assets = [
  { id: "a", title: "FinTech operating model", content: "A source-linked banking conclusion", kind: "insight" as const, status: "published" as const, tags: ["fintech", "operating-model"] },
  { id: "b", title: "Consumer channel brief", content: "Retail growth evidence", kind: "brief" as const, status: "published" as const, tags: ["consumer", "growth"] },
];

describe("knowledge discovery contracts", () => {
  it("normalizes and de-duplicates consultant-entered tags", () => {
    expect(normalizeTags([" FinTech ", "operating model", "fintech", "", "M&A / Strategy"])).toEqual(["fintech", "operating-model", "m-a-strategy"]);
  });

  it("filters private asset candidates by text, tags, and type without widening the supplied result set", () => {
    expect(filterKnowledgeAssets(assets, { query: "banking", tags: ["operating model"], kinds: ["insight"] }).map(asset => asset.id)).toEqual(["a"]);
    expect(filterKnowledgeAssets(assets, { tags: ["consumer"], kinds: ["insight"] })).toEqual([]);
    expect(tagDirectory(assets)).toEqual([{ tag: "consumer", count: 1 }, { tag: "fintech", count: 1 }, { tag: "growth", count: 1 }, { tag: "operating-model", count: 1 }]);
  });
});
