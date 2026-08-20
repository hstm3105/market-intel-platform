import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock("drizzle-orm", () => ({ and: mocks.and, desc: vi.fn(), eq: mocks.eq }));

import { markAlertRead, runMonitoredScan } from "./monitoring";

const monitor = { id: "monitor-north", userId: 7, organizationId: "org-north", industrySlug: "payments", industryName: "Payments", scope: "Track material regulatory and competitive changes across payment infrastructure.", enabled: true, riskThreshold: "all" as const, scheduleCronTaskUid: "task-north", lastScanId: "scan-prior", lastRunAt: null };
const sources = [{ id: "S1", title: "Regulatory update", publisher: "Public source", publishedAt: "2026-08-20", url: "https://example.com/source", excerpt: "A material market development." }];

describe("scheduled monitored-industry alert workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockImplementation((column, value) => ({ column, value }));
    mocks.and.mockImplementation((...conditions) => conditions);
  });

  it("persists a detected refresh alert as unread and scoped to the monitor’s user and organization", async () => {
    const persistedAlerts: any[] = [];
    const selectResults = [[monitor], [{ id: "scan-prior", userId: 7, organizationId: "org-north", analysisJson: "{}" }]];
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => selectResults.shift() ?? []) })) })) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
      insert: vi.fn(() => ({ values: vi.fn(async (records: any[]) => { persistedAlerts.push(...records); }) })),
    };
    const result = await runMonitoredScan("task-north", {}, {
      db,
      collectSources: vi.fn(async () => sources),
      buildScan: vi.fn(async () => ({ executiveSummary: "Current payment landscape" } as any)),
      saveScan: vi.fn(async () => ({ id: "scan-refresh" } as any)),
      loadPreferences: vi.fn(async () => ({ inAppEnabled: true, minimumSeverity: "all" as const })),
      detectChanges: vi.fn(async () => [{ category: "risk" as const, severity: "high" as const, title: "Regulatory inflection", summary: "Fresh evidence supports a material regulatory shift.", evidenceSourceIds: ["S1"] }]),
    });
    expect(result).toMatchObject({ status: "completed", scanId: "scan-refresh", alertsCreated: 1 });
    expect(persistedAlerts).toHaveLength(1);
    expect(persistedAlerts[0]).toMatchObject({ userId: 7, organizationId: "org-north", monitoredIndustryId: "monitor-north", scanId: "scan-refresh", status: "unread" });
    expect(persistedAlerts[0].organizationId).not.toBe("org-south");
  });

  it("moves only the matching organization-private unread alert to read", async () => {
    const alerts = [
      { id: "alert-north", userId: 7, organizationId: "org-north", status: "unread" },
      { id: "alert-south", userId: 8, organizationId: "org-south", status: "unread" },
    ];
    const db = {
      update: vi.fn(() => ({ set: vi.fn((values: { status: "read" }) => ({ where: vi.fn(async (conditions: Array<{ value: string | number }>) => {
        const valuesToMatch = conditions.map(condition => condition.value);
        alerts.filter(alert => valuesToMatch.includes(alert.id) && valuesToMatch.includes(alert.userId) && valuesToMatch.includes(alert.organizationId)).forEach(alert => { alert.status = values.status; });
      }) })) })),
    };
    const originalGetDb = await import("../db");
    const getDbSpy = vi.spyOn(originalGetDb, "getDb").mockResolvedValue(db as any);
    await markAlertRead(7, "org-north", "alert-north");
    expect(alerts).toEqual([
      { id: "alert-north", userId: 7, organizationId: "org-north", status: "read" },
      { id: "alert-south", userId: 8, organizationId: "org-south", status: "unread" },
    ]);
    getDbSpy.mockRestore();
  });
});
