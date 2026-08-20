import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), insertValues: vi.fn(), setValues: vi.fn(), updateWhere: vi.fn(), updateTables: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { getActiveOrganization, legacyResearchTableNames, legacyResearchTables } from "./organization";

function makeDb() {
  const results = [[{ id: 41, name: "Avery Patel", activeOrganizationId: null }], []];
  const select = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => { const result = results.shift() ?? []; return { limit: vi.fn().mockResolvedValue(result), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) }; }) })) }));
  const insert = vi.fn(() => ({ values: mocks.insertValues.mockResolvedValue(undefined) }));
  const update = vi.fn(table => { mocks.updateTables(table); return { set: vi.fn(values => { mocks.setValues(values); return { where: mocks.updateWhere.mockResolvedValue(undefined) }; }) }; });
  return { select, insert, update };
}

describe("getActiveOrganization bootstrap", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getDb.mockResolvedValue(makeDb() as never); });

  it("creates an owner organization, assigns the active workspace, and backfills all legacy research tables", async () => {
    const result = await getActiveOrganization(41, "Avery Patel");

    expect(result.organization.name).toBe("Avery Intelligence");
    expect(result.membership.role).toBe("owner");
    expect(mocks.insertValues).toHaveBeenCalledTimes(2);
    expect(mocks.insertValues).toHaveBeenNthCalledWith(1, expect.objectContaining({ ownerUserId: 41, name: "Avery Intelligence" }));
    expect(mocks.insertValues).toHaveBeenNthCalledWith(2, expect.objectContaining({ userId: 41, role: "owner" }));
    expect(mocks.setValues).toHaveBeenCalledWith(expect.objectContaining({ activeOrganizationId: result.organization.id }));
    expect(mocks.updateWhere).toHaveBeenCalledTimes(8);
    expect(legacyResearchTableNames).toEqual(["trackedIndustries", "researchProjects", "marketScans", "researchArtifacts", "competitorProfiles", "researchNotes", "chatMessages"]);
    for (const { table } of legacyResearchTables) expect(mocks.updateTables).toHaveBeenCalledWith(table);
  });
});
