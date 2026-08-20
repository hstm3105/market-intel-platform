import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { renderBriefMarkdown, renderCompetitorMarkdown, renderRiskAnswerMarkdown } from "./markdown";
import { channelForQuestionMode, selectConversationHistory } from "./chat";
import { INDUSTRY_CATALOG, getIndustry } from "./catalog";
import { addChatTurn, addNote, dashboard, getScan, listTrackedIndustries, listWorkspace, saveScanPackage, setTrackedIndustry } from "./db";
import { answerResearchQuestion, collectPublicSources, generateMarketScan, type ResearchSource, type ScanAnalysis } from "./research";

const idInput = z.object({ scanId: z.string().min(1).max(40) });

const parseStoredScan = (sourceJson: string, analysisJson: string) => ({
  sources: JSON.parse(sourceJson) as ResearchSource[],
  analysis: JSON.parse(analysisJson) as ScanAnalysis,
});

export const marketIntelRouter = router({
  catalog: protectedProcedure.query(() => INDUSTRY_CATALOG),
  dashboard: protectedProcedure.query(({ ctx }) => dashboard(ctx.user.id)),
  tracked: protectedProcedure.query(({ ctx }) => listTrackedIndustries(ctx.user.id)),
  setTracked: protectedProcedure.input(z.object({ slug: z.string().min(1).max(96), tracked: z.boolean() })).mutation(async ({ ctx, input }) => {
    const industry = getIndustry(input.slug);
    if (!industry) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an industry from the available catalog." });
    await setTrackedIndustry(ctx.user.id, { slug: industry.slug, name: industry.name, tracked: input.tracked });
    return { success: true };
  }),
  workspace: protectedProcedure.query(({ ctx }) => listWorkspace(ctx.user.id)),
  scan: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const result = await getScan(ctx.user.id, input.scanId);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This private research scan could not be found." });
    return result;
  }),
  createScan: protectedProcedure.input(z.object({
    industrySlug: z.string().min(1).max(96),
    scope: z.string().min(20, "Add a research focus of at least 20 characters.").max(1_500),
    projectName: z.string().max(160).optional(),
  })).mutation(async ({ ctx, input }) => {
    const industry = getIndustry(input.industrySlug);
    if (!industry) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an industry from the available catalog." });
    const sources = await collectPublicSources(industry.name);
    const analysis = await generateMarketScan({ industry: industry.name, scope: input.scope, sources });
    const scan = await saveScanPackage(ctx.user.id, { industrySlug: industry.slug, industryName: industry.name, projectName: input.projectName, scope: input.scope, sources, analysis });
    await setTrackedIndustry(ctx.user.id, { slug: industry.slug, name: industry.name, tracked: true });
    return { scanId: scan.id };
  }),
  addNote: protectedProcedure.input(z.object({ scanId: z.string().min(1).max(40), title: z.string().min(2).max(220), content: z.string().min(1).max(20_000) })).mutation(({ ctx, input }) => addNote(ctx.user.id, input)),
  ask: protectedProcedure.input(z.object({ scanId: z.string().min(1).max(40), question: z.string().min(2).max(4_000), mode: z.enum(["general", "risk"]).optional().default("general") })).mutation(async ({ ctx, input }) => {
    const result = await getScan(ctx.user.id, input.scanId);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This private research scan could not be found." });
    const { sources, analysis } = parseStoredScan(result.scan.sourceJson, result.scan.analysisJson);
    const context = JSON.stringify({ industry: result.scan.industryName, scope: result.scan.scope, analysis, sources });
    const channel = channelForQuestionMode(input.mode);
    const history = selectConversationHistory(result.messages, channel);
    const answer = await answerResearchQuestion({ question: input.question, scanContext: context, history, focus: input.mode === "risk" ? "emerging_risks" : "market" });
    await addChatTurn(ctx.user.id, input.scanId, input.question, answer, channel);
    return { answer };
  }),
  exportBrief: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const result = await getScan(ctx.user.id, input.scanId);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This private research scan could not be found." });
    const { sources, analysis } = parseStoredScan(result.scan.sourceJson, result.scan.analysisJson);
    return { filename: `${result.scan.industrySlug}-industry-perspective.md`, content: renderBriefMarkdown(result.scan, analysis, sources) };
  }),
  exportCompetitor: protectedProcedure.input(z.object({ scanId: z.string().min(1).max(40), competitorName: z.string().min(1).max(220) })).query(async ({ ctx, input }) => {
    const result = await getScan(ctx.user.id, input.scanId);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This private research scan could not be found." });
    const { sources, analysis } = parseStoredScan(result.scan.sourceJson, result.scan.analysisJson);
    return { filename: `${input.competitorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-competitor-profile.md`, content: renderCompetitorMarkdown(input.competitorName, analysis, sources) };
  }),
  exportRiskAnswer: protectedProcedure.input(z.object({ scanId: z.string().min(1).max(40), messageId: z.string().min(1).max(40) })).query(async ({ ctx, input }) => {
    const result = await getScan(ctx.user.id, input.scanId);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This private research scan could not be found." });
    const answer = result.messages.find(message => message.id === input.messageId && message.channel === "risk" && message.role === "assistant");
    if (!answer) throw new TRPCError({ code: "NOT_FOUND", message: "This private Risk Q&A answer could not be found." });
    const { sources } = parseStoredScan(result.scan.sourceJson, result.scan.analysisJson);
    return { filename: `${result.scan.industrySlug}-risk-qa-brief.md`, content: renderRiskAnswerMarkdown(result.scan, answer.content, sources) };
  }),
  compareRisks: protectedProcedure.input(z.object({
    scanIds: z.array(z.string().min(1).max(40)).min(2).max(6).refine(ids => new Set(ids).size === ids.length, "Choose distinct scans to compare."),
    question: z.string().min(12).max(1_500),
  })).mutation(async ({ ctx, input }) => {
    const results = await Promise.all(input.scanIds.map(scanId => getScan(ctx.user.id, scanId)));
    if (results.some(result => !result)) throw new TRPCError({ code: "NOT_FOUND", message: "One or more selected private scans could not be found." });
    const comparisonPacket = results.map(result => {
      const record = result!;
      const { sources, analysis } = parseStoredScan(record.scan.sourceJson, record.scan.analysisJson);
      const emergingRisks = analysis.emergingRisks?.length ? analysis.emergingRisks.slice(0, 3) : analysis.risks.slice(0, 3).map((risk, index) => ({ rank: index + 1, title: risk.title, summary: risk.detail, severity: `${risk.likelihood} likelihood / ${risk.impact} impact`, watchSignal: "Monitor the supporting market evidence.", sourceIds: risk.sourceIds }));
      return {
        scanId: record.scan.id,
        industry: record.scan.industryName,
        scope: record.scan.scope,
        emergingRisks,
        sources: sources.map(source => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url })),
      };
    });
    const answer = await answerResearchQuestion({ question: input.question, scanContext: JSON.stringify({ comparisonPacket }), history: [], focus: "risk_comparison" });
    return { answer, comparedScans: comparisonPacket.map(scan => ({ scanId: scan.scanId, industry: scan.industry })) };
  }),
});
