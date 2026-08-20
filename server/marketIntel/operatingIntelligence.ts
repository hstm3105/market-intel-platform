import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { portfolioMandateTemplates, portfolioMandates, portfolioSignalAlerts, portfolioWatchlists, researchAgentRuns } from "../../drizzle/schema";
import { getDb } from "../db";
import { createKnowledgeAsset } from "./knowledge";

const requireDb = async () => { const db = await getDb(); if (!db) throw new Error("The portfolio intelligence database is currently unavailable."); return db; };
const parseArray = (value: string) => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; } };
export type AlertStatus = "unread" | "reviewed" | "resolved";

export async function getOperatingIntelligence(organizationId: string) {
  const db = await requireDb(); const [templates, alerts] = await Promise.all([
    db.select().from(portfolioMandateTemplates).where(eq(portfolioMandateTemplates.organizationId, organizationId)).orderBy(desc(portfolioMandateTemplates.updatedAt)),
    db.select().from(portfolioSignalAlerts).where(eq(portfolioSignalAlerts.organizationId, organizationId)).orderBy(desc(portfolioSignalAlerts.createdAt)).limit(50),
  ]);
  return { templates: templates.filter(item => item.organizationId === organizationId), alerts: alerts.filter(item => item.organizationId === organizationId).map(alert => ({ ...alert, resourceIds: parseArray(alert.resourceIdsJson) })) };
}

export async function createMandateTemplate(input: { organizationId: string; createdByUserId: number; name: string; description: string; defaultPriority: "low" | "standard" | "high" | "critical"; defaultTargetDays: number }) {
  const db = await requireDb(); const id = nanoid(); await db.insert(portfolioMandateTemplates).values({ id, ...input }); return { id };
}

export async function refreshPortfolioSignals(organizationId: string) {
  const db = await requireDb(); const [mandates, watchlists, existing] = await Promise.all([
    db.select().from(portfolioMandates).where(eq(portfolioMandates.organizationId, organizationId)),
    db.select().from(portfolioWatchlists).where(and(eq(portfolioWatchlists.organizationId, organizationId), eq(portfolioWatchlists.status, "escalated"))),
    db.select().from(portfolioSignalAlerts).where(eq(portfolioSignalAlerts.organizationId, organizationId)),
  ]);
  const alertsToInsert: Array<{ id: string; organizationId: string; mandateId: string | null; alertType: "cross_mandate_risk" | "evidence_conflict" | "watchlist_escalation"; title: string; summary: string; resourceIdsJson: string }> = [];
  const active = mandates.filter(mandate => mandate.organizationId === organizationId && (mandate.status === "active" || mandate.status === "at_risk"));
  for (let left = 0; left < active.length; left += 1) for (let right = left + 1; right < active.length; right += 1) { const overlap = parseArray(active[left].scanIdsJson).filter(id => parseArray(active[right].scanIdsJson).includes(id)); const signature = [active[left].id, active[right].id].sort().join(":"); if (overlap.length && !existing.some(alert => alert.alertType === "cross_mandate_risk" && alert.resourceIdsJson.includes(signature))) alertsToInsert.push({ id: nanoid(), organizationId, mandateId: active[left].id, alertType: "cross_mandate_risk", title: "Shared research exposure across mandates", summary: `${active[left].name} and ${active[right].name} reuse ${overlap.length} research scan${overlap.length === 1 ? "" : "s"}. Review whether their decision assumptions or emerging risks should be coordinated.`, resourceIdsJson: JSON.stringify([signature, ...overlap]) }); }
  for (const watch of watchlists.filter(item => item.organizationId === organizationId)) { if (!existing.some(alert => alert.alertType === "watchlist_escalation" && alert.resourceIdsJson.includes(watch.id) && alert.status !== "resolved")) alertsToInsert.push({ id: nanoid(), organizationId, mandateId: watch.mandateId, alertType: "watchlist_escalation", title: `Escalated watchlist: ${watch.label}`, summary: watch.rationale, resourceIdsJson: JSON.stringify([watch.id]) }); }
  if (alertsToInsert.length) await db.insert(portfolioSignalAlerts).values(alertsToInsert); return { created: alertsToInsert.length };
}

export async function updatePortfolioAlertStatus(organizationId: string, alertId: string, status: AlertStatus) {
  const db = await requireDb(); const [alert] = await db.select({ id: portfolioSignalAlerts.id }).from(portfolioSignalAlerts).where(and(eq(portfolioSignalAlerts.id, alertId), eq(portfolioSignalAlerts.organizationId, organizationId))).limit(1); if (!alert) throw new Error("The portfolio signal alert is outside the active organization."); await db.update(portfolioSignalAlerts).set({ status }).where(and(eq(portfolioSignalAlerts.id, alertId), eq(portfolioSignalAlerts.organizationId, organizationId))); return { id: alertId, status };
}

export async function reuseEvidenceRunAsKnowledge(organizationId: string, userId: number, agentRunId: string) {
  const db = await requireDb(); const [run] = await db.select().from(researchAgentRuns).where(and(eq(researchAgentRuns.id, agentRunId), eq(researchAgentRuns.organizationId, organizationId))).limit(1); if (!run) throw new Error("The selected evidence agent run is outside the active organization."); const scanIds = parseArray(run.scanIdsJson); const asset = await createKnowledgeAsset(userId, organizationId, { kind: "brief", status: "draft", title: `Evidence synthesis · ${run.question.slice(0, 96)}`, content: run.synthesis, tags: ["evidence agent", "reusable synthesis"], scanIds, sourceRefs: [] }); return { id: asset.id, agentRunId };
}
