import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), eq: vi.fn(), and: vi.fn(), set: vi.fn(), where: vi.fn(), update: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("drizzle-orm", () => ({ and: mocks.and, desc: vi.fn(), eq: mocks.eq }));

import { buildMonitoringAlertRecords, markAlertRead } from "./monitoring";

describe("scheduled monitoring alert persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockImplementation((column, value) => ({ column, value }));
    mocks.and.mockImplementation((...conditions) => ({ conditions }));
    mocks.where.mockResolvedValue(undefined);
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.getDb.mockResolvedValue({ update: mocks.update });
  });

  it("stamps every generated scheduled alert with the monitor’s owner and active organization", () => {
    const [alert] = buildMonitoringAlertRecords({ userId: 14, organizationId: "org-north", monitoredIndustryId: "monitor-payments", scanId: "scan-refresh", alerts: [{ category: "risk", severity: "high", title: "Regulatory inflection", summary: "Fresh public evidence supports a material policy shift.", evidenceSourceIds: ["S1"] }] });
    expect(alert).toMatchObject({ userId: 14, organizationId: "org-north", monitoredIndustryId: "monitor-payments", scanId: "scan-refresh", category: "risk", severity: "high" });
    expect(JSON.parse(alert.evidenceJson)).toEqual({ sourceIds: ["S1"] });
  });

  it("changes unread to read only with the authenticated user and active-organization constraints", async () => {
    await markAlertRead(14, "org-north", "alert-private");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledWith({ status: "read" });
    expect(mocks.eq).toHaveBeenCalledWith(expect.anything(), "alert-private");
    expect(mocks.eq).toHaveBeenCalledWith(expect.anything(), 14);
    expect(mocks.eq).toHaveBeenCalledWith(expect.anything(), "org-north");
    expect(mocks.and).toHaveBeenCalledTimes(1);
    expect(mocks.where).toHaveBeenCalledTimes(1);
  });
});
