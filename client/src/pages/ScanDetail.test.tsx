import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SourceIntelligenceSummary } from "../../../shared/sourceIntelligence";
import { SourceGovernancePanel } from "./ScanDetail";

const evidence: SourceIntelligenceSummary = {
  score: 78, confidence: "high", totalSources: 4, uniquePublishers: 3, currentSources: 3, traceableSources: 4,
  tierCounts: { authoritative: 1, established: 2, specialist: 1, unverified: 0 }, quality: [],
  governanceNote: "Evidence quality and coverage are not the truth of individual claims.",
};

describe("scan detail source governance", () => {
  it("renders confidence, authority, recency, diversity, and traceability for the active scan", () => {
    const markup = renderToStaticMarkup(<SourceGovernancePanel evidence={evidence} onReview={() => undefined} />);
    ["Evidence confidence", "78/100", "Authority", "Recency", "Diversity", "Traceability", "Review sources"].forEach(label => expect(markup).toContain(label));
    expect(markup).toContain("1 authoritative");
    expect(markup).toContain("2 established");
  });
});
