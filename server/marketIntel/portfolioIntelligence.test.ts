import { describe, expect, it } from "vitest";
import { summarizePortfolio } from "../../shared/portfolioIntelligence";

const evidence = (score: number) => ({ score, confidence: "high" as const, totalSources: 4, uniquePublishers: 3, currentSources: 3, traceableSources: 4, tierCounts: { authoritative: 1, established: 2, specialist: 1, unverified: 0 }, quality: [], governanceNote: "Evidence quality and coverage are not the truth of individual claims." });

describe("portfolio aggregation", () => {
  it("calculates deterministic source confidence, high-risk concentration, industry coverage, and shared themes", () => {
    const result = summarizePortfolio([
      { id: "one", industryName: "FinTech", createdAt: "2026-08-20", sourceIntelligence: evidence(80), emergingRisks: [{ title: "Regulatory change", severity: "High" }], risks: [{ title: "AI governance", impact: "High" }] },
      { id: "two", industryName: "Energy", createdAt: "2026-08-19", sourceIntelligence: evidence(60), emergingRisks: [{ title: "Regulatory change", severity: "Medium" }], risks: [] },
    ]);
    expect(result).toMatchObject({ scanCount: 2, industryCount: 2, averageSourceConfidence: 70, highRiskCount: 2 });
    expect(result.sharedRiskThemes[0]).toMatchObject({ title: "Regulatory change", industries: ["Energy", "FinTech"] });
    expect(result.industryBreakdown.find(item => item.industry === "FinTech")).toMatchObject({ highRiskCount: 2, averageSourceConfidence: 80 });
  });
});
