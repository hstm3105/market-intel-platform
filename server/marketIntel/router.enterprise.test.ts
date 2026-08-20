import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ active: vi.fn(), snapshot: vi.fn(), listKnowledge: vi.fn(), createAsset: vi.fn(), answer: vi.fn(), saveView: vi.fn() }));
vi.mock("./db", () => ({ addChatTurn: vi.fn(), addNote: vi.fn(), dashboard: vi.fn(), getScan: vi.fn(), listTrackedIndustries: vi.fn(), listWorkspace: vi.fn(), saveScanPackage: vi.fn(), setTrackedIndustry: vi.fn() }));
vi.mock("./research", () => ({ answerResearchQuestion: mocks.answer, collectPublicSources: vi.fn(), generateMarketScan: vi.fn() }));
vi.mock("./knowledge", () => ({ createKnowledgeAsset: mocks.createAsset, createKnowledgeCollection: vi.fn(), listKnowledge: mocks.listKnowledge, listPortfolioViews: vi.fn(), portfolioSnapshot: mocks.snapshot, savePortfolioView: mocks.saveView }));
vi.mock("./monitoring", () => ({ createMonitoredIndustry: vi.fn(), deleteMonitoredIndustry: vi.fn(), getMonitoringPreferences: vi.fn(), listAlerts: vi.fn(), listMonitoredIndustries: vi.fn(), markAlertRead: vi.fn(), runMonitoredScan: vi.fn(), unreadAlertCount: vi.fn(), updateMonitoredIndustry: vi.fn(), updateMonitoringPreferences: vi.fn() }));
vi.mock("./organization", () => ({ getActiveOrganization: mocks.active, addExistingMember: vi.fn(), switchOrganization: vi.fn(), canCreateResearch: vi.fn((role: string) => role !== "viewer"), canManageMembers: vi.fn(), changeMemberRole: vi.fn(), listMembers: vi.fn(), listOrganizations: vi.fn() }));

import { marketIntelRouter } from "./router";

const context = (): TrpcContext => ({ user: { id: 1, openId: "consultant", name: "Consultant", email: "consultant@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const active = (role: "analyst" | "viewer") => ({ organization: { id: "org-private", name: "Private", ownerUserId: 1 }, membership: { organizationId: "org-private", userId: 1, role } });

describe("marketIntel enterprise portfolio agent", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.active.mockResolvedValue(active("analyst")); mocks.snapshot.mockResolvedValue({ scans: [{ id: "scan-1", industryName: "FinTech", scope: "payments", executiveSummary: "summary", sourceIntelligence: { score: 72 }, emergingRisks: [], risks: [], sources: [] }, { id: "scan-2", industryName: "Energy", scope: "grid", executiveSummary: "summary", sourceIntelligence: { score: 66 }, emergingRisks: [], risks: [], sources: [] }], metrics: { scanCount: 2, industryCount: 2, averageSourceConfidence: 69, highRiskCount: 1, industryBreakdown: [], sharedRiskThemes: [] } }); mocks.listKnowledge.mockResolvedValue({ collections: [], assets: [{ id: "asset-1", kind: "insight", status: "published", title: "Thesis", content: "Evidence-linked thesis", scanIds: ["scan-1"], sourceRefs: ["S1"] }] }); mocks.answer.mockResolvedValue("Portfolio memo"); });

  it("uses only the active organization’s selected scans and knowledge assets for evidence-bounded synthesis", async () => {
    const result = await marketIntelRouter.createCaller(context()).portfolio.synthesize({ scanIds: ["scan-1", "scan-2"], knowledgeAssetIds: ["asset-1"], question: "What is the portfolio action agenda?" });
    expect(mocks.snapshot).toHaveBeenCalledWith(1, "org-private", ["scan-1", "scan-2"]);
    expect(mocks.answer).toHaveBeenCalledWith(expect.objectContaining({ focus: "enterprise_portfolio", question: "What is the portfolio action agenda?" }));
    const packet = JSON.parse(mocks.answer.mock.calls[0][0].scanContext);
    expect(packet.knowledgeAssets).toEqual([expect.objectContaining({ id: "asset-1", sourceRefs: ["S1"] })]);
    expect(result).toMatchObject({ answer: "Portfolio memo", metrics: { industryCount: 2 } });
  });

  it("prevents viewers from triggering portfolio synthesis", async () => {
    mocks.active.mockResolvedValue(active("viewer"));
    await expect(marketIntelRouter.createCaller(context()).portfolio.synthesize({ scanIds: ["scan-1", "scan-2"], knowledgeAssetIds: [], question: "What is the portfolio action agenda?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });

  it("creates knowledge assets only under the caller’s active organization", async () => {
    const caller = marketIntelRouter.createCaller(context());
    await caller.knowledge.createAsset({ kind: "insight", status: "published", title: "Signal", content: "Evidence-linked conclusion", tags: ["strategy"], scanIds: ["scan-1"], sourceRefs: ["S1"] });
    expect(mocks.createAsset).toHaveBeenCalledWith(1, "org-private", expect.objectContaining({ title: "Signal", scanIds: ["scan-1"], sourceRefs: ["S1"] }));
  });
});
