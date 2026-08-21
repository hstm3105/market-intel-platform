import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), select: vi.fn(), from: vi.fn(), where: vi.fn(), limit: vi.fn(), insert: vi.fn(), values: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { deliverExecutiveBriefingToGoogleWorkspace, googleWorkspaceDeliveryConfigured } from "./googleWorkspaceDelivery";

const approvedBriefing = {
  id: "brief-private", organizationId: "org-private", reviewStatus: "approved", title: "Evidence-backed market update", evidenceDigest: "digest-private", contentJson: JSON.stringify({ headline: "Evidence-backed market update", briefingSummary: "A concise decision summary.", priorityMoves: [{ title: "Priority move", rationale: "Act on the cited signal.", evidenceRefs: ["scan-1:S1"] }], watchSignals: [], uncertainty: "Validate the evidence before action." }), citationsJson: JSON.stringify([{ id: "scan-1:S1", label: "Market source", url: "https://example.com/source" }]),
};

describe("Google Workspace executive delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "refresh-token";
    process.env.GOOGLE_WORKSPACE_SENDER_EMAIL = "sender@example.com";
    mocks.limit.mockResolvedValue([approvedBriefing]);
    mocks.where.mockReturnValue({ limit: mocks.limit });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.values.mockResolvedValue(undefined);
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.getDb.mockResolvedValue({ select: mocks.select, insert: mocks.insert });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("recognizes the complete protected Google Workspace configuration", () => {
    expect(googleWorkspaceDeliveryConfigured()).toBe(true);
  });

  it("creates an immutable Google Docs delivery record only for an approved private briefing", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "ya29.test" }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ documentId: "doc-42" }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "ya29.test" }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const result = await deliverExecutiveBriefingToGoogleWorkspace({ organizationId: "org-private", requestedByUserId: 7, briefingId: "brief-private", destination: "google_docs" });

    expect(result).toMatchObject({ destination: "google_docs", status: "created", externalUrl: "https://docs.google.com/document/d/doc-42/edit" });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-private", briefingId: "brief-private", destination: "google_docs", status: "created", externalFileId: "doc-42" }));
  });

  it("rejects a briefing outside the active organization before calling Google", async () => {
    mocks.limit.mockResolvedValue([]);
    await expect(deliverExecutiveBriefingToGoogleWorkspace({ organizationId: "org-private", requestedByUserId: 7, briefingId: "brief-foreign", destination: "google_sheets" })).rejects.toThrow(/outside the active organization/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires valid recipient addresses before Gmail delivery", async () => {
    await expect(deliverExecutiveBriefingToGoogleWorkspace({ organizationId: "org-private", requestedByUserId: 7, briefingId: "brief-private", destination: "gmail", recipients: ["not-an-email"] })).rejects.toThrow(/valid recipient/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("normalizes hostile briefing titles before constructing Gmail headers", async () => {
    mocks.limit.mockResolvedValue([{ ...approvedBriefing, title: "Market update\r\nBcc: attacker@example.com" }]);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "ya29.test" }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: "message-42" }), { status: 200 }));

    await deliverExecutiveBriefingToGoogleWorkspace({ organizationId: "org-private", requestedByUserId: 7, briefingId: "brief-private", destination: "gmail", recipients: ["recipient@example.com"] });

    const request = fetchMock.mock.calls[1][1];
    const raw = JSON.parse(String(request?.body)).raw as string;
    const message = Buffer.from(raw, "base64url").toString("utf8");
    expect(message).not.toContain("\r\nBcc:");
    expect(message).toContain("Subject: [Executive briefing] Market update Bcc: attacker@example.com");
  });
});
