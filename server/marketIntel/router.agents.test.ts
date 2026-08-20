import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ active: vi.fn(), getScan: vi.fn(), listRuns: vi.fn(), runEvidence: vi.fn(), audit: vi.fn() }));
vi.mock("./db", () => ({ addChatTurn: vi.fn(), addNote: vi.fn(), dashboard: vi.fn(), getScan: mocks.getScan, listTrackedIndustries: vi.fn(), listWorkspace: vi.fn(), saveScanPackage: vi.fn(), setTrackedIndustry: vi.fn() }));
vi.mock("./research", () => ({ answerResearchQuestion: vi.fn(), collectPublicSources: vi.fn(), generateMarketScan: vi.fn() }));
vi.mock("./knowledge", () => ({ createKnowledgeAsset: vi.fn(), createKnowledgeCollection: vi.fn(), listKnowledge: vi.fn(), listPortfolioViews: vi.fn(), portfolioSnapshot: vi.fn(), savePortfolioView: vi.fn(), searchKnowledge: vi.fn(), updateKnowledgeAssetTags: vi.fn() }));
vi.mock("./monitoring", () => ({ createMonitoredIndustry: vi.fn(), deleteMonitoredIndustry: vi.fn(), getMonitoringPreferences: vi.fn(), listAlerts: vi.fn(), listMonitoredIndustries: vi.fn(), markAlertRead: vi.fn(), runMonitoredScan: vi.fn(), unreadAlertCount: vi.fn(), updateMonitoredIndustry: vi.fn(), updateMonitoringPreferences: vi.fn() }));
vi.mock("./organization", () => ({ getActiveOrganization: mocks.active, addExistingMember: vi.fn(), switchOrganization: vi.fn(), canCreateResearch: vi.fn((role: string) => role !== "viewer"), canManageMembers: vi.fn((role: string) => role === "owner" || role === "admin"), changeMemberRole: vi.fn(), listMembers: vi.fn(), listOrganizations: vi.fn() }));
vi.mock("./governance", () => ({ getGovernanceOverview: vi.fn(), recordAuditEvent: mocks.audit, updateRetentionPolicy: vi.fn() }));
vi.mock("./collaboration", () => ({ createComment: vi.fn(), decideReview: vi.fn(), getCollaborationOverview: vi.fn(), listNotifications: vi.fn(), markNotificationRead: vi.fn(), requestReview: vi.fn() }));
vi.mock("./orchestration", () => ({ listAgentRuns: mocks.listRuns, runEvidenceOrchestration: mocks.runEvidence }));

import { marketIntelRouter } from "./router";

const context = (): TrpcContext => ({ user: { id: 8, openId: "consultant", name: "Consultant", email: "consultant@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const activeFor = (role: "owner" | "admin" | "research_lead" | "analyst" | "viewer") => ({ organization: { id: "org-evidence", name: "Evidence team", ownerUserId: 1 }, membership: { organizationId: "org-evidence", userId: 8, role } });
const record = { scan: { id: "scan-1", industryName: "FinTech", scope: "Evidence scope", sourceJson: "[]", analysisJson: JSON.stringify({ trends: [], risks: [] }) } };

describe("marketIntel evidence agent controls", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.active.mockResolvedValue(activeFor("analyst")); mocks.listRuns.mockResolvedValue([]); mocks.getScan.mockResolvedValue(record); mocks.runEvidence.mockResolvedValue({ id: "run-1", model: "gpt-5", synthesis: "Validated synthesis", claims: [{ id: "claim-1" }] }); });

  it("retrieves agent-run history only through the active organization", async () => {
    await marketIntelRouter.createCaller(context()).agents.listRuns();
    expect(mocks.listRuns).toHaveBeenCalledWith("org-evidence");
  });

  it("blocks viewers from initiating evidence orchestration", async () => {
    mocks.active.mockResolvedValue(activeFor("viewer"));
    await expect(marketIntelRouter.createCaller(context()).agents.runEvidence({ scanIds: ["scan-1"], question: "What does the evidence say about market convergence?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.runEvidence).not.toHaveBeenCalled();
  });

  it("rejects foreign scans before agent invocation and records completed private runs", async () => {
    mocks.getScan.mockResolvedValueOnce(undefined);
    await expect(marketIntelRouter.createCaller(context()).agents.runEvidence({ scanIds: ["foreign-scan"], question: "What does the evidence say about market convergence?" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.runEvidence).not.toHaveBeenCalled();
    mocks.getScan.mockResolvedValue(record);
    await marketIntelRouter.createCaller(context()).agents.runEvidence({ scanIds: ["scan-1"], question: "What does the evidence say about market convergence?" });
    expect(mocks.runEvidence).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-evidence", requestedByUserId: 8, question: "What does the evidence say about market convergence?", scans: [expect.objectContaining({ id: "scan-1" })] }));
    expect(mocks.audit).toHaveBeenCalledWith("org-evidence", 8, expect.objectContaining({ eventType: "research.agent_run.completed", resourceId: "run-1", metadata: expect.objectContaining({ claims: 1 }) }));
  });
});
