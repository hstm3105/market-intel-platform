import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), runMonitoredScan: vi.fn() }));
vi.mock("../_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./monitoring", () => ({ runMonitoredScan: mocks.runMonitoredScan }));

import { marketMonitorHandler } from "./monitoringHandler";

const response = () => {
  const result = { status: vi.fn(), json: vi.fn() };
  result.status.mockReturnValue(result);
  return result as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
};

describe("scheduled market monitor callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the authenticated cron task UID rather than a request payload to run the correct monitor", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-baseline-1" });
    mocks.runMonitoredScan.mockResolvedValue({ status: "baseline_created", scanId: "scan-1", alertsCreated: 0 });
    const res = response();
    await marketMonitorHandler({ body: { taskUid: "untrusted-task" } } as Request, res, vi.fn());
    expect(mocks.runMonitoredScan).toHaveBeenCalledWith("task-baseline-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: "baseline_created", scanId: "scan-1", alertsCreated: 0 });
  });

  it("rejects non-cron requests before a monitor can be refreshed", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false, taskUid: "task-ignored" });
    const res = response();
    await marketMonitorHandler({} as Request, res, vi.fn());
    expect(mocks.runMonitoredScan).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns retryable failure status when a scheduled refresh cannot be completed", async () => {
    mocks.authenticateRequest.mockRejectedValue(new Error("invalid scheduled identity"));
    const res = response();
    await marketMonitorHandler({} as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
