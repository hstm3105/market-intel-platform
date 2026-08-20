import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), select: vi.fn(), from: vi.fn(), where: vi.fn(), limit: vi.fn(), update: vi.fn(), set: vi.fn(), updateWhere: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { assertSafeIntegrationConfiguration, buildCitationAppendix, captureDeliveryTarget, validateIntegrationConnection } from "./integrationsDelivery";

describe("secure integration configuration", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockResolvedValue([]); mocks.where.mockReturnValue({ limit: mocks.limit }); mocks.from.mockReturnValue({ where: mocks.where }); mocks.select.mockReturnValue({ from: mocks.from }); mocks.updateWhere.mockResolvedValue(undefined); mocks.set.mockReturnValue({ where: mocks.updateWhere }); mocks.update.mockReturnValue({ set: mocks.set }); mocks.getDb.mockResolvedValue({ select: mocks.select, update: mocks.update }); });
  it("accepts non-secret delivery mapping metadata", () => {
    expect(() => assertSafeIntegrationConfiguration({ destinationFolder: "Client delivery", channel: "strategy-updates" })).not.toThrow();
  });

  it("rejects credentials in both configuration keys and values", () => {
    expect(() => assertSafeIntegrationConfiguration({ apiToken: "value" })).toThrow(/credentials/i);
    expect(() => assertSafeIntegrationConfiguration({ endpoint: "Bearer super-secret-token" })).toThrow(/credentials/i);
  });

  it("rejects an immutable delivery snapshot target outside the active organization", async () => {
    await expect(captureDeliveryTarget("org-private", "market_scan", "scan-foreign")).rejects.toThrow(/outside the active organization/i);
    expect(mocks.limit).toHaveBeenCalledTimes(1);
  });

  it("builds a readable immutable citation appendix from captured source records", () => {
    expect(buildCitationAppendix([{ title: "Regulatory update", url: "https://example.com/regulation" }, { publisher: "Market authority" }])).toEqual([{ label: "Regulatory update", url: "https://example.com/regulation" }, { label: "Market authority", url: undefined }]);
  });

  it("records a configured status and validation timestamp from a non-secret provider reference", async () => {
    mocks.limit.mockResolvedValue([{ id: "integration-1", status: "connection_required", configurationJson: "{}" }]);
    const result = await validateIntegrationConnection({ organizationId: "org-private", configuredByUserId: 7, provider: "slack", secureConnectionReference: "workspace-verified-42" });
    expect(result).toMatchObject({ id: "integration-1", provider: "slack", status: "configured", lastValidatedAt: expect.any(Date) });
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: "configured", lastValidatedAt: expect.any(Date), configurationJson: expect.stringContaining("workspace-verified-42") }));
  });
});
