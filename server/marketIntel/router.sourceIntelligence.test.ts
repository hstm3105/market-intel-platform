import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ active: vi.fn(), getScan: vi.fn() }));

vi.mock("./db", () => ({ addChatTurn: vi.fn(), addNote: vi.fn(), dashboard: vi.fn(), getScan: mocks.getScan, listTrackedIndustries: vi.fn(), listWorkspace: vi.fn(), saveScanPackage: vi.fn(), setTrackedIndustry: vi.fn() }));
vi.mock("./research", () => ({ answerResearchQuestion: vi.fn(), collectPublicSources: vi.fn(), generateMarketScan: vi.fn() }));
vi.mock("./monitoring", () => ({ createMonitoredIndustry: vi.fn(), deleteMonitoredIndustry: vi.fn(), getMonitoringPreferences: vi.fn(), listAlerts: vi.fn(), listMonitoredIndustries: vi.fn(), markAlertRead: vi.fn(), runMonitoredScan: vi.fn(), unreadAlertCount: vi.fn(), updateMonitoredIndustry: vi.fn(), updateMonitoringPreferences: vi.fn() }));
vi.mock("./organization", () => ({ getActiveOrganization: mocks.active, addExistingMember: vi.fn(), switchOrganization: vi.fn(), canCreateResearch: vi.fn(() => true), canManageMembers: vi.fn(), changeMemberRole: vi.fn(), listMembers: vi.fn(), listOrganizations: vi.fn() }));

import { marketIntelRouter } from "./router";

const context = (): TrpcContext => ({ user: { id: 1, openId: "consultant", name: "Consultant", email: "consultant@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("marketIntel.scan source intelligence contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.active.mockResolvedValue({ organization: { id: "org-private", name: "Private", ownerUserId: 1 }, membership: { organizationId: "org-private", userId: 1, role: "analyst" } });
    mocks.getScan.mockResolvedValue({ scan: { id: "scan-1" }, profiles: [], artifacts: [], notes: [], messages: [], sourceIntelligence: { score: 76, confidence: "high", totalSources: 4, uniquePublishers: 3, currentSources: 3, traceableSources: 4, tierCounts: { authoritative: 1, established: 2, specialist: 1, unverified: 0 }, quality: [], governanceNote: "Evidence quality and coverage." } });
  });

  it("returns deterministic source intelligence only through the caller’s active organization", async () => {
    const result = await marketIntelRouter.createCaller(context()).scan({ scanId: "scan-1" });
    expect(mocks.getScan).toHaveBeenCalledWith(1, "org-private", "scan-1");
    expect(result.sourceIntelligence).toMatchObject({ score: 76, confidence: "high", uniquePublishers: 3, traceableSources: 4 });
  });
});
