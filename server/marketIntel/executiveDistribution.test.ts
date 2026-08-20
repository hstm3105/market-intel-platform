import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), select: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { approveExecutiveBriefing, executiveSchedule, getExecutiveBriefingOverview, nextExecutiveRunAt, sanitizeExecutiveBrief } from "./executiveDistribution";

const chain = (value: unknown) => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(value), orderBy: () => ({ limit: () => Promise.resolve(value) }) }) }) });
const privateBrief = { id: "brief-private", organizationId: "org-private", settingId: "setting-private", generatedByUserId: 7, trigger: "on_demand", reviewStatus: "draft", periodLabel: "On-demand briefing", title: "Private title", contentJson: JSON.stringify({ headline: "Private title", briefingSummary: "Private summary", priorityMoves: [], watchSignals: [], uncertainty: "Private uncertainty" }), citationsJson: "[]", sourceScanIdsJson: "[]", evidenceDigest: "digest", model: "gpt-5-mini", approvedByUserId: null, approvedAt: null, distributedByUserId: null, distributedAt: null, createdAt: new Date(), updatedAt: new Date() };

describe("executive distribution boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getDb.mockResolvedValue({ select: mocks.select }); });

  it("keeps only supplied evidence references in generated executive content", () => {
    const brief = sanitizeExecutiveBrief({ headline: "Portfolio focus", briefingSummary: "Use the confirmed evidence.", priorityMoves: [{ title: "Move", rationale: "Reason", evidenceRefs: ["scan-a:S1", "scan-foreign:S9"] }], watchSignals: [{ title: "Watch", rationale: "Reason", evidenceRefs: ["scan-a:S2"] }], uncertainty: "Evidence is limited." }, new Set(["scan-a:S1", "scan-a:S2"]));
    expect(brief.priorityMoves[0]?.evidenceRefs).toEqual(["scan-a:S1"]);
    expect(brief.watchSignals[0]?.evidenceRefs).toEqual(["scan-a:S2"]);
  });

  it("returns only executive briefings owned by the active organization", async () => {
    const foreign = { ...privateBrief, id: "brief-foreign", organizationId: "org-foreign", title: "Foreign title" };
    mocks.select.mockReturnValue(chain([privateBrief, foreign]));
    await expect(getExecutiveBriefingOverview("org-private", 7)).resolves.toMatchObject({ settings: expect.objectContaining({ organizationId: "org-private" }), briefings: [expect.objectContaining({ id: "brief-private", organizationId: "org-private" })] });
  });

  it("rejects approval of a briefing outside the active organization", async () => {
    mocks.select.mockReturnValue(chain([]));
    await expect(approveExecutiveBriefing("org-private", 7, "brief-foreign")).rejects.toThrow(/outside the active organization/i);
  });

  it("uses the stated 09:00 IST Monday cadence for weekly executive briefings", () => {
    expect(executiveSchedule("weekly").cron).toBe("0 30 3 * * 1");
    expect(nextExecutiveRunAt("weekly", new Date("2026-08-20T00:00:00.000Z")).toISOString()).toBe("2026-08-24T03:30:00.000Z");
  });
});
