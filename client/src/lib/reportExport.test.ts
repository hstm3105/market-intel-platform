import { describe, expect, it } from "vitest";
import { buildReportSections, filenameStem, resolveEmergingRisks, type MarketScanReport } from "./reportExport";

const report: MarketScanReport = {
  industryName: "FinTech", scope: "Payments infrastructure", createdAt: "2026-08-20", sources: [], competitors: [],
  analysis: { executiveSummary: "Summary", keyPlayers: [{ name: "Network A", segment: "Payments", positioning: "Scale", strategicSignal: "AI", sourceIds: ["S1"] }], trends: [{ title: "AI", detail: "Adoption", strategicImplication: "Prioritize ROI", sourceIds: ["S1"] }], risks: [{ title: "Risk", detail: "Exposure", likelihood: "Medium", impact: "High", sourceIds: ["S2"] }], emergingRisks: [{ rank: 1, title: "Risk", summary: "Exposure", severity: "High", watchSignal: "Watch losses", sourceIds: ["S2"] }], opportunities: [{ title: "Opportunity", detail: "Pilot", priority: "High", sourceIds: ["S3"] }], landscape: { marketDefinition: "Definition", segments: [], incumbentPositioning: "Trust", challengerPositioning: "Speed", marketSizeSignals: [] }, executiveBrief: { headline: "A FinTech perspective", narrative: "Narrative", imperatives: [], clientQuestions: [] } },
};

describe("market scan report exports", () => {
  it("builds a stable, portable filename from the industry name", () => expect(filenameStem(report)).toBe("fintech-intelligence-report"));
  it("creates source-aware sections spanning key research outputs", () => {
    const sections = buildReportSections(report);
    expect(sections.map(section => section.heading)).toEqual(["Top three emerging risks", "Key players", "Emerging trends", "Risks to monitor", "Strategic opportunities"]);
    expect(sections[0]?.items[0]).toContain("Watch losses");
    expect(sections[1]?.items[0]).toContain("[S1]");
  });

  it("sorts the synthesized risk ranking and falls back safely for legacy scans", () => {
    const ranked = resolveEmergingRisks({ ...report.analysis, emergingRisks: [
      { rank: 3, title: "Third", summary: "Third summary", severity: "Medium", watchSignal: "Watch third", sourceIds: ["S3"] },
      { rank: 1, title: "First", summary: "First summary", severity: "High", watchSignal: "Watch first", sourceIds: ["S1"] },
    ] });
    const legacy = resolveEmergingRisks({ ...report.analysis, emergingRisks: undefined });

    expect(ranked.map(risk => risk.rank)).toEqual([1, 3]);
    expect(legacy[0]).toMatchObject({ rank: 1, title: "Risk", sourceIds: ["S2"] });
  });
});
