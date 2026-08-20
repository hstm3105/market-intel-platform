import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ active: vi.fn(), overview: vi.fn(), updateRetention: vi.fn(), audit: vi.fn(), getScan: vi.fn() }));
vi.mock("./db", () => ({ addChatTurn: vi.fn(), addNote: vi.fn(), dashboard: vi.fn(), getScan: mocks.getScan, listTrackedIndustries: vi.fn(), listWorkspace: vi.fn(), saveScanPackage: vi.fn(), setTrackedIndustry: vi.fn() }));
vi.mock("./research", () => ({ answerResearchQuestion: vi.fn(), collectPublicSources: vi.fn(), generateMarketScan: vi.fn() }));
vi.mock("./knowledge", () => ({ createKnowledgeAsset: vi.fn(), createKnowledgeCollection: vi.fn(), listKnowledge: vi.fn(), listPortfolioViews: vi.fn(), portfolioSnapshot: vi.fn(), savePortfolioView: vi.fn(), searchKnowledge: vi.fn(), updateKnowledgeAssetTags: vi.fn() }));
vi.mock("./monitoring", () => ({ createMonitoredIndustry: vi.fn(), deleteMonitoredIndustry: vi.fn(), getMonitoringPreferences: vi.fn(), listAlerts: vi.fn(), listMonitoredIndustries: vi.fn(), markAlertRead: vi.fn(), runMonitoredScan: vi.fn(), unreadAlertCount: vi.fn(), updateMonitoredIndustry: vi.fn(), updateMonitoringPreferences: vi.fn() }));
vi.mock("./organization", () => ({ getActiveOrganization: mocks.active, addExistingMember: vi.fn(), switchOrganization: vi.fn(), canCreateResearch: vi.fn(() => true), canManageMembers: vi.fn((role: string) => role === "owner" || role === "admin"), changeMemberRole: vi.fn(), listMembers: vi.fn(), listOrganizations: vi.fn() }));
vi.mock("./governance", () => ({ getGovernanceOverview: mocks.overview, recordAuditEvent: mocks.audit, updateRetentionPolicy: mocks.updateRetention }));

import { marketIntelRouter } from "./router";

const context = (): TrpcContext => ({ user: { id: 5, openId: "consultant", name: "Consultant", email: "consultant@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const activeFor = (role: "owner" | "admin" | "viewer") => ({ organization: { id: "org-private", name: "Private", ownerUserId: 5 }, membership: { organizationId: "org-private", userId: 5, role } });

describe("marketIntel governance controls", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.active.mockResolvedValue(activeFor("admin")); mocks.overview.mockResolvedValue({ policy: {}, events: [] }); mocks.updateRetention.mockResolvedValue({ organizationId: "org-private" }); mocks.getScan.mockResolvedValue({ scan: { id: "scan-1" } }); });

  it("scopes the audit overview to the caller’s active organization", async () => {
    await marketIntelRouter.createCaller(context()).governance.overview();
    expect(mocks.overview).toHaveBeenCalledWith("org-private");
  });

  it("allows only owners and administrators to update retention policy", async () => {
    await marketIntelRouter.createCaller(context()).governance.updateRetention({ researchRetentionDays: 730, knowledgeRetentionDays: 1095, auditRetentionDays: 1095, legalHoldEnabled: true });
    expect(mocks.updateRetention).toHaveBeenCalledWith("org-private", 5, expect.objectContaining({ legalHoldEnabled: true }));
    mocks.active.mockResolvedValue(activeFor("viewer"));
    await expect(marketIntelRouter.createCaller(context()).governance.updateRetention({ researchRetentionDays: 730, knowledgeRetentionDays: 1095, auditRetentionDays: 1095, legalHoldEnabled: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents viewers from accessing organization audit records", async () => {
    mocks.active.mockResolvedValue(activeFor("viewer"));
    await expect(marketIntelRouter.createCaller(context()).governance.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it("records a completed PDF export against the active organization and scan", async () => {
    await marketIntelRouter.createCaller(context()).recordReportExport({ scanId: "scan-1", format: "pdf" });
    expect(mocks.getScan).toHaveBeenCalledWith(5, "org-private", "scan-1");
    expect(mocks.audit).toHaveBeenCalledWith("org-private", 5, expect.objectContaining({ eventType: "export.pdf.generated", resourceType: "market_scan", resourceId: "scan-1", metadata: { format: "pdf" } }));
  });
});
