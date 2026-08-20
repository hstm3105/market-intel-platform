import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn(), runBatch: vi.fn() }));
vi.mock("../_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./governance", () => ({ runScheduledRetentionBatch: mocks.runBatch }));

import { retentionHandler } from "./retentionHandler";

const response = () => { const result = { status: vi.fn(), json: vi.fn() }; result.status.mockReturnValue(result); return result as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }; };

describe("scheduled retention enforcement callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs the idempotent organization batch only for an authenticated cron caller", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-retention-1" }); mocks.runBatch.mockResolvedValue([{ organizationId: "org-a", status: "completed" }, { organizationId: "org-b", status: "legal_hold_skipped" }]); const res = response();
    await retentionHandler({ body: { organizationId: "untrusted" } } as Request, res, vi.fn());
    expect(mocks.runBatch).toHaveBeenCalledTimes(1); expect(res.status).toHaveBeenCalledWith(200); expect(res.json).toHaveBeenCalledWith({ ok: true, processed: 2, results: [{ organizationId: "org-a", status: "completed" }, { organizationId: "org-b", status: "legal_hold_skipped" }] });
  });

  it("rejects a non-cron caller without triggering retention processing", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false, taskUid: "ignored" }); const res = response(); await retentionHandler({} as Request, res, vi.fn()); expect(mocks.runBatch).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns a retryable server failure when scheduled processing throws", async () => {
    mocks.authenticateRequest.mockRejectedValue(new Error("invalid scheduled identity")); const res = response(); await retentionHandler({} as Request, res, vi.fn()); expect(res.status).toHaveBeenCalledWith(500);
  });
});
