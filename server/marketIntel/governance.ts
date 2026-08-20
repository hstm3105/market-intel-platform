import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { organizationAuditEvents, organizationRetentionPolicies } from "../../drizzle/schema";
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
  const [policy, events] = await Promise.all([getRetentionPolicy(organizationId), listAuditEvents(organizationId, 75)]);
  return { policy, events };
}
