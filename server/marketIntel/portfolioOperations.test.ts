import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), select: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { listPortfolioOperations } from "./portfolioOperations";

const policy = { id: "policy-a", organizationId: "org-a", maxActiveMandates: 6, requireMandateOwner: true, requireReviewForCritical: true, updatedByUserId: 1, createdAt: new Date(), updatedAt: new Date() };
const mandate = { id: "mandate-a", organizationId: "org-a", createdByUserId: 1, ownerUserId: 1, name: "Private mandate", clientLabel: "Client label", description: "Private research mandate", status: "active", priority: "high", targetDate: null, scanIdsJson: "[\"scan-a\"]", knowledgeAssetIdsJson: "[\"asset-a\"]", createdAt: new Date(), updatedAt: new Date() };
const watch = { id: "watch-a", organizationId: "org-a", mandateId: "mandate-a", createdByUserId: 1, ownerUserId: 1, targetType: "risk_theme", label: "Funding risk", rationale: "Monitor evidence", status: "escalated", createdAt: new Date(), updatedAt: new Date() };
const policyChain = (value: unknown) => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(value) }) }) });
const listChain = (value: unknown) => ({ from: () => ({ where: () => ({ orderBy: () => Promise.resolve(value) }) }) });

describe("portfolio operations service", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getDb.mockResolvedValue({ select: mocks.select }); });
  it("filters mixed-organization mandates and watchlists before returning the portfolio overview", async () => {
    mocks.select.mockReturnValueOnce(listChain([mandate, { ...mandate, id: "mandate-b", organizationId: "org-b" }])).mockReturnValueOnce(listChain([watch, { ...watch, id: "watch-b", organizationId: "org-b" }])).mockReturnValueOnce(policyChain([policy]));
    const overview = await listPortfolioOperations("org-a", 1);
    expect(overview.mandates).toEqual([expect.objectContaining({ id: "mandate-a", organizationId: "org-a", scanIds: ["scan-a"], knowledgeAssetIds: ["asset-a"] })]);
    expect(overview.watchlists).toEqual([expect.objectContaining({ id: "watch-a", organizationId: "org-a" })]);
    expect(overview.metrics).toMatchObject({ activeMandates: 1, escalatedWatchlists: 1, capacity: 6 });
  });
});
