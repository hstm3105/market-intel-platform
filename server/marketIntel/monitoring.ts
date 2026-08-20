import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { monitoringAlerts, monitoringPreferences, monitoredIndustries, marketScans } from "../../drizzle/schema";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { getDb } from "../db";
import { saveScanPackage } from "./db";
import { collectPublicSources, generateMarketScan, type ResearchSource, type ScanAnalysis } from "./research";

export type MonitoringCadence = "weekly" | "monthly";
export type RiskThreshold = "all" | "high";
export type AlertSeverity = "high" | "medium" | "low";
export type AlertCategory = "risk" | "trend" | "opportunity" | "competitor";

type ChangeAlert = {
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  summary: string;
  evidenceSourceIds: string[];
};

const changeAlertSchema = {
  type: "object",
  properties: {
    alerts: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["risk", "trend", "opportunity", "competitor"] },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          summary: { type: "string" },
          evidenceSourceIds: { type: "array", items: { type: "string" } },
        },
        required: ["category", "severity", "title", "summary", "evidenceSourceIds"],
        additionalProperties: false,
      },
    },
  },
  required: ["alerts"],
  additionalProperties: false,
} as const;

const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("The monitoring database is currently unavailable.");
  return db;
};

export function monitoringSchedule(cadence: MonitoringCadence) {
  return cadence === "monthly"
    ? { cron: "0 0 9 1 * *", label: "Monthly · 09:00 UTC on the first" }
    : { cron: "0 0 9 * * 1", label: "Weekly · Monday 09:00 UTC" };
}

export function filterMonitoringAlerts(alerts: ChangeAlert[], riskThreshold: RiskThreshold, minimumSeverity: RiskThreshold) {
  return alerts
    .filter(alert => riskThreshold === "all" || alert.severity === "high")
    .filter(alert => minimumSeverity === "all" || alert.severity === "high");
}

export function buildMonitoringAlertRecords(input: { userId: number; organizationId: string; monitoredIndustryId: string; scanId: string; alerts: ChangeAlert[] }) {
  return input.alerts.map(alert => ({
    id: nanoid(),
    userId: input.userId,
    organizationId: input.organizationId,
    monitoredIndustryId: input.monitoredIndustryId,
    scanId: input.scanId,
    category: alert.category,
    severity: alert.severity,
    title: alert.title,
    summary: alert.summary,
    evidenceJson: JSON.stringify({ sourceIds: alert.evidenceSourceIds }),
    status: "unread" as const,
  }));
}

const asDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

async function selectResearchModel() {
  const { data } = await listLLMModels();
  return data.find(model => model.id === "gpt-5-mini")?.id ?? data.find(model => model.id === "gpt-5")?.id ?? data[0]?.id;
}

export async function generateChangeAlerts(input: { previous: ScanAnalysis; current: ScanAnalysis; sources: ResearchSource[] }): Promise<ChangeAlert[]> {
  const model = await selectResearchModel();
  if (!model) throw new Error("No analysis model is currently available for change detection.");
  const sourcePacket = input.sources.map(({ id, title, publisher, publishedAt, url, excerpt }) => ({ id, title, publisher, publishedAt, url, excerpt }));
  const response = await invokeLLM({
    model,
    reasoning: model.startsWith("gpt-5") ? { effort: "low" } : undefined,
    messages: [
      { role: "system", content: "You are a precise market-monitoring analyst. Compare the previous analysis with the newly generated analysis. Emit alerts only for material developments that are newly supported by the fresh source packet: a heightened risk, a material trend shift, a strategically relevant competitor move, or a newly actionable opportunity. Never present a mere rewording as a change. Do not invent facts, and use only source IDs from the fresh packet. If no material change is supportable, return an empty alerts array." },
      { role: "user", content: JSON.stringify({ previousAnalysis: input.previous, currentAnalysis: input.current, freshSources: sourcePacket }) },
    ],
    response_format: { type: "json_schema", json_schema: { name: "market_change_alerts", strict: true, schema: changeAlertSchema } },
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string" || !content) return [];
  const parsed = JSON.parse(content) as { alerts: ChangeAlert[] };
  return parsed.alerts.slice(0, 5);
}

async function getMonitoredIndustry(userId: number, organizationId: string, monitoredIndustryId: string) {
  const db = await requireDb();
  const [monitor] = await db.select().from(monitoredIndustries).where(and(eq(monitoredIndustries.id, monitoredIndustryId), eq(monitoredIndustries.userId, userId), eq(monitoredIndustries.organizationId, organizationId))).limit(1);
  return monitor ?? null;
}

export async function listMonitoredIndustries(userId: number, organizationId: string) {
  const db = await requireDb();
  return db.select().from(monitoredIndustries).where(and(eq(monitoredIndustries.userId, userId), eq(monitoredIndustries.organizationId, organizationId))).orderBy(desc(monitoredIndustries.updatedAt));
}

export async function createMonitoredIndustry(userId: number, organizationId: string, input: { industrySlug: string; industryName: string; scope: string; cadence: MonitoringCadence; riskThreshold: RiskThreshold }, userSession: string) {
  const db = await requireDb();
  const [existing] = await db.select().from(monitoredIndustries).where(and(eq(monitoredIndustries.userId, userId), eq(monitoredIndustries.organizationId, organizationId), eq(monitoredIndustries.industrySlug, input.industrySlug))).limit(1);
  if (existing) throw new Error("This industry is already being monitored for the active organization.");
  if (!userSession) throw new Error("A valid signed-in session is required to create a monitoring schedule.");
  const id = nanoid();
  const schedule = monitoringSchedule(input.cadence);
  const heartbeat = await createHeartbeatJob({ name: `market-monitor-${id}`, cron: schedule.cron, path: "/api/scheduled/market-monitor", method: "POST", description: `Refresh ${input.industryName} market intelligence` }, userSession);
  try {
    const monitor = { id, userId, organizationId, industrySlug: input.industrySlug, industryName: input.industryName, scope: input.scope, cadence: input.cadence, cronExpression: schedule.cron, scheduleCronTaskUid: heartbeat.taskUid, enabled: true, riskThreshold: input.riskThreshold, lastScanId: null, lastRunAt: null, nextRunAt: asDate(heartbeat.nextExecutionAt) };
    await db.insert(monitoredIndustries).values(monitor);
    return monitor;
  } catch (error) {
    await deleteHeartbeatJob(heartbeat.taskUid, userSession).catch(() => undefined);
    throw error;
  }
}

export async function updateMonitoredIndustry(userId: number, organizationId: string, monitoredIndustryId: string, patch: { scope?: string; cadence?: MonitoringCadence; riskThreshold?: RiskThreshold; enabled?: boolean }, userSession: string) {
  const db = await requireDb();
  const monitor = await getMonitoredIndustry(userId, organizationId, monitoredIndustryId);
  if (!monitor) throw new Error("The monitored industry could not be found.");
  if (!userSession) throw new Error("A valid signed-in session is required to update a monitoring schedule.");
  const cadence = patch.cadence ?? monitor.cadence;
  const schedule = monitoringSchedule(cadence);
  let nextRunAt = monitor.nextRunAt;
  if (monitor.scheduleCronTaskUid) {
    const response = await updateHeartbeatJob(monitor.scheduleCronTaskUid, { cron: patch.cadence ? schedule.cron : undefined, enable: patch.enabled }, userSession);
    nextRunAt = asDate(response.nextExecutionAt) ?? nextRunAt;
  }
  const values = { scope: patch.scope ?? monitor.scope, cadence, cronExpression: schedule.cron, riskThreshold: patch.riskThreshold ?? monitor.riskThreshold, enabled: patch.enabled ?? monitor.enabled, nextRunAt };
  await db.update(monitoredIndustries).set(values).where(and(eq(monitoredIndustries.id, monitoredIndustryId), eq(monitoredIndustries.userId, userId), eq(monitoredIndustries.organizationId, organizationId)));
  return { ...monitor, ...values };
}

export async function deleteMonitoredIndustry(userId: number, organizationId: string, monitoredIndustryId: string, userSession: string) {
  const db = await requireDb();
  const monitor = await getMonitoredIndustry(userId, organizationId, monitoredIndustryId);
  if (!monitor) return { success: true };
  if (!userSession) throw new Error("A valid signed-in session is required to delete a monitoring schedule.");
  if (monitor.scheduleCronTaskUid) await deleteHeartbeatJob(monitor.scheduleCronTaskUid, userSession);
  await db.delete(monitoringAlerts).where(and(eq(monitoringAlerts.userId, userId), eq(monitoringAlerts.organizationId, organizationId), eq(monitoringAlerts.monitoredIndustryId, monitoredIndustryId)));
  await db.delete(monitoredIndustries).where(and(eq(monitoredIndustries.id, monitoredIndustryId), eq(monitoredIndustries.userId, userId), eq(monitoredIndustries.organizationId, organizationId)));
  return { success: true };
}

export async function listAlerts(userId: number, organizationId: string) {
  const db = await requireDb();
  const alerts = await db.select().from(monitoringAlerts).where(and(eq(monitoringAlerts.userId, userId), eq(monitoringAlerts.organizationId, organizationId))).orderBy(desc(monitoringAlerts.createdAt)).limit(80);
  return alerts.map(alert => ({ ...alert, evidence: JSON.parse(alert.evidenceJson) as { sourceIds: string[] } }));
}

export async function unreadAlertCount(userId: number, organizationId: string) {
  const alerts = await listAlerts(userId, organizationId);
  return alerts.filter(alert => alert.status === "unread").length;
}

export async function markAlertRead(userId: number, organizationId: string, alertId: string) {
  const db = await requireDb();
  await db.update(monitoringAlerts).set({ status: "read" }).where(and(eq(monitoringAlerts.id, alertId), eq(monitoringAlerts.userId, userId), eq(monitoringAlerts.organizationId, organizationId)));
  return { success: true };
}

export async function getMonitoringPreferences(userId: number, organizationId: string) {
  const db = await requireDb();
  const [preferences] = await db.select().from(monitoringPreferences).where(and(eq(monitoringPreferences.userId, userId), eq(monitoringPreferences.organizationId, organizationId))).limit(1);
  return preferences ?? { id: null, userId, organizationId, inAppEnabled: true, dailyDigestEnabled: false, minimumSeverity: "all" as const };
}

export async function updateMonitoringPreferences(userId: number, organizationId: string, input: { inAppEnabled: boolean; dailyDigestEnabled: boolean; minimumSeverity: RiskThreshold }) {
  const db = await requireDb();
  const values = { inAppEnabled: input.inAppEnabled, dailyDigestEnabled: input.dailyDigestEnabled, minimumSeverity: input.minimumSeverity };
  await db.insert(monitoringPreferences).values({ id: nanoid(), userId, organizationId, ...values }).onDuplicateKeyUpdate({ set: values });
  return getMonitoringPreferences(userId, organizationId);
}

type MonitoringRefreshDependencies = {
  db?: any;
  collectSources?: typeof collectPublicSources;
  buildScan?: typeof generateMarketScan;
  saveScan?: typeof saveScanPackage;
  detectChanges?: typeof generateChangeAlerts;
  loadPreferences?: typeof getMonitoringPreferences;
  now?: () => number;
};

export async function runMonitoredScan(taskUid: string, options: { force?: boolean } = {}, dependencies: MonitoringRefreshDependencies = {}) {
  const db = dependencies.db ?? await requireDb();
  const [monitor] = await db.select().from(monitoredIndustries).where(eq(monitoredIndustries.scheduleCronTaskUid, taskUid)).limit(1);
  if (!monitor || !monitor.enabled) return { status: "skipped" as const };
  if (!options.force && monitor.lastRunAt && (dependencies.now?.() ?? Date.now()) - monitor.lastRunAt.getTime() < 120_000) return { status: "duplicate" as const, scanId: monitor.lastScanId };
  const previous = monitor.lastScanId ? (await db.select().from(marketScans).where(and(eq(marketScans.id, monitor.lastScanId), eq(marketScans.userId, monitor.userId), eq(marketScans.organizationId, monitor.organizationId))).limit(1))[0] : null;
  const sources = await (dependencies.collectSources ?? collectPublicSources)(monitor.industryName);
  const analysis = await (dependencies.buildScan ?? generateMarketScan)({ industry: monitor.industryName, scope: monitor.scope, sources });
  const scan = await (dependencies.saveScan ?? saveScanPackage)(monitor.userId, monitor.organizationId, { industrySlug: monitor.industrySlug, industryName: monitor.industryName, scope: monitor.scope, sources, analysis, monitoredIndustryId: monitor.id });
  await db.update(monitoredIndustries).set({ lastScanId: scan.id, lastRunAt: new Date() }).where(eq(monitoredIndustries.id, monitor.id));
  if (!previous) return { status: "baseline_created" as const, scanId: scan.id, alertsCreated: 0 };
  const preferences = await (dependencies.loadPreferences ?? getMonitoringPreferences)(monitor.userId, monitor.organizationId);
  if (!preferences.inAppEnabled) return { status: "completed" as const, scanId: scan.id, alertsCreated: 0 };
  try {
    const priorAnalysis = JSON.parse(previous.analysisJson) as ScanAnalysis;
    const detected = await (dependencies.detectChanges ?? generateChangeAlerts)({ previous: priorAnalysis, current: analysis, sources });
    const accepted = filterMonitoringAlerts(detected, monitor.riskThreshold, preferences.minimumSeverity);
    if (accepted.length) await db.insert(monitoringAlerts).values(buildMonitoringAlertRecords({ userId: monitor.userId, organizationId: monitor.organizationId, monitoredIndustryId: monitor.id, scanId: scan.id, alerts: accepted }));
    return { status: "completed" as const, scanId: scan.id, alertsCreated: accepted.length };
  } catch (error) {
    console.error("[Monitoring] Change detection failed after scan persistence", error);
    return { status: "completed" as const, scanId: scan.id, alertsCreated: 0 };
  }
}
