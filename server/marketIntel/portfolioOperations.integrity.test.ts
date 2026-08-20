import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), select: vi.fn(), update: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { createMandate, updatePortfolioPolicy } from "./portfolioOperations";

const policy = { id: "policy-a", organizationId: "org-a", maxActiveMandates: 1, requireMandateOwner: true, requireReviewForCritical: true, updatedByUserId: 1, createdAt: new Date(), updatedAt: new Date() };
const limitChain = (value: unknown) => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(value) }) }) });
const directChain = (value: unknown) => ({ from: () => ({ where: () => Promise.resolve(value) }) });

describe("portfolio operation integrity", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getDb.mockResolvedValue({ select: mocks.select, update: mocks.update }); });
  it("persists policy values and returns the latest organization-scoped policy", async () => {
    const updated = { ...policy, maxActiveMandates: 12, requireMandateOwner: false, requireReviewForCritical: false, updatedByUserId: 9 };
    const where = vi.fn().mockResolvedValue(undefined); const set = vi.fn().mockReturnValue({ where }); mocks.update.mockReturnValue({ set });
    mocks.select.mockReturnValueOnce(limitChain([policy])).mockReturnValueOnce(limitChain([updated]));
    await expect(updatePortfolioPolicy({ organizationId: "org-a", updatedByUserId: 9, maxActiveMandates: 12, requireMandateOwner: false, requireReviewForCritical: false })).resolves.toEqual(updated);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ maxActiveMandates: 12, requireMandateOwner: false, requireReviewForCritical: false, updatedByUserId: 9 }));
    expect(where).toHaveBeenCalledTimes(1);
  });
  it("rejects new active mandates once the organization capacity is reached", async () => {
    mocks.select.mockReturnValueOnce(limitChain([policy])).mockReturnValueOnce(limitChain([{ organizationId: "org-a", userId: 1 }])).mockReturnValueOnce(directChain([{ id: "already-active" }]));
    await expect(createMandate({ organizationId: "org-a", createdByUserId: 1, ownerUserId: 1, name: "Capacity test", clientLabel: "Internal", description: "A sufficiently detailed mandate description.", status: "active", priority: "standard", scanIds: [], knowledgeAssetIds: [] })).rejects.toThrow("active-mandate capacity");
  });
  it("rejects foreign scan references before an organization mandate can be created", async () => {
    mocks.select.mockReturnValueOnce(limitChain([policy])).mockReturnValueOnce(limitChain([{ organizationId: "org-a", userId: 1 }])).mockReturnValueOnce(directChain([]));
    await expect(createMandate({ organizationId: "org-a", createdByUserId: 1, ownerUserId: 1, name: "Reference test", clientLabel: "Internal", description: "A sufficiently detailed mandate description.", status: "scoping", priority: "standard", scanIds: ["foreign-scan"], knowledgeAssetIds: [] })).rejects.toThrow("outside the active organization");
  });
  it("rejects a mandate owner who is not a member of the active organization", async () => {
    mocks.select.mockReturnValueOnce(limitChain([policy])).mockReturnValueOnce(limitChain([]));
    await expect(createMandate({ organizationId: "org-a", createdByUserId: 1, ownerUserId: 44, name: "Owner test", clientLabel: "Internal", description: "A sufficiently detailed mandate description.", status: "scoping", priority: "standard", scanIds: [], knowledgeAssetIds: [] })).rejects.toThrow("selected mandate owner is outside");
  });
  it("rejects foreign knowledge-asset references before an organization mandate can be created", async () => {
    mocks.select.mockReturnValueOnce(limitChain([policy])).mockReturnValueOnce(limitChain([{ organizationId: "org-a", userId: 1 }])).mockReturnValueOnce(directChain([]));
    await expect(createMandate({ organizationId: "org-a", createdByUserId: 1, ownerUserId: 1, name: "Knowledge reference test", clientLabel: "Internal", description: "A sufficiently detailed mandate description.", status: "scoping", priority: "standard", scanIds: [], knowledgeAssetIds: ["foreign-asset"] })).rejects.toThrow("outside the active organization");
  });
});
