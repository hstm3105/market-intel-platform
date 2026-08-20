import { and, asc, eq, inArray } from "drizzle-orm";
import { collaborationComments, collaborationReviews, knowledgeAssets, marketScans, organizationMembers, users } from "../../drizzle/schema";
import { getDb } from "../db";

export const collaborationTargetTypes = ["market_scan", "knowledge_asset"] as const;
export type CollaborationTargetType = (typeof collaborationTargetTypes)[number];
export type ReviewStatus = "draft" | "in_review" | "changes_requested" | "approved";
export type CollaborationTarget = { targetType: CollaborationTargetType; targetId: string };
const reviewerRoles = new Set(["owner", "admin", "research_lead"]);

const requireDb = async () => { const db = await getDb(); if (!db) throw new Error("The collaboration database is currently unavailable."); return db; };
const distinctIds = (ids: number[]) => Array.from(new Set(ids.filter(id => Number.isInteger(id) && id > 0))).slice(0, 16);

async function requireTarget(organizationId: string, target: CollaborationTarget) {
  const db = await requireDb();
  const table = target.targetType === "market_scan" ? marketScans : knowledgeAssets;
  const [record] = await db.select({ id: table.id }).from(table).where(and(eq(table.id, target.targetId), eq(table.organizationId, organizationId))).limit(1);
  if (!record) throw new Error("The selected collaboration record is outside the active organization or no longer exists.");
  return record;
}

async function requireMentionMembers(organizationId: string, mentionedUserIds: number[]) {
  if (!mentionedUserIds.length) return [];
  const db = await requireDb();
  const members = await db.select({ userId: organizationMembers.userId }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), inArray(organizationMembers.userId, mentionedUserIds)));
  if (members.length !== mentionedUserIds.length) throw new Error("Mentions must reference active members of this organization.");
  return mentionedUserIds;
}

const commentSelection = { id: collaborationComments.id, organizationId: collaborationComments.organizationId, targetType: collaborationComments.targetType, targetId: collaborationComments.targetId, authorUserId: collaborationComments.authorUserId, body: collaborationComments.body, mentionedUserIdsJson: collaborationComments.mentionedUserIdsJson, createdAt: collaborationComments.createdAt, updatedAt: collaborationComments.updatedAt, authorName: users.name, authorEmail: users.email };
const readMentionIds = (value: string) => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? distinctIds(parsed.map(Number)) : []; } catch { return []; } };

export async function listComments(organizationId: string, target: CollaborationTarget) {
  await requireTarget(organizationId, target);
  const db = await requireDb();
  const rows = await db.select(commentSelection).from(collaborationComments).innerJoin(users, eq(users.id, collaborationComments.authorUserId)).where(and(eq(collaborationComments.organizationId, organizationId), eq(collaborationComments.targetType, target.targetType), eq(collaborationComments.targetId, target.targetId))).orderBy(asc(collaborationComments.createdAt));
  return rows.filter(row => row.organizationId === organizationId && row.targetType === target.targetType && row.targetId === target.targetId).map(row => ({ ...row, mentionedUserIds: readMentionIds(row.mentionedUserIdsJson) }));
}

export async function createComment(organizationId: string, authorUserId: number, input: CollaborationTarget & { body: string; mentionedUserIds?: number[] }) {
  await requireTarget(organizationId, input);
  const db = await requireDb();
  const mentionedUserIds = await requireMentionMembers(organizationId, distinctIds(input.mentionedUserIds ?? []));
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  await db.insert(collaborationComments).values({ id, organizationId, targetType: input.targetType, targetId: input.targetId, authorUserId, body: input.body.trim(), mentionedUserIdsJson: JSON.stringify(mentionedUserIds) });
  const [comment] = await db.select(commentSelection).from(collaborationComments).innerJoin(users, eq(users.id, collaborationComments.authorUserId)).where(eq(collaborationComments.id, id)).limit(1);
  return { ...comment, mentionedUserIds };
}

export async function getReview(organizationId: string, target: CollaborationTarget) {
  await requireTarget(organizationId, target);
  const db = await requireDb();
  const [review] = await db.select().from(collaborationReviews).where(and(eq(collaborationReviews.organizationId, organizationId), eq(collaborationReviews.targetType, target.targetType), eq(collaborationReviews.targetId, target.targetId))).limit(1);
  return review && review.organizationId === organizationId && review.targetType === target.targetType && review.targetId === target.targetId ? review : null;
}

export async function requestReview(organizationId: string, requesterUserId: number, input: CollaborationTarget & { reviewerUserId?: number | null }) {
  await requireTarget(organizationId, input);
  const db = await requireDb();
  if (input.reviewerUserId) {
    if (input.reviewerUserId === requesterUserId) throw new Error("Assign a different organization reviewer.");
    const [reviewer] = await db.select({ role: organizationMembers.role }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, input.reviewerUserId))).limit(1);
    if (!reviewer || !reviewerRoles.has(reviewer.role)) throw new Error("The assigned reviewer must be an owner, administrator, or research lead in this organization.");
  }
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  await db.insert(collaborationReviews).values({ id, organizationId, targetType: input.targetType, targetId: input.targetId, status: "in_review", requestedByUserId: requesterUserId, reviewerUserId: input.reviewerUserId ?? null, decisionByUserId: null, decisionNote: "" }).onDuplicateKeyUpdate({ set: { status: "in_review", requestedByUserId: requesterUserId, reviewerUserId: input.reviewerUserId ?? null, decisionByUserId: null, decisionNote: "" } });
  return getReview(organizationId, input);
}

export async function decideReview(organizationId: string, actorUserId: number, input: CollaborationTarget & { status: Extract<ReviewStatus, "approved" | "changes_requested">; decisionNote: string }, canOverrideReviewer: boolean) {
  const review = await getReview(organizationId, input);
  if (!review) throw new Error("Request a review before recording an approval or change request.");
  if (review.status !== "in_review" && review.status !== "changes_requested") throw new Error("Only an active review can receive this decision.");
  if (review.reviewerUserId && review.reviewerUserId !== actorUserId && !canOverrideReviewer) throw new Error("Only the assigned reviewer or an organization owner/administrator can decide this review.");
  const db = await requireDb();
  await db.update(collaborationReviews).set({ status: input.status, decisionByUserId: actorUserId, decisionNote: input.decisionNote.trim() }).where(eq(collaborationReviews.id, review.id));
  return getReview(organizationId, input);
}

export async function getCollaborationOverview(organizationId: string, target: CollaborationTarget) {
  const [comments, review] = await Promise.all([listComments(organizationId, target), getReview(organizationId, target)]);
  return { comments, review };
}
