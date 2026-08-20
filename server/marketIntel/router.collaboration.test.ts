import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ active: vi.fn(), overview: vi.fn(), createComment: vi.fn(), requestReview: vi.fn(), decideReview: vi.fn(), audit: vi.fn() }));
vi.mock("./db", () => ({ addChatTurn: vi.fn(), addNote: vi.fn(), dashboard: vi.fn(), getScan: vi.fn(), listTrackedIndustries: vi.fn(), listWorkspace: vi.fn(), saveScanPackage: vi.fn(), setTrackedIndustry: vi.fn() }));
vi.mock("./research", () => ({ answerResearchQuestion: vi.fn(), collectPublicSources: vi.fn(), generateMarketScan: vi.fn() }));
vi.mock("./knowledge", () => ({ createKnowledgeAsset: vi.fn(), createKnowledgeCollection: vi.fn(), listKnowledge: vi.fn(), listPortfolioViews: vi.fn(), portfolioSnapshot: vi.fn(), savePortfolioView: vi.fn(), searchKnowledge: vi.fn(), updateKnowledgeAssetTags: vi.fn() }));
vi.mock("./monitoring", () => ({ createMonitoredIndustry: vi.fn(), deleteMonitoredIndustry: vi.fn(), getMonitoringPreferences: vi.fn(), listAlerts: vi.fn(), listMonitoredIndustries: vi.fn(), markAlertRead: vi.fn(), runMonitoredScan: vi.fn(), unreadAlertCount: vi.fn(), updateMonitoredIndustry: vi.fn(), updateMonitoringPreferences: vi.fn() }));
vi.mock("./organization", () => ({ getActiveOrganization: mocks.active, addExistingMember: vi.fn(), switchOrganization: vi.fn(), canCreateResearch: vi.fn((role: string) => role !== "viewer"), canManageMembers: vi.fn((role: string) => role === "owner" || role === "admin"), changeMemberRole: vi.fn(), listMembers: vi.fn(), listOrganizations: vi.fn() }));
vi.mock("./governance", () => ({ getGovernanceOverview: vi.fn(), recordAuditEvent: mocks.audit, updateRetentionPolicy: vi.fn() }));
vi.mock("./collaboration", () => ({ createComment: mocks.createComment, decideReview: mocks.decideReview, getCollaborationOverview: mocks.overview, requestReview: mocks.requestReview }));

import { marketIntelRouter } from "./router";

const context = (): TrpcContext => ({ user: { id: 8, openId: "consultant", name: "Consultant", email: "consultant@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
const activeFor = (role: "owner" | "admin" | "research_lead" | "analyst" | "viewer") => ({ organization: { id: "org-secure", name: "Secure research", ownerUserId: 1 }, membership: { organizationId: "org-secure", userId: 8, role } });
const target = { targetType: "market_scan" as const, targetId: "scan-1" };

describe("marketIntel collaboration controls", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.active.mockResolvedValue(activeFor("analyst")); mocks.overview.mockResolvedValue({ comments: [], review: null }); mocks.createComment.mockResolvedValue({ id: "comment-1", mentionedUserIds: [3] }); mocks.requestReview.mockResolvedValue({ id: "review-1", status: "in_review" }); mocks.decideReview.mockResolvedValue({ id: "review-1", status: "approved" }); });

  it("retrieves collaboration records only through the caller’s active organization", async () => {
    await marketIntelRouter.createCaller(context()).collaboration.overview(target);
    expect(mocks.overview).toHaveBeenCalledWith("org-secure", target);
  });

  it("prevents viewers from creating comments or requesting reviews", async () => {
    mocks.active.mockResolvedValue(activeFor("viewer"));
    const caller = marketIntelRouter.createCaller(context());
    await expect(caller.collaboration.addComment({ ...target, body: "Please validate the source selection." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.collaboration.requestReview(target)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createComment).not.toHaveBeenCalled();
    expect(mocks.requestReview).not.toHaveBeenCalled();
  });

  it("records comment mention counts in the organization audit trail", async () => {
    await marketIntelRouter.createCaller(context()).collaboration.addComment({ ...target, body: "Please validate the source selection.", mentionedUserIds: [3] });
    expect(mocks.createComment).toHaveBeenCalledWith("org-secure", 8, expect.objectContaining({ mentionedUserIds: [3] }));
    expect(mocks.audit).toHaveBeenCalledWith("org-secure", 8, expect.objectContaining({ eventType: "collaboration.comment.created", resourceType: "market_scan", resourceId: "scan-1", metadata: { mentions: 1 } }));
  });

  it("allows a research lead to record an approval but blocks analyst decisions", async () => {
    mocks.active.mockResolvedValue(activeFor("research_lead"));
    await marketIntelRouter.createCaller(context()).collaboration.decideReview({ ...target, status: "approved", decisionNote: "Evidence and recommendation are client-ready." });
    expect(mocks.decideReview).toHaveBeenCalledWith("org-secure", 8, expect.objectContaining({ status: "approved" }), false);
    expect(mocks.audit).toHaveBeenCalledWith("org-secure", 8, expect.objectContaining({ eventType: "collaboration.review.approved" }));
    mocks.active.mockResolvedValue(activeFor("analyst"));
    await expect(marketIntelRouter.createCaller(context()).collaboration.decideReview({ ...target, status: "approved", decisionNote: "Approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
