import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), insert: vi.fn(), values: vi.fn(), onDuplicateKeyUpdate: vi.fn(), select: vi.fn(), from: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { listAuditEvents, recordAuditEvent, updateRetentionPolicy } from "./governance";

describe("governance audit persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onDuplicateKeyUpdate.mockResolvedValue(undefined);
    mocks.values.mockReturnValue({ onDuplicateKeyUpdate: mocks.onDuplicateKeyUpdate });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.limit.mockResolvedValue([]);
    mocks.orderBy.mockReturnValue({ limit: mocks.limit });
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy, limit: mocks.limit });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.getDb.mockResolvedValue({ insert: mocks.insert, select: mocks.select });
  });

  it("stores event type, resource type, actor, and only the active organization identifier", async () => {
    await recordAuditEvent("org-consulting", 42, { eventType: "knowledge.asset.created", resourceType: "knowledge_asset", resourceId: "asset-7", metadata: { kind: "insight", linkedScans: 2, sensitive: { unsupported: true } as never } });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-consulting", actorUserId: 42, eventType: "knowledge.asset.created", resourceType: "knowledge_asset", resourceId: "asset-7", metadataJson: JSON.stringify({ kind: "insight", linkedScans: 2 }) }));
  });

  it("excludes mixed-organization audit rows even if an underlying persistence adapter returns them together", async () => {
    mocks.limit.mockResolvedValue([{ id: "event-private", organizationId: "org-private", actorUserId: 4, eventType: "research.scan.created", resourceType: "market_scan", resourceId: "scan-1", metadataJson: "{\"sources\":3}", createdAt: new Date() }, { id: "event-foreign", organizationId: "org-foreign", actorUserId: 9, eventType: "export.pdf.generated", resourceType: "market_scan", resourceId: "scan-9", metadataJson: "{}", createdAt: new Date() }]);
    const events = await listAuditEvents("org-private", 75);
    expect(mocks.where).toHaveBeenCalledTimes(1);
    expect(mocks.orderBy).toHaveBeenCalledTimes(1);
    expect(mocks.limit).toHaveBeenCalledWith(75);
    expect(events).toEqual([expect.objectContaining({ id: "event-private", organizationId: "org-private", metadata: { sources: 3 } })]);
  });

  it("upserts a policy for the active organization, records the policy change, and returns the persisted controls", async () => {
    const persisted = { id: "policy-1", organizationId: "org-private", researchRetentionDays: 365, knowledgeRetentionDays: 730, auditRetentionDays: 1095, legalHoldEnabled: true, updatedByUserId: 7, createdAt: new Date(), updatedAt: new Date() };
    mocks.limit.mockResolvedValue([persisted]);
    const policy = await updateRetentionPolicy("org-private", 7, { researchRetentionDays: 365, knowledgeRetentionDays: 730, auditRetentionDays: 1095, legalHoldEnabled: true });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-private", updatedByUserId: 7, legalHoldEnabled: true }));
    expect(mocks.onDuplicateKeyUpdate).toHaveBeenCalledWith(expect.objectContaining({ set: expect.objectContaining({ updatedByUserId: 7, auditRetentionDays: 1095, legalHoldEnabled: true }) }));
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ eventType: "governance.retention_policy.updated", resourceType: "retention_policy", organizationId: "org-private" }));
    expect(policy).toEqual(persisted);
  });
});
