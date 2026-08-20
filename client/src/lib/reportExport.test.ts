import { describe, expect, it } from "vitest";
import { buildReportSections, filenameStem, type MarketScanReport } from "./reportExport";

const report: MarketScanReport = {
  industryName: "FinTech", scope: "Payments infrastructure", createdAt: "2026-08-20", sources: [], competitors: [],
  analysis: { executiveSummary: "Summary", keyPlayers: [{ name: "Network A", segment: "Payments", positioning: "Scale", strategicSignal: "AI", sourceIds: ["S1"] }], trends: [{ title: "AI", detail: "Adoption", strategicImplication: "Prioritize ROI", sourceIds: ["S1"] }], risks: [{ title: "Risk", detail: "Exposure", likelihood: "Medium", impact: "High", sourceIds: ["S2"] }], opportunities: [{ title: "Opportunity", detail: "Pilot", priority: "High", sourceIds: ["S3"] }], landscape: { marketDefinition: "Definition", segments: [], incumbentPositioning: "Trust", challengerPositioning: "Speed", marketSizeSignals: [] }, executiveBrief: { headline: "A FinTech perspective", narrative: "Narrative", imperatives: [], clientQuestions: [] } },
};

describe("market scan report exports", () => {
  it("builds a stable, portable filename from the industry name", () => expect(filenameStem(report)).toBe("fintech-intelligence-report"));
  it("creates source-aware sections spanning key research outputs", () => {
    const sections = buildReportSections(report);
    expect(sections.map(section => section.heading)).toEqual(["Key players", "Emerging trends", "Risks to monitor", "Strategic opportunities"]);
    expect(sections[0]?.items[0]).toContain("[S1]");
  });
});
