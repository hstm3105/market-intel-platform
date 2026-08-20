export type IntelligenceSource = { id: string; title: string; publisher: string; publishedAt?: string | null; url: string };
export type SourceTier = "authoritative" | "established" | "specialist" | "unverified";
export type SourceQuality = IntelligenceSource & { tier: SourceTier; authorityScore: number; recency: "current" | "aging" | "undated"; daysOld: number | null; rationale: string };
export type SourceIntelligenceSummary = { score: number; confidence: "high" | "moderate" | "caution"; totalSources: number; uniquePublishers: number; currentSources: number; traceableSources: number; tierCounts: Record<SourceTier, number>; quality: SourceQuality[]; governanceNote: string };

const authoritativeSignals = [".gov", ".int", "sec", "fca", "ftc", "ec.europa", "europa.eu", "world bank", "imf", "oecd", "central bank", "statistics", "regulator", "commission"];
const establishedSignals = ["reuters", "associated press", "financial times", "bloomberg", "wall street journal", "economist", "bbc", "cnbc", "forbes", "techcrunch", "the information"];
const specialistSignals = ["gartner", "mckinsey", "bain", "bcg", "deloitte", "pwc", "kpmg", "cb insights", "pitchbook", "industry", "research", "insights", "ventures"];
const hasSignal = (value: string, signals: string[]) => signals.some(signal => value.includes(signal));
const safeDate = (value?: string | null) => { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };
const domainFor = (url: string) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };

export function scoreSource(source: IntelligenceSource, asOf = new Date()): SourceQuality {
  const domain = domainFor(source.url); const signalText = `${source.publisher} ${domain} ${source.title}`.toLowerCase();
  const tier: SourceTier = hasSignal(signalText, authoritativeSignals) ? "authoritative" : hasSignal(signalText, establishedSignals) ? "established" : hasSignal(signalText, specialistSignals) ? "specialist" : "unverified";
  const authorityScore = { authoritative: 100, established: 78, specialist: 58, unverified: 32 }[tier];
  const date = safeDate(source.publishedAt); const daysOld = date ? Math.max(0, Math.floor((asOf.getTime() - date.getTime()) / 86_400_000)) : null;
  const recency = daysOld === null ? "undated" : daysOld <= 90 ? "current" : "aging";
  const rationale = tier === "authoritative" ? "Recognized public authority or primary institutional source." : tier === "established" ? "Established editorial or financial-news publisher." : tier === "specialist" ? "Recognized industry, advisory, or research publisher." : "Publisher authority could not be deterministically verified from the available metadata.";
  return { ...source, tier, authorityScore, recency, daysOld, rationale };
}

export function analyzeSourceIntelligence(sources: IntelligenceSource[], asOf = new Date()): SourceIntelligenceSummary {
  const quality = sources.map(source => scoreSource(source, asOf));
  const tierCounts: Record<SourceTier, number> = { authoritative: 0, established: 0, specialist: 0, unverified: 0 };
  quality.forEach(source => { tierCounts[source.tier] += 1; });
  const totalSources = quality.length; const uniquePublishers = new Set(quality.map(source => (source.publisher || domainFor(source.url) || "unknown").toLowerCase())).size;
  const currentSources = quality.filter(source => source.recency === "current").length; const traceableSources = quality.filter(source => /^https?:\/\//i.test(source.url)).length;
  const authority = totalSources ? quality.reduce((sum, source) => sum + source.authorityScore, 0) / totalSources : 0;
  const recencyScore = totalSources ? currentSources / totalSources * 100 : 0;
  const diversityScore = totalSources ? Math.min(100, uniquePublishers / Math.min(totalSources, 6) * 100) : 0;
  const traceabilityScore = totalSources ? traceableSources / totalSources * 100 : 0;
  const score = Math.round(authority * 0.45 + recencyScore * 0.2 + diversityScore * 0.2 + traceabilityScore * 0.15);
  const confidence = score >= 75 ? "high" : score >= 55 ? "moderate" : "caution";
  const governanceNote = totalSources === 0 ? "No source packet was preserved with this scan." : `${totalSources} sources across ${uniquePublishers} publishers; ${currentSources} are current and ${traceableSources} retain direct links. Confidence reflects evidence quality and coverage, not the truth of individual claims.`;
  return { score, confidence, totalSources, uniquePublishers, currentSources, traceableSources, tierCounts, quality, governanceNote };
}
