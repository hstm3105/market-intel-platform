import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { chatMessages, competitorProfiles, marketScans, researchArtifacts, researchNotes, researchProjects, trackedIndustries } from "../../drizzle/schema";
import { getDb } from "../db";
import { createChatTurnRecords, type ChatChannel } from "./chat";
import type { ResearchSource, ScanAnalysis } from "./research";

const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("The research database is currently unavailable.");
  return db;
};

export async function listTrackedIndustries(userId: number) {
  const db = await requireDb();
  return db.select().from(trackedIndustries).where(eq(trackedIndustries.userId, userId)).orderBy(desc(trackedIndustries.createdAt));
}

export async function setTrackedIndustry(userId: number, input: { slug: string; name: string; tracked: boolean }) {
  const db = await requireDb();
  if (input.tracked) {
    await db.insert(trackedIndustries).values({ id: nanoid(), userId, industrySlug: input.slug, industryName: input.name }).onDuplicateKeyUpdate({ set: { industryName: input.name } });
  } else {
    await db.delete(trackedIndustries).where(and(eq(trackedIndustries.userId, userId), eq(trackedIndustries.industrySlug, input.slug)));
  }
}

export async function dashboard(userId: number) {
  const db = await requireDb();
  const [industries, scans, briefs] = await Promise.all([
    listTrackedIndustries(userId),
    db.select().from(marketScans).where(eq(marketScans.userId, userId)).orderBy(desc(marketScans.createdAt)).limit(6),
    db.select().from(researchArtifacts).where(and(eq(researchArtifacts.userId, userId), eq(researchArtifacts.type, "brief"))).orderBy(desc(researchArtifacts.createdAt)).limit(6),
  ]);
  return { industries, scans, briefs };
}

export async function listWorkspace(userId: number) {
  const db = await requireDb();
  const [scans, projects] = await Promise.all([
    db.select().from(marketScans).where(eq(marketScans.userId, userId)).orderBy(desc(marketScans.createdAt)),
    db.select().from(researchProjects).where(eq(researchProjects.userId, userId)).orderBy(desc(researchProjects.updatedAt)),
  ]);
  return { scans, projects };
}

export async function saveScanPackage(userId: number, input: { industrySlug: string; industryName: string; projectName?: string; scope: string; sources: ResearchSource[]; analysis: ScanAnalysis }) {
  const db = await requireDb();
  const scanId = nanoid();
  const createdAt = new Date();
  const projectName = input.projectName?.trim() || null;
  let projectId: string | null = null;
  if (projectName) {
    const [existingProject] = await db.select().from(researchProjects).where(and(eq(researchProjects.userId, userId), eq(researchProjects.name, projectName))).limit(1);
    projectId = existingProject?.id ?? nanoid();
    if (!existingProject) {
      await db.insert(researchProjects).values({ id: projectId, userId, name: projectName });
    }
  }
  const scan = {
    id: scanId, userId, industrySlug: input.industrySlug, industryName: input.industryName,
    projectId, projectName, scope: input.scope,
    status: "ready" as const, executiveSummary: input.analysis.executiveSummary,
    sourceJson: JSON.stringify(input.sources), analysisJson: JSON.stringify(input.analysis), createdAt,
  };
  await db.insert(marketScans).values(scan);
  await db.insert(researchArtifacts).values([
    { id: nanoid(), userId, scanId, type: "landscape" as const, title: `${input.industryName} Market Landscape`, content: input.analysis.landscape.marketDefinition, dataJson: JSON.stringify(input.analysis.landscape) },
    { id: nanoid(), userId, scanId, type: "brief" as const, title: input.analysis.executiveBrief.headline, content: input.analysis.executiveBrief.narrative, dataJson: JSON.stringify(input.analysis.executiveBrief) },
  ]);
  if (input.analysis.competitors.length) {
    await db.insert(competitorProfiles).values(input.analysis.competitors.map(profile => ({
      id: nanoid(), userId, scanId, name: profile.name, segment: profile.segment, businessModel: profile.businessModel,
      positioning: profile.positioning, strengthsJson: JSON.stringify(profile.strengths), weaknessesJson: JSON.stringify(profile.weaknesses),
      recentMovesJson: JSON.stringify(profile.recentMoves), strategicSignalsJson: JSON.stringify(profile.strategicSignals),
    })));
  }
  return scan;
}

export async function getScan(userId: number, scanId: string) {
  const db = await requireDb();
  const [scan] = await db.select().from(marketScans).where(and(eq(marketScans.id, scanId), eq(marketScans.userId, userId))).limit(1);
  if (!scan) return null;
  const [profiles, artifacts, notes, messages] = await Promise.all([
    db.select().from(competitorProfiles).where(and(eq(competitorProfiles.scanId, scanId), eq(competitorProfiles.userId, userId))).orderBy(desc(competitorProfiles.createdAt)),
    db.select().from(researchArtifacts).where(and(eq(researchArtifacts.scanId, scanId), eq(researchArtifacts.userId, userId))).orderBy(desc(researchArtifacts.createdAt)),
    db.select().from(researchNotes).where(and(eq(researchNotes.scanId, scanId), eq(researchNotes.userId, userId))).orderBy(desc(researchNotes.createdAt)),
    db.select().from(chatMessages).where(and(eq(chatMessages.scanId, scanId), eq(chatMessages.userId, userId))).orderBy(chatMessages.createdAt),
  ]);
  return { scan, profiles, artifacts, notes, messages };
}

export async function addNote(userId: number, input: { scanId: string; title: string; content: string }) {
  const db = await requireDb();
  const scan = await getScan(userId, input.scanId);
  if (!scan) throw new Error("Scan not found.");
  const note = { id: nanoid(), userId, scanId: input.scanId, title: input.title, content: input.content };
  await db.insert(researchNotes).values(note);
  return note;
}

export async function addChatTurn(userId: number, scanId: string, question: string, answer: string, channel: ChatChannel = "general") {
  const db = await requireDb();
  await db.insert(chatMessages).values(createChatTurnRecords({ userId, scanId, question, answer, channel, createId: nanoid }));
}
