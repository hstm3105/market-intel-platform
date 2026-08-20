import { describe, expect, it } from "vitest";
import { analyzeSourceIntelligence, scoreSource } from "./sourceIntelligence";

const asOf = new Date("2026-08-20T00:00:00.000Z");

describe("source intelligence", () => {
  it("ranks public authorities above unverified publishers and exposes deterministic recency", () => {
    const regulator = scoreSource({ id: "S1", title: "Consumer protection update", publisher: "Financial Conduct Authority", publishedAt: "2026-08-01", url: "https://www.fca.org.uk/news" }, asOf);
    const unknown = scoreSource({ id: "S2", title: "Market commentary", publisher: "Unknown Blog", publishedAt: "2024-01-01", url: "https://example-blog.test/post" }, asOf);
    expect(regulator).toMatchObject({ tier: "authoritative", recency: "current" });
    expect(regulator.authorityScore).toBeGreaterThan(unknown.authorityScore);
    expect(unknown).toMatchObject({ tier: "unverified", recency: "aging" });
  });

  it("summarizes source diversity, traceability, and evidence confidence without asserting factual truth", () => {
    const summary = analyzeSourceIntelligence([
      { id: "S1", title: "Policy update", publisher: "FCA", publishedAt: "2026-08-01", url: "https://www.fca.org.uk/news" },
      { id: "S2", title: "Market report", publisher: "Reuters", publishedAt: "2026-08-10", url: "https://www.reuters.com/markets" },
      { id: "S3", title: "Research note", publisher: "Industry Research", publishedAt: "", url: "https://research.example.com/note" },
    ], asOf);
    expect(summary).toMatchObject({ totalSources: 3, uniquePublishers: 3, currentSources: 2, traceableSources: 3 });
    expect(summary.score).toBeGreaterThan(55);
    expect(summary.governanceNote).toContain("not the truth of individual claims");
  });
});
