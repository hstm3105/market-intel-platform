import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { executiveBriefingDeliveries, executiveBriefings } from "../../drizzle/schema";
import { getDb } from "../db";
import type { ExecutiveBriefingContent } from "./executiveDistribution";

export type GoogleWorkspaceDestination = "gmail" | "google_docs" | "google_sheets";
type Citation = { id: string; label: string; url?: string };
type BriefingRecord = typeof executiveBriefings.$inferSelect;

const requireDb = async () => { const db = await getDb(); if (!db) throw new Error("The executive delivery database is currently unavailable."); return db; };
const parseJson = <T>(value: string, fallback: T) => { try { return JSON.parse(value) as T; } catch { return fallback; } };
const htmlEscape = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] ?? char));
const mailHeader = (value: string) => value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
const briefContent = (briefing: BriefingRecord) => parseJson<ExecutiveBriefingContent>(briefing.contentJson, { headline: briefing.title, briefingSummary: "", priorityMoves: [], watchSignals: [], uncertainty: "" });
const citationsFor = (briefing: BriefingRecord) => parseJson<Citation[]>(briefing.citationsJson, []);

export function googleWorkspaceDeliveryConfigured() { return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN && process.env.GOOGLE_WORKSPACE_SENDER_EMAIL); }

async function googleAccessToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID; const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET; const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Google Workspace delivery is not authorized for this deployment.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }) });
  if (!response.ok) throw new Error("Google Workspace authorization could not be refreshed.");
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google Workspace authorization returned no access token.");
  return payload.access_token;
}

async function googleFetch(url: string, options: RequestInit) {
  const token = await googleAccessToken();
  const headers = new Headers(options.headers); headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(`Google Workspace delivery request failed with status ${response.status}.`);
  return response;
}

function briefingText(briefing: BriefingRecord) {
  const content = briefContent(briefing); const citations = citationsFor(briefing);
  const lines = [content.headline, "", content.briefingSummary, "", "Priority moves", ...content.priorityMoves.flatMap(move => [`• ${move.title}`, `  ${move.rationale}`, `  Evidence: ${move.evidenceRefs.join(", ")}`]), "", "Watch signals", ...content.watchSignals.flatMap(signal => [`• ${signal.title}`, `  ${signal.rationale}`, `  Evidence: ${signal.evidenceRefs.join(", ")}`]), "", `Uncertainty boundary: ${content.uncertainty}`, "", "Evidence appendix", ...citations.map(citation => `• ${citation.id} · ${citation.label}${citation.url ? ` · ${citation.url}` : ""}`)];
  return lines.join("\n");
}

function briefingHtml(briefing: BriefingRecord) {
  const content = briefContent(briefing); const citations = citationsFor(briefing);
  const section = (title: string, items: Array<{ title: string; rationale: string; evidenceRefs: string[] }>) => `<h2>${htmlEscape(title)}</h2><ul>${items.map(item => `<li><strong>${htmlEscape(item.title)}</strong><br/>${htmlEscape(item.rationale)}<br/><em>Evidence: ${htmlEscape(item.evidenceRefs.join(", "))}</em></li>`).join("") || "<li>No evidence-backed items generated.</li>"}</ul>`;
  return `<h1>${htmlEscape(content.headline)}</h1><p>${htmlEscape(content.briefingSummary)}</p>${section("Priority moves", content.priorityMoves)}${section("Watch signals", content.watchSignals)}<h2>Uncertainty boundary</h2><p>${htmlEscape(content.uncertainty)}</p><h2>Evidence appendix</h2><ol>${citations.map(citation => `<li>${citation.url ? `<a href="${htmlEscape(citation.url)}">${htmlEscape(`${citation.id} · ${citation.label}`)}</a>` : htmlEscape(`${citation.id} · ${citation.label}`)}</li>`).join("")}</ol>`;
}

function sheetValues(briefing: BriefingRecord) {
  const content = briefContent(briefing); const citations = citationsFor(briefing); const values: string[][] = [["Executive briefing", content.headline], ["Summary", content.briefingSummary], [], ["Priority moves", "Rationale", "Evidence"], ...content.priorityMoves.map(item => [item.title, item.rationale, item.evidenceRefs.join(", ")]), [], ["Watch signals", "Rationale", "Evidence"], ...content.watchSignals.map(item => [item.title, item.rationale, item.evidenceRefs.join(", ")]), [], ["Uncertainty boundary", content.uncertainty], [], ["Evidence appendix", "Source", "URL"], ...citations.map(item => [item.id, item.label, item.url ?? ""])];
  return values;
}

async function createGoogleDocument(briefing: BriefingRecord) {
  const createResponse = await googleFetch("https://docs.googleapis.com/v1/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `${briefing.title} · Executive Briefing` }) });
  const created = await createResponse.json() as { documentId?: string };
  if (!created.documentId) throw new Error("Google Docs did not return a document identifier.");
  await googleFetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(created.documentId)}:batchUpdate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: briefingText(briefing) } }] }) });
  return { externalFileId: created.documentId, externalUrl: `https://docs.google.com/document/d/${created.documentId}/edit` };
}

async function createGoogleSheet(briefing: BriefingRecord) {
  const response = await googleFetch("https://sheets.googleapis.com/v4/spreadsheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ properties: { title: `${briefing.title} · Executive Briefing` }, sheets: [{ properties: { title: "Executive briefing" } }] }) }); const payload = await response.json() as { spreadsheetId?: string; spreadsheetUrl?: string }; if (!payload.spreadsheetId) throw new Error("Google Sheets did not return a spreadsheet identifier.");
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(payload.spreadsheetId)}/values/${encodeURIComponent("Executive briefing!A1")}?valueInputOption=RAW`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: sheetValues(briefing) }) });
  return { externalFileId: payload.spreadsheetId, externalUrl: payload.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${payload.spreadsheetId}/edit` };
}

async function sendGmail(briefing: BriefingRecord, recipients: string[]) {
  const sender = process.env.GOOGLE_WORKSPACE_SENDER_EMAIL; if (!sender) throw new Error("Google Workspace sender email is not configured.");
  const subject = mailHeader(`[Executive briefing] ${briefing.title}`); const raw = Buffer.from([`From: ${mailHeader(sender)}`, `To: ${recipients.map(mailHeader).join(", ")}`, `Subject: ${subject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "", briefingText(briefing)].join("\r\n"), "utf8").toString("base64url"); await googleFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }) }); return { externalFileId: null, externalUrl: null };
}

export async function listExecutiveBriefingDeliveries(organizationId: string) { const db = await requireDb(); const rows = await db.select().from(executiveBriefingDeliveries).where(eq(executiveBriefingDeliveries.organizationId, organizationId)).orderBy(desc(executiveBriefingDeliveries.createdAt)).limit(100); return rows.filter(row => row.organizationId === organizationId).map(row => ({ ...row, recipients: parseJson<string[]>(row.recipientJson, []) })); }

export async function deliverExecutiveBriefingToGoogleWorkspace(input: { organizationId: string; requestedByUserId: number; briefingId: string; destination: GoogleWorkspaceDestination; recipients?: string[] }) {
  if (!googleWorkspaceDeliveryConfigured()) throw new Error("Google Workspace delivery is not authorized for this deployment.");
  if (input.destination === "gmail" && (!input.recipients?.length || input.recipients.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))) throw new Error("Provide one or more valid recipient email addresses for Gmail delivery.");
  const db = await requireDb(); const [briefing] = await db.select().from(executiveBriefings).where(and(eq(executiveBriefings.id, input.briefingId), eq(executiveBriefings.organizationId, input.organizationId))).limit(1); if (!briefing) throw new Error("The selected executive briefing is outside the active organization."); if (briefing.reviewStatus !== "approved" && briefing.reviewStatus !== "distributed") throw new Error("Approve the executive briefing before external delivery.");
  const contentDigest = createHash("sha256").update(`${briefing.evidenceDigest}:${input.destination}:${JSON.stringify(input.recipients ?? [])}`).digest("hex"); const id = nanoid();
  try { const result = input.destination === "google_docs" ? await createGoogleDocument(briefing) : input.destination === "google_sheets" ? await createGoogleSheet(briefing) : await sendGmail(briefing, input.recipients ?? []); const status = input.destination === "gmail" ? "sent" as const : "created" as const; await db.insert(executiveBriefingDeliveries).values({ id, organizationId: input.organizationId, briefingId: briefing.id, requestedByUserId: input.requestedByUserId, destination: input.destination, status, recipientJson: JSON.stringify(input.recipients ?? []), externalFileId: result.externalFileId, externalUrl: result.externalUrl, contentDigest, errorCode: null }); return { id, destination: input.destination, status, externalUrl: result.externalUrl }; }
  catch (error) { await db.insert(executiveBriefingDeliveries).values({ id, organizationId: input.organizationId, briefingId: briefing.id, requestedByUserId: input.requestedByUserId, destination: input.destination, status: "failed", recipientJson: JSON.stringify(input.recipients ?? []), externalFileId: null, externalUrl: null, contentDigest, errorCode: "google_workspace_delivery_failed" }); throw error; }
}
