import type { SourceIntelligenceSummary } from "./sourceIntelligence";

export type PortfolioRisk = { title: string; severity?: string; impact?: string; sourceIds?: string[] };
export type PortfolioScan = { id: string; industryName: string; createdAt: Date | string; sourceIntelligence: SourceIntelligenceSummary; risks: PortfolioRisk[]; emergingRisks: PortfolioRisk[] };

const isHigh = (risk: PortfolioRisk) => /high/i.test(`${risk.severity ?? ""} ${risk.impact ?? ""}`);
const keyFor = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function summarizePortfolio(scans: PortfolioScan[]) {
  const riskSignals = new Map<string, { title: string; count: number; highCount: number; industries: Set<string> }>();
  const industries = new Map<string, { scanCount: number; latestScanAt: Date | string; sourceConfidence: number; highRisks: number }>();
  scans.forEach(scan => {
    const industry = industries.get(scan.industryName) ?? { scanCount: 0, latestScanAt: scan.createdAt, sourceConfidence: 0, highRisks: 0 };
    industry.scanCount += 1;
    industry.sourceConfidence += scan.sourceIntelligence.score;
    if (new Date(scan.createdAt).getTime() > new Date(industry.latestScanAt).getTime()) industry.latestScanAt = scan.createdAt;
    const risks = [...scan.emergingRisks, ...scan.risks];
    risks.forEach(risk => {
      if (isHigh(risk)) industry.highRisks += 1;
      const key = keyFor(risk.title);
      if (!key) return;
      const signal = riskSignals.get(key) ?? { title: risk.title, count: 0, highCount: 0, industries: new Set<string>() };
      signal.count += 1;
      if (isHigh(risk)) signal.highCount += 1;
      signal.industries.add(scan.industryName);
      riskSignals.set(key, signal);
    });
    industries.set(scan.industryName, industry);
  });
  const industryBreakdown = Array.from(industries.entries()).map(([industry, item]) => ({ industry, scanCount: item.scanCount, latestScanAt: item.latestScanAt, averageSourceConfidence: Math.round(item.sourceConfidence / item.scanCount), highRiskCount: item.highRisks })).sort((a, b) => b.highRiskCount - a.highRiskCount || b.averageSourceConfidence - a.averageSourceConfidence);
  const themes = Array.from(riskSignals.values()).map(item => ({ title: item.title, scanCount: item.count, highRiskCount: item.highCount, industries: Array.from(item.industries).sort() })).sort((a, b) => b.industries.length - a.industries.length || b.highRiskCount - a.highRiskCount || b.scanCount - a.scanCount).slice(0, 8);
  const averageSourceConfidence = scans.length ? Math.round(scans.reduce((sum, scan) => sum + scan.sourceIntelligence.score, 0) / scans.length) : 0;
  return { scanCount: scans.length, industryCount: industries.size, averageSourceConfidence, highRiskCount: scans.reduce((sum, scan) => sum + [...scan.emergingRisks, ...scan.risks].filter(isHigh).length, 0), industryBreakdown, sharedRiskThemes: themes };
}
