import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Link2, ShieldCheck, TimerReset, UsersRound } from "lucide-react";
import * as React from "react";
import { useLocation, useRoute } from "wouter";
import ScanDetailLegacy from "./ScanDetailLegacy";
import type { SourceIntelligenceSummary } from "../../../shared/sourceIntelligence";

const tierTone = { authoritative: "border-[#bdd3c0] bg-[#eff7ef] text-[#426a4c]", established: "border-[#bed2dd] bg-[#eef7fa] text-[#3f6879]", specialist: "border-[#e3c993] bg-[#fff8e8] text-[#876323]", unverified: "border-border bg-muted text-muted-foreground" };

export default function ScanDetail() {
  const [, params] = useRoute("/workspace/:scanId"); const scanId = params?.scanId ?? ""; const [, setLocation] = useLocation(); const query = trpc.marketIntel.scan.useQuery({ scanId }, { enabled: Boolean(scanId) }); const evidence = query.data?.sourceIntelligence;
  return <div className="space-y-5">{query.isLoading ? <Skeleton className="h-40 rounded-[1.3rem]" /> : evidence ? <SourceGovernancePanel evidence={evidence} onReview={() => setLocation("/source-intelligence")} /> : null}<ScanDetailLegacy /></div>;
}

export function SourceGovernancePanel({ evidence, onReview }: { evidence: SourceIntelligenceSummary; onReview: () => void }) { return <section className="mx-auto max-w-7xl overflow-hidden rounded-[1.3rem] border border-[#cad9ca] bg-[#f0f7ef] p-5 md:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-[#dceede] text-[#3d7350]"><ShieldCheck className="size-4" /></span><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#4b705a]">Source intelligence</p></div><h2 className="display-serif mt-2 text-2xl text-[#274c35]">Evidence confidence <span className="text-[#3d7350]">{evidence.score}/100</span></h2><p className="mt-2 max-w-3xl text-xs leading-5 text-[#557062]">{evidence.governanceNote}</p></div><Button variant="outline" onClick={onReview} className="rounded-xl border-[#b7cdb9] bg-white text-[#426a4c] hover:bg-[#f7fcf7]"><ArrowRight className="mr-2 size-4" />Review sources</Button></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric icon={ShieldCheck} label="Authority" value={`${evidence.tierCounts.authoritative + evidence.tierCounts.established}/${evidence.totalSources}`} helper="authoritative or established" /><Metric icon={TimerReset} label="Recency" value={`${evidence.currentSources}/${evidence.totalSources}`} helper="current sources" /><Metric icon={UsersRound} label="Diversity" value={`${evidence.uniquePublishers}`} helper="distinct publishers" /><Metric icon={Link2} label="Traceability" value={`${evidence.traceableSources}/${evidence.totalSources}`} helper="directly linked" /></div><div className="mt-4 flex flex-wrap gap-2">{Object.entries(evidence.tierCounts).map(([tier, count]) => <Badge key={tier} variant="outline" className={tierTone[tier as keyof typeof tierTone]}>{count} {tier}</Badge>)}</div></section>; }

function Metric({ icon: Icon, label, value, helper }: { icon: typeof ShieldCheck; label: string; value: string; helper: string }) { return <div className="rounded-xl border border-[#cfe0cf] bg-white/75 p-3"><div className="flex items-center gap-1.5 text-[#4b705a]"><Icon className="size-3.5" /><span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</span></div><p className="display-serif mt-2 text-2xl text-[#274c35]">{value}</p><p className="mt-0.5 text-[10px] text-[#607a68]">{helper}</p></div>; }
