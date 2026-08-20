import type { TrpcContext } from "../_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ active: vi.fn(), overview: vi.fn(), configure: vi.fn(), createTemplate: vi.fn(), createSnapshot: vi.fn(), audit: vi.fn() }));
vi.mock("./organization", () => ({ getActiveOrganization: mocks.active, addExistingMember: vi.fn(), switchOrganization: vi.fn(), canCreateResearch: vi.fn(() => true), canManageMembers: vi.fn((role: string) => role === "owner" || role === "admin"), changeMemberRole: vi.fn(), listMembers: vi.fn(), listOrganizations: vi.fn() }));
vi.mock("./governance", () => ({ getGovernanceOverview: vi.fn(), recordAuditEvent: mocks.audit, runRetention: vi.fn(), updateRetentionPolicy: vi.fn() }));
vi.mock("./integrationsDelivery", () => ({ listIntegrationDelivery: mocks.overview, configureIntegration: mocks.configure, createDeliveryTemplate: mocks.createTemplate, createDeliverySnapshot: mocks.createSnapshot }));

import { marketIntelRouter } from "./router";

const context = (): TrpcContext => ({ user: { id: 11, openId: "delivery-user", name: "Delivery user", email: "delivery@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const activeFor = (role: "owner" | "admin" | "research_lead" | "viewer") => ({ organization: { id: "org-delivery", name: "Delivery", ownerUserId: 11 }, membership: { organizationId: "org-delivery", userId: 11, role } });

describe("marketIntel delivery controls", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.active.mockResolvedValue(activeFor("admin")); mocks.overview.mockResolvedValue({ integrations: [], templates: [], snapshots: [] }); mocks.configure.mockResolvedValue({ id: "integration-1", status: "connection_required" }); mocks.createTemplate.mockResolvedValue({ id: "template-1" }); mocks.createSnapshot.mockResolvedValue({ id: "snapshot-1", contentDigest: "digest" }); });

  it("scopes delivery overview to the active organization", async () => {
    await marketIntelRouter.createCaller(context()).delivery.overview();
    expect(mocks.overview).toHaveBeenCalledWith("org-delivery");
  });

  it("blocks viewers from configuring external destinations", async () => {
    mocks.active.mockResolvedValue(activeFor("viewer"));
    await expect(marketIntelRouter.createCaller(context()).delivery.configureIntegration({ provider: "slack", displayName: "Slack", configuration: {}, enabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.configure).not.toHaveBeenCalled();
  });

  it("records an immutable approval snapshot against the active organization", async () => {
    mocks.active.mockResolvedValue(activeFor("research_lead"));
    await marketIntelRouter.createCaller(context()).delivery.createSnapshot({ targetType: "market_scan", targetId: "scan-private", outputFormat: "pdf" });
    expect(mocks.createSnapshot).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-delivery", approvedByUserId: 11, targetId: "scan-private" }));
    expect(mocks.audit).toHaveBeenCalledWith("org-delivery", 11, expect.objectContaining({ eventType: "delivery.snapshot.approved", resourceId: "snapshot-1" }));
  });
});
