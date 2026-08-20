import type { MarketScan } from "../../drizzle/schema";
import type { ResearchSource, ScanAnalysis } from "./research";

const bullets = (items: string[]) => items.map(item => `- ${item}`).join("\n");
const citations = (ids: string[]) => ids.map(id => `[${id}]`).join(" ");

export function renderBriefMarkdown(scan: MarketScan, analysis: ScanAnalysis, sources: ResearchSource[]) {
  return `# ${scan.industryName} — Industry Perspective\n\n*Prepared ${scan.createdAt.toLocaleDateString()}${scan.projectName ? ` for ${scan.projectName}` : ""}*\n\n## Executive takeaway\n\n**${analysis.executiveBrief.headline}**\n\n${analysis.executiveBrief.narrative}\n\n## Market scan\n\n${analysis.executiveSummary}\n\n### Key trends\n\n${analysis.trends.map(item => `- **${item.title}:** ${item.detail} _Strategic implication:_ ${item.strategicImplication}. ${citations(item.sourceIds)}`).join("\n")}\n\n### Strategic risks\n\n${analysis.risks.map(item => `- **${item.title}** — ${item.detail} _Likelihood:_ ${item.likelihood}; _impact:_ ${item.impact}. ${citations(item.sourceIds)}`).join("\n")}\n\n### Opportunities\n\n${analysis.opportunities.map(item => `- **${item.title}** — ${item.detail} _Priority:_ ${item.priority}. ${citations(item.sourceIds)}`).join("\n")}\n\n## Market landscape\n\n${analysis.landscape.marketDefinition}\n\n### Segments\n\n${analysis.landscape.segments.map(segment => `- **${segment.name}:** ${segment.description} Examples: ${segment.examples.join(", ")}.`).join("\n")}\n\n### Positioning\n\n**Incumbents:** ${analysis.landscape.incumbentPositioning}\n\n**Challengers:** ${analysis.landscape.challengerPositioning}\n\n## Consultant implications\n\n${bullets(analysis.executiveBrief.imperatives)}\n\n## Questions to resolve with the client\n\n${bullets(analysis.executiveBrief.clientQuestions)}\n\n## Sources\n\n${sources.map(source => `- [${source.id}] [${source.title}](${source.url}) — ${source.publisher}${source.publishedAt ? `, ${source.publishedAt}` : ""}`).join("\n")}\n`;
}

export function renderCompetitorMarkdown(name: string, analysis: ScanAnalysis, sources: ResearchSource[]) {
  const competitor = analysis.competitors.find(item => item.name === name);
  if (!competitor) throw new Error("Competitor profile not found in this scan.");
  return `# ${competitor.name} — Competitor Profile\n\n## Positioning\n\n**Segment:** ${competitor.segment}\n\n${competitor.positioning}\n\n## Business model\n\n${competitor.businessModel}\n\n## Strengths\n\n${bullets(competitor.strengths)}\n\n## Weaknesses / watchouts\n\n${bullets(competitor.weaknesses)}\n\n## Recent moves\n\n${bullets(competitor.recentMoves)}\n\n## Strategic signals\n\n${bullets(competitor.strategicSignals)}\n\n## Scan sources\n\n${sources.map(source => `- [${source.id}] [${source.title}](${source.url}) — ${source.publisher}`).join("\n")}\n`;
}

export function renderRiskAnswerMarkdown(scan: MarketScan, answer: string, sources: ResearchSource[]) {
  return `# ${scan.industryName} — Risk Q&A Brief\n\n*Prepared ${scan.createdAt.toLocaleDateString()}${scan.projectName ? ` for ${scan.projectName}` : ""}*\n\n## Risk question response\n\n${answer}\n\n## Scan sources\n\n${sources.map(source => `- [${source.id}] [${source.title}](${source.url}) — ${source.publisher}${source.publishedAt ? `, ${source.publishedAt}` : ""}`).join("\n")}\n`;
}
