import { and, desc, eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { knowledgeAssets, marketScans, organizationAuditEvents, organizationRetentionPolicies, organizationRetentionRuns, organizations } from "../../drizzle/schema";
import { getDb } from "../db";

const requireDb = async () => { const db = await getDb(); if (!db) throw new Error("The governance database is currently unavailable."); return db; };
const parseMetadata = (value: string) => { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } };
const DEFAULT_RETENTION = { researchRetentionDays: 730, knowledgeRetentionDays: 1095, auditRetentionDays: 1095, legalHoldEnabled: false };

export type AuditEventInput = { eventType: string; resourceType: string; resourceId?: string | null; metadata?: Record<string, string | number | boolean | null | undefined> };

function safeMetadata(metadata: AuditEventInput["metadata"] = {}) {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value)).slice(0, 16));
}

export async function recordAuditEvent(organizationId: string, actorUserId: number, input: AuditEventInput) {
  const db = await requireDb();
  const row = { id: nanoid(), organizationId, actorUserId, eventType: input.eventType.slice(0, 96), resourceType: input.resourceType.slice(0, 64), resourceId: input.resourceId?.slice(0, 40) ?? null, metadataJson: JSON.stringify(safeMetadata(input.metadata)) };
  await db.insert(organizationAuditEvents).values(row);
  return row;
}

export async function listAuditEvents(organizationId: string, limit = 75) {
  const db = await requireDb();
  const rows = await db.select().from(organizationAuditEvents).where(eq(organizationAuditEvents.organizationId, organizationId)).orderBy(desc(organizationAuditEvents.createdAt)).limit(Math.min(Math.max(limit, 1), 200));
  return rows.filter(event => event.organizationId === organizationId).map(event => ({ ...event, metadata: parseMetadata(event.metadataJson) }));
}

export async function getRetentionPolicy(organizationId: string) {
  const db = await requireDb();
  const [policy] = await db.select().from(organizationRetentionPolicies).where(eq(organizationRetentionPolicies.organizationId, organizationId)).limit(1);
  return policy ?? { id: null, organizationId, updatedByUserId: null, ...DEFAULT_RETENTION, createdAt: null, updatedAt: null };
}

export async function updateRetentionPolicy(organizationId: string, actorUserId: number, input: typeof DEFAULT_RETENTION) {
  const db = await requireDb();
  const row = { id: nanoid(), organizationId, updatedByUserId: actorUserId, ...input };
  await db.insert(organizationRetentionPolicies).values(row).onDuplicateKeyUpdate({ set: { researchRetentionDays: input.researchRetentionDays, knowledgeRetentionDays: input.knowledgeRetentionDays, auditRetentionDays: input.auditRetentionDays, legalHoldEnabled: input.legalHoldEnabled, updatedByUserId: actorUserId } });
  await recordAuditEvent(organizationId, actorUserId, { eventType: "governance.retention_policy.updated", resourceType: "retention_policy", resourceId: organizationId, metadata: { researchRetentionDays: input.researchRetentionDays, knowledgeRetentionDays: input.knowledgeRetentionDays, auditRetentionDays: input.auditRetentionDays, legalHoldEnabled: input.legalHoldEnabled } });
  return getRetentionPolicy(organizationId);
}

export async function getGovernanceOverview(organizationId: string) {
  const [policy, events, runs] = await Promise.all([getRetentionPolicy(organizationId), listAuditEvents(organizationId, 75), listRetentionRuns(organizationId)]);
  return { policy, events, runs };
}

export async function listRetentionRuns(organizationId: string) {
  const db = await requireDb(); const runs = await db.select().from(organizationRetentionRuns).where(eq(organizationRetentionRuns.organizationId, organizationId)).orderBy(desc(organizationRetentionRuns.completedAt)).limit(30);
  return runs.filter(run => run.organizationId === organizationId).map(run => ({ ...run, outcomes: parseMetadata(run.outcomesJson) }));
}

type RetentionAction = "preview" | "execute" | "scheduled_execute";
export async function runRetention(organizationId: string, initiatedByUserId: number, action: RetentionAction = "preview") {
  const db = await requireDb(); const policy = await getRetentionPolicy(organizationId); const now = new Date();
  const base = { id: nanoid(), organizationId, initiatedByUserId, action, researchAffected: 0, knowledgeAffected: 0, auditAffected: 0 };
  if (policy.legalHoldEnabled) {
    const outcomes = { legalHold: true, message: "No retention action ran because the organization is under legal hold." }; await db.insert(organizationRetentionRuns).values({ ...base, status: "legal_hold_skipped", outcomesJson: JSON.stringify(outcomes) }); await recordAuditEvent(organizationId, initiatedByUserId, { eventType: "governance.retention.legal_hold_skipped", resourceType: "retention_run", resourceId: base.id, metadata: { action } }); return { ...base, status: "legal_hold_skipped" as const, outcomes };
  }
  const researchBefore = new Date(now); researchBefore.setUTCDate(researchBefore.getUTCDate() - policy.researchRetentionDays); const knowledgeBefore = new Date(now); knowledgeBefore.setUTCDate(knowledgeBefore.getUTCDate() - policy.knowledgeRetentionDays); const auditBefore = new Date(now); auditBefore.setUTCDate(auditBefore.getUTCDate() - policy.auditRetentionDays);
  const [research, knowledge, audits] = await Promise.all([
    db.select({ id: marketScans.id }).from(marketScans).where(and(eq(marketScans.organizationId, organizationId), lt(marketScans.createdAt, researchBefore))),
    db.select({ id: knowledgeAssets.id }).from(knowledgeAssets).where(and(eq(knowledgeAssets.organizationId, organizationId), lt(knowledgeAssets.updatedAt, knowledgeBefore))),
    db.select({ id: organizationAuditEvents.id }).from(organizationAuditEvents).where(and(eq(organizationAuditEvents.organizationId, organizationId), lt(organizationAuditEvents.createdAt, auditBefore))),
  ]);
  const outcomes = { legalHold: false, mode: action, cutoffs: { researchBefore: researchBefore.toISOString(), knowledgeBefore: knowledgeBefore.toISOString(), auditBefore: auditBefore.toISOString() }, affected: { research: research.length, knowledge: knowledge.length, audit: audits.length } };
  if (action !== "preview") await Promise.all([
    research.length ? db.delete(marketScans).where(and(eq(marketScans.organizationId, organizationId), lt(marketScans.createdAt, researchBefore))) : Promise.resolve(),
    knowledge.length ? db.delete(knowledgeAssets).where(and(eq(knowledgeAssets.organizationId, organizationId), lt(knowledgeAssets.updatedAt, knowledgeBefore))) : Promise.resolve(),
    audits.length ? db.delete(organizationAuditEvents).where(and(eq(organizationAuditEvents.organizationId, organizationId), lt(organizationAuditEvents.createdAt, auditBefore))) : Promise.resolve(),
  ]);
  await db.insert(organizationRetentionRuns).values({ ...base, status: "completed", researchAffected: research.length, knowledgeAffected: knowledge.length, auditAffected: audits.length, outcomesJson: JSON.stringify(outcomes) }); await recordAuditEvent(organizationId, initiatedByUserId, { eventType: action === "preview" ? "governance.retention.previewed" : "governance.retention.executed", resourceType: "retention_run", resourceId: base.id, metadata: { researchAffected: research.length, knowledgeAffected: knowledge.length, auditAffected: audits.length } }); return { ...base, status: "completed" as const, outcomes };
}

export async function runScheduledRetentionBatch() {
  const db = await requireDb(); const rows = await db.select({ id: organizations.id }).from(organizations); const results = [] as Array<{ organizationId: string; status: string }>;
  for (const organization of rows) { try { const run = await runRetention(organization.id, 0, "scheduled_execute"); results.push({ organizationId: organization.id, status: run.status }); } catch { results.push({ organizationId: organization.id, status: "failed" }); } }
  return results;
}
