import { describe, expect, it, vi } from "vitest";

const output = vi.hoisted(() => ({ pdfText: [] as unknown[][], pdfSave: vi.fn(), pptText: [] as unknown[][], pptWrite: vi.fn() }));

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } };
    addPage() {}; setFillColor() {}; rect() {}; setFont() {}; setFontSize() {}; setTextColor() {}; setDrawColor() {}; line() {};
    splitTextToSize(value: string) { return [value]; }
    text(...args: unknown[]) { output.pdfText.push(args); }
    getNumberOfPages() { return 1; } setPage() {}; save(...args: unknown[]) { output.pdfSave(...args); }
  },
}));

vi.mock("pptxgenjs", () => {
  class PptxMock {
    ShapeType = { rect: "rect", roundRect: "roundRect" };
    addSlide() { return { background: {}, addText: (...args: unknown[]) => output.pptText.push(args), addShape: () => undefined }; }
    writeFile(...args: unknown[]) { output.pptWrite(...args); return Promise.resolve(); }
  }
  return { default: PptxMock };
});

import { exportMarketScanPdf, exportMarketScanPptx, sourceGovernanceSummary, type MarketScanReport } from "./reportExport";

const report: MarketScanReport = {
  industryName: "FinTech", scope: "Payments infrastructure", createdAt: "2026-08-20T00:00:00.000Z", competitors: [],
  sources: [
    { id: "S1", title: "Policy update", publisher: "FCA", publishedAt: "2026-08-01", url: "https://www.fca.org.uk/news" },
    { id: "S2", title: "Market report", publisher: "Reuters", publishedAt: "2026-08-10", url: "https://www.reuters.com/markets" },
  ],
  analysis: { executiveSummary: "Summary", keyPlayers: [], trends: [], risks: [], opportunities: [], landscape: { marketDefinition: "Definition", segments: [], incumbentPositioning: "Trust", challengerPositioning: "Speed", marketSizeSignals: [] }, executiveBrief: { headline: "A FinTech perspective", narrative: "Narrative", imperatives: [], clientQuestions: [] } },
};

const flattened = (calls: unknown[][]) => calls.flatMap(call => call.flatMap(value => Array.isArray(value) ? value : [value])).filter((value): value is string => typeof value === "string").join(" ");

describe("rendered report source governance", () => {
  it("writes source-confidence and governance language into the PDF output", async () => {
    output.pdfText.length = 0; output.pdfSave.mockClear(); const expected = sourceGovernanceSummary(report);
    await exportMarketScanPdf(report);
    const text = flattened(output.pdfText);
    expect(text).toContain(`EVIDENCE CONFIDENCE ${expected.intelligence.score}/100`);
    expect(text).toContain("not the truth of individual claims");
    expect(output.pdfSave).toHaveBeenCalledOnce();
  });

  it("writes source-confidence and governance language into the PowerPoint output", async () => {
    output.pptText.length = 0; output.pptWrite.mockClear(); const expected = sourceGovernanceSummary(report);
    await exportMarketScanPptx(report);
    const text = flattened(output.pptText);
    expect(text).toContain(`EVIDENCE CONFIDENCE  ${expected.intelligence.score}/100`);
    expect(text).toContain("not the truth of individual claims");
    expect(output.pptWrite).toHaveBeenCalledOnce();
  });
});
