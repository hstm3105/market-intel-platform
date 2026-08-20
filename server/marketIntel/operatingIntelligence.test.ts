import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), select: vi.fn(), from: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { getOperatingIntelligence, reuseEvidenceRunAsKnowledge } from "./operatingIntelligence";

describe("portfolio operating intelligence privacy", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getDb.mockResolvedValue({ select: mocks.select }); });

  it("filters mixed-organization mandate templates and signal alerts at the service boundary", async () => {
    const privateTemplate = { id: "template-private", organizationId: "org-private", name: "Private", description: "Private template", defaultPriority: "standard", defaultTargetDays: 30, createdAt: new Date(), updatedAt: new Date() }; const foreignTemplate = { ...privateTemplate, id: "template-foreign", organizationId: "org-foreign" }; const privateAlert = { id: "alert-private", organizationId: "org-private", resourceIdsJson: "[\"scan-a\"]", createdAt: new Date(), updatedAt: new Date() }; const foreignAlert = { ...privateAlert, id: "alert-foreign", organizationId: "org-foreign" };
    mocks.select.mockReturnValue({ from: mocks.from }); mocks.from.mockReturnValueOnce({ where: () => ({ orderBy: () => Promise.resolve([privateTemplate, foreignTemplate]) }) }).mockReturnValueOnce({ where: () => ({ orderBy: () => ({ limit: () => Promise.resolve([privateAlert, foreignAlert]) }) }) });
    await expect(getOperatingIntelligence("org-private")).resolves.toEqual({ templates: [privateTemplate], alerts: [expect.objectContaining({ id: "alert-private", resourceIds: ["scan-a"] })] });
  });

  it("rejects a foreign evidence agent run before it can become reusable knowledge", async () => {
    mocks.select.mockReturnValue({ from: mocks.from }); mocks.from.mockReturnValue({ where: () => ({ limit: () => Promise.resolve([]) }) });
    await expect(reuseEvidenceRunAsKnowledge("org-private", 6, "run-foreign")).rejects.toThrow(/outside the active organization/i);
  });
});
