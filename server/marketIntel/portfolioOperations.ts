import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { knowledgeAssets, marketScans, organizationMembers, organizationPortfolioPolicies, portfolioMandates, portfolioWatchlists } from "../../drizzle/schema";
import { getDb } from "../db";

export type MandateStatus = "scoping" | "active" | "at_risk" | "complete";
export type MandatePriority = "low" | "standard" | "high" | "critical";
export type WatchStatus = "watching" | "escalated" | "resolved";
const requireDb = async () => { const db = await getDb(); if (!db) throw new Error("The portfolio operations database is currently unavailable."); return db; };
const parseArray = (value: string) => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; } };
const policyDefaults = { maxActiveMandates: 30, requireMandateOwner: true, requireReviewForCritical: true };

async function getPolicy(organizationId: string, fallbackUserId: number) {
  const db = await requireDb();
  const [policy] = await db.select().from(organizationPortfolioPolicies).where(eq(organizationPortfolioPolicies.organizationId, organizationId)).limit(1);
  if (policy) return policy;
  const id = nanoid();
  await db.insert(organizationPortfolioPolicies).values({ id, organizationId, updatedByUserId: fallbackUserId, ...policyDefaults }).onDuplicateKeyUpdate({ set: { updatedByUserId: fallbackUserId } });
  const [created] = await db.select().from(organizationPortfolioPolicies).where(eq(organizationPortfolioPolicies.organizationId, organizationId)).limit(1);
  if (!created) throw new Error("The organization portfolio policy could not be initialized.");
  return created;
}

export async function listPortfolioOperations(organizationId: string, fallbackUserId: number) {
  const db = await requireDb();
  const [policy, mandates, watchlists] = await Promise.all([
    getPolicy(organizationId, fallbackUserId),
    db.select().from(portfolioMandates).where(eq(portfolioMandates.organizationId, organizationId)).orderBy(desc(portfolioMandates.updatedAt)),
    db.select().from(portfolioWatchlists).where(eq(portfolioWatchlists.organizationId, organizationId)).orderBy(desc(portfolioWatchlists.updatedAt)),
  ]);
  const safeMandates = mandates.filter(mandate => mandate.organizationId === organizationId).map(mandate => ({ ...mandate, scanIds: parseArray(mandate.scanIdsJson), knowledgeAssetIds: parseArray(mandate.knowledgeAssetIdsJson) }));
  const safeWatchlists = watchlists.filter(watch => watch.organizationId === organizationId);
  return { policy, mandates: safeMandates, watchlists: safeWatchlists, metrics: { activeMandates: safeMandates.filter(mandate => mandate.status === "active" || mandate.status === "at_risk").length, atRiskMandates: safeMandates.filter(mandate => mandate.status === "at_risk").length, escalatedWatchlists: safeWatchlists.filter(watch => watch.status === "escalated").length, capacity: policy.maxActiveMandates } };
}

async function verifyOwner(organizationId: string, ownerUserId: number) {
  const db = await requireDb();
  const [membership] = await db.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, ownerUserId))).limit(1);
  if (!membership) throw new Error("The selected mandate owner is outside the active organization.");
}

async function verifyReferences(organizationId: string, scanIds: string[], knowledgeAssetIds: string[]) {
  const db = await requireDb();
  const [scans, assets] = await Promise.all([
    scanIds.length ? db.select({ id: marketScans.id }).from(marketScans).where(and(eq(marketScans.organizationId, organizationId), inArray(marketScans.id, scanIds))) : [],
    knowledgeAssetIds.length ? db.select({ id: knowledgeAssets.id }).from(knowledgeAssets).where(and(eq(knowledgeAssets.organizationId, organizationId), inArray(knowledgeAssets.id, knowledgeAssetIds))) : [],
  ]);
  if (scans.length !== scanIds.length || assets.length !== knowledgeAssetIds.length) throw new Error("A selected scan or knowledge asset is outside the active organization.");
}

export async function createMandate(input: { organizationId: string; createdByUserId: number; ownerUserId: number; name: string; clientLabel: string; description: string; status: MandateStatus; priority: MandatePriority; targetDate?: Date | null; scanIds: string[]; knowledgeAssetIds: string[] }) {
  const db = await requireDb(); const policy = await getPolicy(input.organizationId, input.createdByUserId);
  if (policy.requireMandateOwner) await verifyOwner(input.organizationId, input.ownerUserId);
  await verifyReferences(input.organizationId, input.scanIds, input.knowledgeAssetIds);
  if (input.status === "active" || input.status === "at_risk") { const active = await db.select({ id: portfolioMandates.id }).from(portfolioMandates).where(and(eq(portfolioMandates.organizationId, input.organizationId), inArray(portfolioMandates.status, ["active", "at_risk"]))); if (active.length >= policy.maxActiveMandates) throw new Error("This organization has reached its active-mandate capacity."); }
  const id = nanoid(); await db.insert(portfolioMandates).values({ id, organizationId: input.organizationId, createdByUserId: input.createdByUserId, ownerUserId: input.ownerUserId, name: input.name, clientLabel: input.clientLabel, description: input.description, status: input.status, priority: input.priority, targetDate: input.targetDate ?? null, scanIdsJson: JSON.stringify(input.scanIds), knowledgeAssetIdsJson: JSON.stringify(input.knowledgeAssetIds) });
  return { id };
}

export async function updateMandateStatus(input: { organizationId: string; mandateId: string; status: MandateStatus }) {
  const db = await requireDb(); const [mandate] = await db.select().from(portfolioMandates).where(and(eq(portfolioMandates.id, input.mandateId), eq(portfolioMandates.organizationId, input.organizationId))).limit(1); if (!mandate) throw new Error("The portfolio mandate could not be found in the active organization.");
  await db.update(portfolioMandates).set({ status: input.status }).where(and(eq(portfolioMandates.id, input.mandateId), eq(portfolioMandates.organizationId, input.organizationId))); return { id: input.mandateId, status: input.status };
}

export async function createWatchlist(input: { organizationId: string; createdByUserId: number; ownerUserId: number; mandateId?: string | null; targetType: "industry" | "company" | "risk_theme"; label: string; rationale: string; status: WatchStatus }) {
  const db = await requireDb(); await verifyOwner(input.organizationId, input.ownerUserId);
  if (input.mandateId) { const [mandate] = await db.select({ id: portfolioMandates.id }).from(portfolioMandates).where(and(eq(portfolioMandates.id, input.mandateId), eq(portfolioMandates.organizationId, input.organizationId))).limit(1); if (!mandate) throw new Error("The selected mandate is outside the active organization."); }
  const id = nanoid(); await db.insert(portfolioWatchlists).values({ id, organizationId: input.organizationId, createdByUserId: input.createdByUserId, ownerUserId: input.ownerUserId, mandateId: input.mandateId ?? null, targetType: input.targetType, label: input.label, rationale: input.rationale, status: input.status }); return { id };
}

export async function updateWatchlistStatus(input: { organizationId: string; watchlistId: string; status: WatchStatus }) { const db = await requireDb(); const [watch] = await db.select({ id: portfolioWatchlists.id }).from(portfolioWatchlists).where(and(eq(portfolioWatchlists.id, input.watchlistId), eq(portfolioWatchlists.organizationId, input.organizationId))).limit(1); if (!watch) throw new Error("The watchlist item could not be found in the active organization."); await db.update(portfolioWatchlists).set({ status: input.status }).where(and(eq(portfolioWatchlists.id, input.watchlistId), eq(portfolioWatchlists.organizationId, input.organizationId))); return { id: input.watchlistId, status: input.status }; }

export async function updatePortfolioPolicy(input: { organizationId: string; updatedByUserId: number; maxActiveMandates: number; requireMandateOwner: boolean; requireReviewForCritical: boolean }) {
  const db = await requireDb(); await getPolicy(input.organizationId, input.updatedByUserId);
  await db.update(organizationPortfolioPolicies).set({ maxActiveMandates: input.maxActiveMandates, requireMandateOwner: input.requireMandateOwner, requireReviewForCritical: input.requireReviewForCritical, updatedByUserId: input.updatedByUserId }).where(eq(organizationPortfolioPolicies.organizationId, input.organizationId));
  return getPolicy(input.organizationId, input.updatedByUserId);
}
