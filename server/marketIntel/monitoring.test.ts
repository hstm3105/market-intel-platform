import { describe, expect, it } from "vitest";
import { filterMonitoringAlerts, monitoringSchedule } from "./monitoring";

const alerts = [
  { category: "risk" as const, severity: "high" as const, title: "Regulatory inflection", summary: "A material policy shift is supported by fresh evidence.", evidenceSourceIds: ["S1"] },
  { category: "competitor" as const, severity: "medium" as const, title: "Competitor expansion", summary: "A competitor move warrants consultant attention.", evidenceSourceIds: ["S2"] },
  { category: "trend" as const, severity: "low" as const, title: "Early adoption signal", summary: "An early but non-material trend signal appeared.", evidenceSourceIds: ["S3"] },
];

describe("continuous monitoring policy", () => {
  it("uses valid six-field UTC schedules for the supported consultant cadences", () => {
    expect(monitoringSchedule("weekly").cron).toBe("0 0 9 * * 1");
    expect(monitoringSchedule("monthly").cron).toBe("0 0 9 1 * *");
  });

  it("keeps all material changes when both organization-private thresholds allow them", () => {
    expect(filterMonitoringAlerts(alerts, "all", "all").map(alert => alert.title)).toEqual([
      "Regulatory inflection",
      "Competitor expansion",
      "Early adoption signal",
    ]);
  });

  it("does not leak lower-severity alerts past either private monitor or membership preference", () => {
    expect(filterMonitoringAlerts(alerts, "high", "all").map(alert => alert.severity)).toEqual(["high"]);
    expect(filterMonitoringAlerts(alerts, "all", "high").map(alert => alert.severity)).toEqual(["high"]);
  });
});
