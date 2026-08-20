import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  getScan: vi.fn(),
  answerResearchQuestion: vi.fn(),
}));

vi.mock("./db", () => ({
  addChatTurn: vi.fn(),
  addNote: vi.fn(),
  dashboard: vi.fn(),
  getScan: mocks.getScan,
  listTrackedIndustries: vi.fn(),
  listWorkspace: vi.fn(),
  saveScanPackage: vi.fn(),
  setTrackedIndustry: vi.fn(),
}));

vi.mock("./research", () => ({
  answerResearchQuestion: mocks.answerResearchQuestion,
  collectPublicSources: vi.fn(),
  generateMarketScan: vi.fn(),
}));

vi.mock("./organization", () => ({
  getActiveOrganization: vi.fn().mockResolvedValue({ organization: { id: "org-test", name: "Test Intelligence", ownerUserId: 1 }, membership: { organizationId: "org-test", userId: 1, role: "owner" } }),
  canCreateResearch: vi.fn(() => true),
  canManageMembers: vi.fn(() => true),
  changeMemberRole: vi.fn(),
  addExistingMember: vi.fn(),
  listMembers: vi.fn(),
  listOrganizations: vi.fn(),
  switchOrganization: vi.fn(),
}));

import { marketIntelRouter } from "./router";

function context(): TrpcContext {
  return {
    user: { id: 1, openId: "consultant", name: "Consultant", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const resultFor = (id: string, industryName: string) => ({
  scan: { id, industryName, scope: `${industryName} risk review`, sourceJson: JSON.stringify([{ id: "S1", title: `${industryName} source`, publisher: "Publisher", publishedAt: "", url: "https://example.com", excerpt: "Evidence" }]), analysisJson: JSON.stringify({ emergingRisks: [{ rank: 1, title: `${industryName} risk`, summary: "Risk summary", severity: "High", watchSignal: "Watch signal", sourceIds: ["S1"] }, { rank: 2, title: "Risk 2", summary: "Risk summary", severity: "Medium", watchSignal: "Watch", sourceIds: ["S1"] }, { rank: 3, title: "Risk 3", summary: "Risk summary", severity: "Medium", watchSignal: "Watch", sourceIds: ["S1"] }], risks: [] }) },
  messages: [], profiles: [], artifacts: [], notes: [],
});

describe("marketIntel.compareRisks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScan.mockImplementation(async (_userId: number, _organizationId: string, scanId: string) => scanId === "consumer" ? resultFor("consumer", "Consumer") : scanId === "fintech" ? resultFor("fintech", "FinTech") : null);
    mocks.answerResearchQuestion.mockResolvedValue("Shared exposure comparison [S1]");
  });

  it("uses only the authenticated user's selected scans for a private comparison", async () => {
    const caller = marketIntelRouter.createCaller(context());
    const result = await caller.compareRisks({ scanIds: ["consumer", "fintech"], question: "Which risk is most material across both selected industries?" });

    expect(result.answer).toBe("Shared exposure comparison [S1]");
    expect(mocks.getScan).toHaveBeenNthCalledWith(1, 1, "org-test", "consumer");
    expect(mocks.getScan).toHaveBeenNthCalledWith(2, 1, "org-test", "fintech");
    expect(mocks.answerResearchQuestion).toHaveBeenCalledWith(expect.objectContaining({
      focus: "risk_comparison",
      history: [],
      scanContext: expect.stringContaining("Consumer"),
    }));
  });
});
