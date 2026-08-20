import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { clientDeliverySnapshots, clientDeliveryTemplates, marketScans, organizationIntegrations, portfolioMandates, researchAgentRuns } from "../../drizzle/schema";
import { getDb } from "../db";

export type IntegrationProvider = "google_drive" | "sharepoint" | "salesforce" | "hubspot" | "slack" | "teams";
export type DeliveryTargetType = "market_scan" | "portfolio_mandate" | "agent_run";
const requireDb = async () => { const db = await getDb(); if (!db) throw new Error("The integration and delivery database is currently unavailable."); return db; };
const parseJson = (value: string) => { try { return JSON.parse(value) as unknown; } catch { return null; } };
const sensitiveKey = /(secret|token|password|credential|authorization|api.?key|private.?key)/i;

export type CitationAppendixItem = { label: string; url?: string };
export function buildCitationAppendix(citations: unknown): CitationAppendixItem[] {
  if (Array.isArray(citations)) return citations.slice(0, 100).map((item, index) => { if (item && typeof item === "object") { const record = item as Record<string, unknown>; return { label: typeof record.title === "string" ? record.title : typeof record.publisher === "string" ? record.publisher : `Source ${index + 1}`, url: typeof record.url === "string" ? record.url : undefined }; } return { label: String(item) }; });
  if (citations && typeof citations === "object") return Object.entries(citations as Record<string, unknown>).flatMap(([key, value]) => Array.isArray(value) ? value.slice(0, 100).map((item, index) => ({ label: `${key} ${index + 1}: ${String(item)}` })) : [{ label: `${key}: ${String(value)}` }]);
  return [];
}

export function assertSafeIntegrationConfiguration(configuration: Record<string, string>) {
  for (const [key, value] of Object.entries(configuration)) { if (sensitiveKey.test(key) || sensitiveKey.test(value)) throw new Error("Integration credentials must never be stored in the application. Connect the provider through its secure authorization flow instead."); }
}

export async function listIntegrationDelivery(organizationId: string) {
  const db = await requireDb(); const [integrations, templates, snapshots] = await Promise.all([
    db.select().from(organizationIntegrations).where(eq(organizationIntegrations.organizationId, organizationId)).orderBy(desc(organizationIntegrations.updatedAt)),
    db.select().from(clientDeliveryTemplates).where(eq(clientDeliveryTemplates.organizationId, organizationId)).orderBy(desc(clientDeliveryTemplates.updatedAt)),
    db.select().from(clientDeliverySnapshots).where(eq(clientDeliverySnapshots.organizationId, organizationId)).orderBy(desc(clientDeliverySnapshots.approvedAt)),
  ]);
  return { integrations: integrations.filter(item => item.organizationId === organizationId).map(item => ({ ...item, configuration: parseJson(item.configurationJson) ?? {} })), templates: templates.filter(item => item.organizationId === organizationId), snapshots: snapshots.filter(item => item.organizationId === organizationId).map(item => { const citations = parseJson(item.citationsJson); return { ...item, content: parseJson(item.contentJson), citations, citationAppendix: buildCitationAppendix(citations) }; }) };
}

export async function configureIntegration(input: { organizationId: string; configuredByUserId: number; provider: IntegrationProvider; displayName: string; configuration: Record<string, string>; enabled: boolean }) {
  assertSafeIntegrationConfiguration(input.configuration); const db = await requireDb(); const id = nanoid(); const status = input.enabled ? "connection_required" as const : "disabled" as const;
  await db.insert(organizationIntegrations).values({ id, organizationId: input.organizationId, provider: input.provider, status, displayName: input.displayName, configurationJson: JSON.stringify(input.configuration), configuredByUserId: input.configuredByUserId }).onDuplicateKeyUpdate({ set: { status, displayName: input.displayName, configurationJson: JSON.stringify(input.configuration), configuredByUserId: input.configuredByUserId } });
  return { id, provider: input.provider, status };
}

export async function validateIntegrationConnection(input: { organizationId: string; configuredByUserId: number; provider: IntegrationProvider; secureConnectionReference: string }) {
  if (input.secureConnectionReference.trim().length < 3) throw new Error("Provide the non-secret reference from the completed provider authorization before recording validation."); assertSafeIntegrationConfiguration({ connectionReference: input.secureConnectionReference }); const db = await requireDb(); const [integration] = await db.select().from(organizationIntegrations).where(and(eq(organizationIntegrations.organizationId, input.organizationId), eq(organizationIntegrations.provider, input.provider))).limit(1); if (!integration || integration.status === "disabled") throw new Error("Enable and configure this integration before validating its secure provider connection."); const lastValidatedAt = new Date(); const configuration = { ...(parseJson(integration.configurationJson) as Record<string, string> ?? {}), connectionReference: input.secureConnectionReference.trim() }; await db.update(organizationIntegrations).set({ status: "configured", configurationJson: JSON.stringify(configuration), configuredByUserId: input.configuredByUserId, lastValidatedAt }).where(and(eq(organizationIntegrations.organizationId, input.organizationId), eq(organizationIntegrations.provider, input.provider))); return { id: integration.id, provider: input.provider, status: "configured" as const, lastValidatedAt };
}

export async function createDeliveryTemplate(input: { organizationId: string; createdByUserId: number; name: string; clientLabel: string; templateKind: "executive_brief" | "board_deck" | "client_update"; brandName: string; accentColor: string; executiveIntro: string; includeCitationAppendix: boolean }) {
  const db = await requireDb(); const id = nanoid(); await db.insert(clientDeliveryTemplates).values({ id, ...input }); return { id };
}

export async function captureDeliveryTarget(organizationId: string, targetType: DeliveryTargetType, targetId: string) {
  const db = await requireDb();
  if (targetType === "market_scan") { const [scan] = await db.select().from(marketScans).where(and(eq(marketScans.id, targetId), eq(marketScans.organizationId, organizationId))).limit(1); if (!scan) throw new Error("The chosen market scan is outside the active organization."); return { content: { type: targetType, id: scan.id, industryName: scan.industryName, scope: scan.scope, executiveSummary: scan.executiveSummary, analysis: parseJson(scan.analysisJson), createdAt: scan.createdAt }, citations: parseJson(scan.sourceJson) ?? [] }; }
  if (targetType === "portfolio_mandate") { const [mandate] = await db.select().from(portfolioMandates).where(and(eq(portfolioMandates.id, targetId), eq(portfolioMandates.organizationId, organizationId))).limit(1); if (!mandate) throw new Error("The chosen client mandate is outside the active organization."); return { content: { type: targetType, id: mandate.id, name: mandate.name, clientLabel: mandate.clientLabel, description: mandate.description, status: mandate.status, priority: mandate.priority, targetDate: mandate.targetDate, createdAt: mandate.createdAt }, citations: { scanIds: parseJson(mandate.scanIdsJson) ?? [], knowledgeAssetIds: parseJson(mandate.knowledgeAssetIdsJson) ?? [] } }; }
  const [run] = await db.select().from(researchAgentRuns).where(and(eq(researchAgentRuns.id, targetId), eq(researchAgentRuns.organizationId, organizationId))).limit(1); if (!run) throw new Error("The chosen evidence agent run is outside the active organization."); return { content: { type: targetType, id: run.id, question: run.question, synthesis: run.synthesis, model: run.model, createdAt: run.createdAt }, citations: { scanIds: parseJson(run.scanIdsJson) ?? [] } };
}

export async function createDeliverySnapshot(input: { organizationId: string; approvedByUserId: number; templateId?: string | null; targetType: DeliveryTargetType; targetId: string; outputFormat: "pdf" | "pptx" | "markdown" }) {
  const db = await requireDb(); if (input.templateId) { const [template] = await db.select({ id: clientDeliveryTemplates.id }).from(clientDeliveryTemplates).where(and(eq(clientDeliveryTemplates.id, input.templateId), eq(clientDeliveryTemplates.organizationId, input.organizationId))).limit(1); if (!template) throw new Error("The selected delivery template is outside the active organization."); }
  const captured = await captureDeliveryTarget(input.organizationId, input.targetType, input.targetId); const contentJson = JSON.stringify(captured.content); const citationsJson = JSON.stringify(captured.citations); const id = nanoid(); const contentDigest = createHash("sha256").update(`${contentJson}:${citationsJson}:${input.outputFormat}`).digest("hex");
  await db.insert(clientDeliverySnapshots).values({ id, organizationId: input.organizationId, templateId: input.templateId ?? null, targetType: input.targetType, targetId: input.targetId, outputFormat: input.outputFormat, contentDigest, contentJson, citationsJson, approvedByUserId: input.approvedByUserId }); return { id, contentDigest };
}
