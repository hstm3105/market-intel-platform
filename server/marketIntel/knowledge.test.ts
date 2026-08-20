import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), insert: vi.fn(), values: vi.fn(), select: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { createKnowledgeAsset } from "./knowledge";

describe("knowledge asset persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.mockResolvedValue(undefined);
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.select.mockReturnValue({ from: () => ({ where: () => Promise.resolve([{ id: "scan-1" }]) }) });
    mocks.getDb.mockResolvedValue({ select: mocks.select, insert: mocks.insert });
  });

  it("persists long direct evidence URLs in sourceRefsJson for the active organization", async () => {
    const directReference = "S1 · https://news.google.com/rss/articles/CBMifEFVX3lxTFBWUmpJVDZKWGVxT1dwYUZjN01NTVF0Z0tQbF9uWk5yQ1V5S1ZybjRrU0lMZ0R5U0ppV0E";
    await createKnowledgeAsset(1, "org-private", { kind: "insight", status: "published", title: "Signal", content: "Evidence-linked conclusion", tags: ["strategy"], scanIds: ["scan-1"], sourceRefs: [directReference] });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-private", scanIdsJson: JSON.stringify(["scan-1"]), sourceRefsJson: JSON.stringify([directReference]) }));
  });
});
