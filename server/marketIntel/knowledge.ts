import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { knowledgeAssets, knowledgeCollections, marketScans, portfolioViews } from "../../drizzle/schema";
import { getDb } from "../db";
import { analyzeSourceIntelligence } from "../../shared/sourceIntelligence";
import { summarizePortfolio } from "../../shared/portfolioIntelligence";
import { filterKnowledgeAssets, normalizeTags, tagDirectory, type KnowledgeSearchFilters } from "../../shared/knowledgeDiscovery";
import type { ResearchSource, ScanAnalysis } from "./research";

const requireDb = async () => { const db = await getDb(); if (!db) throw new Error("The research database is currently unavailable."); return db; };
const parseList = (value: string) => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };

export async function listKnowledge(userId: number, organizationId: string) {
  const db = await requireDb();
  const [collections, assets] = await Promise.all([
    db.select().from(knowledgeCollections).where(and(eq(knowledgeCollections.userId, userId), eq(knowledgeCollections.organizationId, organizationId))).orderBy(desc(knowledgeCollections.updatedAt)),
    db.select().from(knowledgeAssets).where(and(eq(knowledgeAssets.userId, userId), eq(knowledgeAssets.organizationId, organizationId))).orderBy(desc(knowledgeAssets.updatedAt)),
  ]);
  return { collections, assets: assets.map(asset => ({ ...asset, tags: normalizeTags(parseList(asset.tagsJson) as string[]), scanIds: parseList(asset.scanIdsJson) as string[], sourceRefs: parseList(asset.sourceRefsJson) as string[] })) };
}

export async function searchKnowledge(userId: number, organizationId: string, filters: KnowledgeSearchFilters = {}) {
  const knowledge = await listKnowledge(userId, organizationId);
  const assets = filterKnowledgeAssets(knowledge.assets, filters);
  return { ...knowledge, assets, availableTags: tagDirectory(knowledge.assets) };
}

export async function createKnowledgeCollection(userId: number, organizationId: string, input: { name: string; description: string }) {
  const db = await requireDb(); const row = { id: nanoid(), userId, organizationId, name: input.name.trim(), description: input.description.trim() }; await db.insert(knowledgeCollections).values(row); return row;
}

async function assertScansInOrganization(userId: number, organizationId: string, scanIds: string[]) {
  if (!scanIds.length) return;
  const db = await requireDb(); const scans = await db.select({ id: marketScans.id }).from(marketScans).where(and(eq(marketScans.userId, userId), eq(marketScans.organizationId, organizationId), inArray(marketScans.id, scanIds)));
  if (scans.length !== scanIds.length) throw new Error("One or more selected scans are outside the active organization.");
}

export async function createKnowledgeAsset(userId: number, organizationId: string, input: { collectionId?: string; kind: "insight" | "brief" | "decision_note"; status: "draft" | "published"; title: string; content: string; tags: string[]; scanIds: string[]; sourceRefs: string[] }) {
  const db = await requireDb(); await assertScansInOrganization(userId, organizationId, input.scanIds);
  if (input.collectionId) { const [collection] = await db.select({ id: knowledgeCollections.id }).from(knowledgeCollections).where(and(eq(knowledgeCollections.id, input.collectionId), eq(knowledgeCollections.userId, userId), eq(knowledgeCollections.organizationId, organizationId))).limit(1); if (!collection) throw new Error("Knowledge collection not found."); }
  const row = { id: nanoid(), userId, organizationId, collectionId: input.collectionId ?? null, kind: input.kind, status: input.status, title: input.title.trim(), content: input.content.trim(), tagsJson: JSON.stringify(normalizeTags(input.tags)), scanIdsJson: JSON.stringify(input.scanIds), sourceRefsJson: JSON.stringify(input.sourceRefs) };
  await db.insert(knowledgeAssets).values(row); return row;
}

export async function updateKnowledgeAssetTags(userId: number, organizationId: string, assetId: string, tags: string[]) {
  const db = await requireDb();
  const [asset] = await db.select({ id: knowledgeAssets.id }).from(knowledgeAssets).where(and(eq(knowledgeAssets.id, assetId), eq(knowledgeAssets.userId, userId), eq(knowledgeAssets.organizationId, organizationId))).limit(1);
  if (!asset) throw new Error("Knowledge asset not found.");
  const normalizedTags = normalizeTags(tags);
  await db.update(knowledgeAssets).set({ tagsJson: JSON.stringify(normalizedTags), updatedAt: new Date() }).where(and(eq(knowledgeAssets.id, assetId), eq(knowledgeAssets.userId, userId), eq(knowledgeAssets.organizationId, organizationId)));
  return { id: assetId, tags: normalizedTags };
}

export async function listPortfolioViews(userId: number, organizationId: string) { const db = await requireDb(); const views = await db.select().from(portfolioViews).where(and(eq(portfolioViews.userId, userId), eq(portfolioViews.organizationId, organizationId))).orderBy(desc(portfolioViews.updatedAt)); return views.map(view => ({ ...view, scanIds: parseList(view.scanIdsJson) as string[] })); }

export async function savePortfolioView(userId: number, organizationId: string, input: { name: string; scanIds: string[] }) { const db = await requireDb(); await assertScansInOrganization(userId, organizationId, input.scanIds); const row = { id: nanoid(), userId, organizationId, name: input.name.trim(), scanIdsJson: JSON.stringify(input.scanIds) }; await db.insert(portfolioViews).values(row).onDuplicateKeyUpdate({ set: { scanIdsJson: row.scanIdsJson } }); return row; }

export async function portfolioSnapshot(userId: number, organizationId: string, selectedScanIds: string[] = []) {
  const db = await requireDb();
  const condition = selectedScanIds.length ? and(eq(marketScans.userId, userId), eq(marketScans.organizationId, organizationId), inArray(marketScans.id, selectedScanIds)) : and(eq(marketScans.userId, userId), eq(marketScans.organizationId, organizationId));
  const rows = await db.select().from(marketScans).where(condition).orderBy(desc(marketScans.createdAt));
  if (selectedScanIds.length && rows.length !== selectedScanIds.length) throw new Error("One or more selected scans are outside the active organization.");
  const scans = rows.map(scan => {
    let sources: ResearchSource[] = []; let analysis: ScanAnalysis | null = null;
    try { const value = JSON.parse(scan.sourceJson); if (Array.isArray(value)) sources = value as ResearchSource[]; } catch { /* Legacy scans use zero-source metrics. */ }
    try { analysis = JSON.parse(scan.analysisJson) as ScanAnalysis; } catch { /* Malformed legacy analysis contributes no risk themes. */ }
    return { id: scan.id, industryName: scan.industryName, createdAt: scan.createdAt, executiveSummary: scan.executiveSummary, sourceIntelligence: analyzeSourceIntelligence(sources, scan.createdAt), risks: analysis?.risks ?? [], emergingRisks: analysis?.emergingRisks ?? [], sources: sources.map(source => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url })), scope: scan.scope };
  });
  return { scans, metrics: summarizePortfolio(scans) };
}
