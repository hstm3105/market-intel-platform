import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ getScan: vi.fn(), addNote: vi.fn() }));

vi.mock("./db", () => ({
  addChatTurn: vi.fn(), addNote: mocks.addNote, dashboard: vi.fn(), getScan: mocks.getScan,
  listTrackedIndustries: vi.fn(), listWorkspace: vi.fn(), saveScanPackage: vi.fn(), setTrackedIndustry: vi.fn(),
}));
vi.mock("./research", () => ({ answerResearchQuestion: vi.fn(), collectPublicSources: vi.fn(), generateMarketScan: vi.fn() }));

import { marketIntelRouter } from "./router";

function context(): TrpcContext {
  return { user: { id: 1, openId: "consultant", name: "Consultant", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("marketIntel.exportRiskAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScan.mockResolvedValue({
      scan: { id: "scan-1", industrySlug: "fintech", industryName: "FinTech", projectName: null, scope: "Risk review", sourceJson: JSON.stringify([{ id: "S8", title: "Open finance source", publisher: "Regulator", publishedAt: "2026-08-20", url: "https://example.com", excerpt: "Evidence" }]), analysisJson: "{}", createdAt: new Date("2026-08-20") },
      messages: [{ id: "risk-answer", channel: "risk", role: "assistant", content: "**Evidence:** Consent exposure is rising. [S8]" }], profiles: [], artifacts: [], notes: [],
    });
  });

  it("exports only a private risk-channel answer with its scan sources", async () => {
    const caller = marketIntelRouter.createCaller(context());
    const result = await caller.exportRiskAnswer({ scanId: "scan-1", messageId: "risk-answer" });

    expect(mocks.getScan).toHaveBeenCalledWith(1, "scan-1");
    expect(result.filename).toBe("fintech-risk-qa-brief.md");
    expect(result.content).toContain("# FinTech — Risk Q&A Brief");
    expect(result.content).toContain("Consent exposure is rising");
    expect(result.content).toContain("[S8] [Open finance source](https://example.com)");
  });

  it("saves a Risk Q&A answer payload to the authenticated user's active scan notes", async () => {
    mocks.addNote.mockResolvedValue({ id: "note-1" });
    const caller = marketIntelRouter.createCaller(context());
    const input = { scanId: "scan-1", title: "Risk Q&A — FinTech", content: "**Evidence:** Consent exposure is rising. [S8]" };

    await caller.addNote(input);

    expect(mocks.addNote).toHaveBeenCalledWith(1, input);
  });
});
