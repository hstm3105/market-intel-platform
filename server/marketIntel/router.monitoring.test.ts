import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  active: vi.fn(),
  list: vi.fn(),
  listAlerts: vi.fn(),
  unreadAlertCount: vi.fn(),
  markAlertRead: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  runNow: vi.fn(),
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));

vi.mock("./db", () => ({ addChatTurn: vi.fn(), addNote: vi.fn(), dashboard: vi.fn(), getScan: vi.fn(), listTrackedIndustries: vi.fn(), listWorkspace: vi.fn(), saveScanPackage: vi.fn(), setTrackedIndustry: vi.fn() }));
vi.mock("./research", () => ({ answerResearchQuestion: vi.fn(), collectPublicSources: vi.fn(), generateMarketScan: vi.fn() }));
vi.mock("./monitoring", () => ({
  createMonitoredIndustry: mocks.create,
  deleteMonitoredIndustry: mocks.remove,
  getMonitoringPreferences: mocks.getPreferences,
  listAlerts: mocks.listAlerts,
  listMonitoredIndustries: mocks.list,
  markAlertRead: mocks.markAlertRead,
  runMonitoredScan: mocks.runNow,
  unreadAlertCount: mocks.unreadAlertCount,
  updateMonitoredIndustry: mocks.update,
  updateMonitoringPreferences: mocks.updatePreferences,
}));
vi.mock("./organization", () => ({
  getActiveOrganization: mocks.active,
  addExistingMember: vi.fn(),
  switchOrganization: vi.fn(),
  canCreateResearch: vi.fn((role: string) => role !== "viewer"),
  canManageMembers: vi.fn(),
  changeMemberRole: vi.fn(),
  listMembers: vi.fn(),
  listOrganizations: vi.fn(),
}));

import { marketIntelRouter } from "./router";

const activeFor = (role: "owner" | "analyst" | "viewer") => ({ organization: { id: "org-private", name: "Private Intelligence", ownerUserId: 1 }, membership: { organizationId: "org-private", userId: 1, role } });
const context = (): TrpcContext => ({ user: { id: 1, openId: "consultant", name: "Consultant", email: "consultant@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: { cookie: "app_session_id=session-token" } } as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("marketIntel.monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.active.mockResolvedValue(activeFor("analyst"));
    mocks.list.mockResolvedValue([{ id: "monitor-1", scheduleCronTaskUid: "task-1", industrySlug: "fintech", industryName: "FinTech" }]);
    mocks.listAlerts.mockResolvedValue([{ id: "alert-1", status: "unread" }]);
    mocks.unreadAlertCount.mockResolvedValue(1);
    mocks.getPreferences.mockResolvedValue({ inAppEnabled: true, dailyDigestEnabled: false, minimumSeverity: "all" });
  });

  it("lists monitoring records and alerts only through the authenticated active organization", async () => {
    const caller = marketIntelRouter.createCaller(context());
    await expect(caller.monitoring.list()).resolves.toHaveLength(1);
    await expect(caller.monitoring.alerts()).resolves.toMatchObject({ unreadCount: 1, alerts: [{ id: "alert-1" }] });
    expect(mocks.list).toHaveBeenCalledWith(1, "org-private");
    expect(mocks.listAlerts).toHaveBeenCalledWith(1, "org-private");
    expect(mocks.unreadAlertCount).toHaveBeenCalledWith(1, "org-private");
  });

  it("passes the active organization identity to alert read-state changes and manual refreshes", async () => {
    const caller = marketIntelRouter.createCaller(context());
    await caller.monitoring.markAlertRead({ id: "alert-1" });
    await caller.monitoring.runNow({ id: "monitor-1" });
    expect(mocks.markAlertRead).toHaveBeenCalledWith(1, "org-private", "alert-1");
    expect(mocks.runNow).toHaveBeenCalledWith("task-1");
  });

  it("prevents viewers from creating, modifying, or deleting active-organization monitoring", async () => {
    mocks.active.mockResolvedValue(activeFor("viewer"));
    const caller = marketIntelRouter.createCaller(context());
    await expect(caller.monitoring.create({ industrySlug: "fintech", scope: "Monitor the North American payments infrastructure and regulatory shifts.", cadence: "weekly", riskThreshold: "all" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.monitoring.update({ id: "monitor-1", enabled: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.monitoring.remove({ id: "monitor-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
