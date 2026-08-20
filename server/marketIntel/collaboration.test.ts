import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), select: vi.fn(), from: vi.fn(), where: vi.fn(), limit: vi.fn(), innerJoin: vi.fn(), orderBy: vi.fn(), insert: vi.fn(), values: vi.fn(), onDuplicateKeyUpdate: vi.fn(), update: vi.fn(), set: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { decideReview, getReview, listComments, requestReview } from "./collaboration";

const target = { targetType: "market_scan" as const, targetId: "scan-1" };
const validTarget = { id: "scan-1" };
const targetQuery = (result: unknown[]) => ({ where: () => ({ limit: () => Promise.resolve(result) }) });

describe("collaboration persistence boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.values.mockReturnValue({ onDuplicateKeyUpdate: mocks.onDuplicateKeyUpdate });
    mocks.onDuplicateKeyUpdate.mockResolvedValue(undefined);
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.set.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.getDb.mockResolvedValue({ select: mocks.select, insert: mocks.insert, update: mocks.update });
  });

  it("filters a mixed persistence result so comments never cross the active organization or target boundary", async () => {
    const privateComment = { id: "comment-private", organizationId: "org-a", targetType: "market_scan", targetId: "scan-1", authorUserId: 1, body: "Private feedback", mentionedUserIdsJson: "[2]", createdAt: new Date(), updatedAt: new Date(), authorName: "Author", authorEmail: "author@example.com" };
    const foreignComment = { ...privateComment, id: "comment-foreign", organizationId: "org-b", targetId: "scan-9" };
    mocks.from.mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce({ innerJoin: () => ({ where: () => ({ orderBy: () => Promise.resolve([privateComment, foreignComment]) }) }) });
    const comments = await listComments("org-a", target);
    expect(comments).toEqual([expect.objectContaining({ id: "comment-private", organizationId: "org-a", mentionedUserIds: [2] })]);
  });

  it("rejects a foreign target before it can expose comments or review metadata", async () => {
    mocks.from.mockReturnValueOnce(targetQuery([]));
    await expect(getReview("org-a", target)).rejects.toThrow("outside the active organization");
  });

  it("does not surface a foreign review row even if an underlying adapter returns one", async () => {
    const foreignReview = { id: "review-b", organizationId: "org-b", targetType: "market_scan", targetId: "scan-1", status: "approved" };
    mocks.from.mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([foreignReview]));
    await expect(getReview("org-a", target)).resolves.toBeNull();
  });

  it("rejects decisions before a review is requested and prevents self-review assignment", async () => {
    mocks.from.mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([]));
    await expect(decideReview("org-a", 7, { ...target, status: "approved", decisionNote: "Ready" }, false)).rejects.toThrow("Request a review");
    mocks.from.mockReset().mockReturnValueOnce(targetQuery([validTarget]));
    await expect(requestReview("org-a", 7, { ...target, reviewerUserId: 7 })).rejects.toThrow("different organization reviewer");
  });

  it("resets a re-requested review to in-review with no decision owner or note", async () => {
    const persisted = { id: "review-1", organizationId: "org-a", targetType: "market_scan", targetId: "scan-1", status: "in_review", requestedByUserId: 7, reviewerUserId: 3, decisionByUserId: null, decisionNote: "", createdAt: new Date(), updatedAt: new Date() };
    mocks.from.mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([{ role: "research_lead" }])).mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([persisted]));
    await requestReview("org-a", 7, { ...target, reviewerUserId: 3 });
    expect(mocks.onDuplicateKeyUpdate).toHaveBeenCalledWith(expect.objectContaining({ set: expect.objectContaining({ status: "in_review", requestedByUserId: 7, reviewerUserId: 3, decisionByUserId: null, decisionNote: "" }) }));
  });

  it("blocks a non-assigned review leader while allowing the assigned reviewer and owner/admin override path", async () => {
    const activeReview = { id: "review-1", organizationId: "org-a", targetType: "market_scan", targetId: "scan-1", status: "in_review", requestedByUserId: 7, reviewerUserId: 3, decisionByUserId: null, decisionNote: "", createdAt: new Date(), updatedAt: new Date() };
    mocks.from.mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([activeReview]));
    await expect(decideReview("org-a", 4, { ...target, status: "approved", decisionNote: "Ready" }, false)).rejects.toThrow("assigned reviewer");

    mocks.from.mockReset().mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([activeReview])).mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([{ ...activeReview, status: "approved", decisionByUserId: 3, decisionNote: "Ready" }]));
    await expect(decideReview("org-a", 3, { ...target, status: "approved", decisionNote: "Ready" }, false)).resolves.toEqual(expect.objectContaining({ status: "approved", decisionByUserId: 3 }));

    mocks.from.mockReset().mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([activeReview])).mockReturnValueOnce(targetQuery([validTarget])).mockReturnValueOnce(targetQuery([{ ...activeReview, status: "changes_requested", decisionByUserId: 9, decisionNote: "Clarify the cited evidence." }]));
    await expect(decideReview("org-a", 9, { ...target, status: "changes_requested", decisionNote: "Clarify the cited evidence." }, true)).resolves.toEqual(expect.objectContaining({ status: "changes_requested", decisionByUserId: 9 }));
  });
});
