import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ active: vi.fn(), addExistingMember: vi.fn(), switchOrganization: vi.fn() }));

vi.mock("./db", () => ({ addChatTurn: vi.fn(), addNote: vi.fn(), dashboard: vi.fn(), getScan: vi.fn(), listTrackedIndustries: vi.fn(), listWorkspace: vi.fn(), saveScanPackage: vi.fn(), setTrackedIndustry: vi.fn() }));
vi.mock("./research", () => ({ answerResearchQuestion: vi.fn(), collectPublicSources: vi.fn(), generateMarketScan: vi.fn() }));
vi.mock("./organization", () => ({
  getActiveOrganization: mocks.active,
  addExistingMember: mocks.addExistingMember,
  switchOrganization: mocks.switchOrganization,
  canCreateResearch: vi.fn(() => true),
  canManageMembers: vi.fn((role: string) => role === "owner" || role === "admin"),
  changeMemberRole: vi.fn(),
  listMembers: vi.fn(),
  listOrganizations: vi.fn(),
}));
vi.mock("./governance", () => ({ getGovernanceOverview: vi.fn(), recordAuditEvent: vi.fn(), updateRetentionPolicy: vi.fn() }));

import { marketIntelRouter } from "./router";

const context = (): TrpcContext => ({ user: { id: 1, openId: "owner", name: "Owner", email: "owner@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
const activeFor = (role: "owner" | "admin" | "analyst") => ({ organization: { id: "org-test", name: "Test Intelligence", ownerUserId: 1 }, membership: { organizationId: "org-test", userId: 1, role } });

describe("marketIntel.organization", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.active.mockResolvedValue(activeFor("owner")); });

  it("blocks analysts from managing organization members", async () => {
    mocks.active.mockResolvedValue(activeFor("analyst"));
    const caller = marketIntelRouter.createCaller(context());
    await expect(caller.organization.addMember({ email: "member@example.com", role: "analyst" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.addExistingMember).not.toHaveBeenCalled();
  });

  it("allows organization administrators to grant an existing user a scoped role", async () => {
    mocks.active.mockResolvedValue(activeFor("admin"));
    mocks.addExistingMember.mockResolvedValue({ success: true });
    const caller = marketIntelRouter.createCaller(context());
    await caller.organization.addMember({ email: "member@example.com", role: "research_lead" });
    expect(mocks.addExistingMember).toHaveBeenCalledWith("org-test", "member@example.com", "research_lead");
  });

  it("switches only through the authenticated member identity", async () => {
    mocks.switchOrganization.mockResolvedValue({ success: true });
    const caller = marketIntelRouter.createCaller(context());
    await caller.organization.switch({ organizationId: "org-second" });
    expect(mocks.switchOrganization).toHaveBeenCalledWith(1, "org-second");
  });
});
