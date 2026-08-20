import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  getScan: vi.fn(),
  addChatTurn: vi.fn(),
  answerResearchQuestion: vi.fn(),
}));

vi.mock("./db", () => ({
  addChatTurn: mocks.addChatTurn,
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

describe("marketIntel.ask risk mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScan.mockResolvedValue({
      scan: { industryName: "FinTech", scope: "Assess emerging risks", sourceJson: "[]", analysisJson: '{"emergingRisks":[]}' },
      messages: [
        { channel: "general", role: "user", content: "Compare competitors" },
        { channel: "risk", role: "user", content: "What worsens funding risk?" },
        { channel: "general", role: "assistant", content: "General answer" },
        { channel: "risk", role: "assistant", content: "Risk answer" },
      ],
    });
    mocks.answerResearchQuestion.mockResolvedValue("Risk-specific response [S4]");
  });

  it("uses only risk history and writes both turns to the risk channel", async () => {
    const caller = marketIntelRouter.createCaller(context());
    const result = await caller.ask({ scanId: "scan-1", question: "Which indicator should we watch?", mode: "risk" });

    expect(result).toEqual({ answer: "Risk-specific response [S4]" });
    expect(mocks.answerResearchQuestion).toHaveBeenCalledWith(expect.objectContaining({
      focus: "emerging_risks",
      history: [
        { role: "user", content: "What worsens funding risk?" },
        { role: "assistant", content: "Risk answer" },
      ],
    }));
    expect(mocks.addChatTurn).toHaveBeenCalledWith(1, "org-test", "scan-1", "Which indicator should we watch?", "Risk-specific response [S4]", "risk");
  });
});
