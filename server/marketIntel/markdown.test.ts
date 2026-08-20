import { describe, expect, it } from "vitest";
import { renderBriefMarkdown, renderCompetitorMarkdown } from "./markdown";

const analysis = {
  executiveSummary: "A concise market read.", keyPlayers: [], trends: [], risks: [], opportunities: [],
  landscape: { marketDefinition: "A market.", segments: [], incumbentPositioning: "Established", challengerPositioning: "Emerging", marketSizeSignals: [] },
  executiveBrief: { headline: "A headline", narrative: "A perspective.", imperatives: ["Act"], clientQuestions: ["Why now?"] },
  competitors: [{ name: "Acme", segment: "Platform", businessModel: "Subscription", positioning: "Premium", strengths: ["Scale"], weaknesses: ["Complexity"], recentMoves: ["Expanded"], strategicSignals: ["Partnering"] }],
};

describe("renderCompetitorMarkdown", () => {
  it("renders a structured profile and references scan sources", () => {
    const markdown = renderCompetitorMarkdown("Acme", analysis, [{ id: "S1", title: "Source", publisher: "Publisher", publishedAt: "", url: "https://example.com", excerpt: "" }]);
    expect(markdown).toContain("# Acme — Competitor Profile");
    expect(markdown).toContain("Subscription");
    expect(markdown).toContain("[Source](https://example.com)");
  });
});

describe("renderBriefMarkdown", () => {
  it("creates a consultant-ready brief with a traceable source section", () => {
    const markdown = renderBriefMarkdown({
      id: "scan-1", userId: 1, industrySlug: "saas", industryName: "SaaS", projectName: null, scope: "Growth strategy", status: "ready", executiveSummary: "A concise market read.", sourceJson: "[]", analysisJson: "{}", createdAt: new Date("2026-08-20"), updatedAt: new Date("2026-08-20"),
    }, analysis, [{ id: "S1", title: "Source", publisher: "Publisher", publishedAt: "", url: "https://example.com", excerpt: "" }]);
    expect(markdown).toContain("# SaaS — Industry Perspective");
    expect(markdown).toContain("## Sources");
    expect(markdown).toContain("[S1] [Source](https://example.com)");
  });
});
