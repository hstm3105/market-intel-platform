import { describe, expect, it } from "vitest";
import { validateClaims } from "./orchestration";

const scans = [{ id: "scan-a", industryName: "FinTech", scope: "Evidence scope", sources: [{ id: "S1", title: "Source", publisher: "Publisher", publishedAt: "2026-08-20", url: "https://example.com/source", excerpt: "Evidence" }], analysis: { trends: [], risks: [] } as any }];

describe("evidence orchestration claim validation", () => {
  it("keeps claims organization-run safe by dropping foreign scans and unrecognized source references", () => {
    const claims = validateClaims({ claims: [
      { scanId: "scan-a", claim: "A valid supported claim", assessment: "supported", confidence: 88, sourceIds: ["scan-a:S1", "scan-b:S9"], counterSourceIds: ["scan-b:S10"], rationale: "One private source supports it." },
      { scanId: "scan-b", claim: "Foreign scan claim", assessment: "corroborated", confidence: 99, sourceIds: ["scan-b:S1"], counterSourceIds: [], rationale: "Should be rejected." },
      { scanId: "scan-a", claim: "Uncited claim", assessment: "supported", confidence: 77, sourceIds: ["scan-b:S9"], counterSourceIds: [], rationale: "Source is not in the packet." },
    ] }, scans);
    expect(claims).toEqual([
      expect.objectContaining({ scanId: "scan-a", assessment: "supported", confidence: 88, sourceIds: ["scan-a:S1"], counterSourceIds: [] }),
      expect.objectContaining({ scanId: "scan-a", assessment: "insufficient", confidence: 0, sourceIds: [] }),
    ]);
  });
});
