import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BellRing, BookOpenText, FolderOpen, Search, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const dateLabel = (value: Date | string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const dashboard = trpc.marketIntel.dashboard.useQuery();
  const monitoring = trpc.marketIntel.monitoring.alerts.useQuery();
  const data = dashboard.data;

  return <div className="space-y-7">
    <section className="enter-up overflow-hidden rounded-[1.5rem] border border-[#d9d1be] bg-[#f1eee4] px-6 py-7 md:px-9 md:py-9">
      <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
        <div className="max-w-2xl"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.19em] text-[#99703c]">Intelligence overview</p><h1 className="display-serif text-4xl leading-[0.94] text-[#1c342d] md:text-5xl">Bring clarity to the markets your clients care about.</h1><p className="mt-5 max-w-xl text-sm leading-6 text-[#52635b]">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}. Start with a source-grounded scan, then shape the findings into a persuasive strategic perspective.</p></div>
        <Button onClick={() => setLocation("/new")} className="rounded-xl bg-[#173a33] px-5 py-6 text-[#f7f3e9] hover:bg-[#234b42]"><Search className="mr-2 size-4" />Launch research</Button>
      </div>
      <div className="fine-rule mt-8" />
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-xs text-[#637169]"><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#a87940]" />Public-source research</span><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#a87940]" />Private by account</span><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#a87940]" />Executive-ready outputs</span></div>
    </section>

    <section className="grid gap-4 md:grid-cols-4">
      <MetricCard label="Tracked industries" value={data?.industries.length} icon={BookOpenText} helper="Your saved market watchlist" loading={dashboard.isLoading} onClick={() => setLocation("/industries")} />
      <MetricCard label="Recent scans" value={data?.scans.length} icon={Search} helper="The most recent research runs" loading={dashboard.isLoading} onClick={() => setLocation("/workspace")} />
      <MetricCard label="Saved briefs" value={data?.briefs.length} icon={FolderOpen} helper="Executive perspectives on file" loading={dashboard.isLoading} onClick={() => setLocation("/workspace")} />
      <MetricCard label="Unread alerts" value={monitoring.data?.unreadCount} icon={BellRing} helper="Material changes awaiting review" loading={monitoring.isLoading} onClick={() => setLocation("/monitoring")} />
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="paper-card enter-up enter-delay-1 rounded-[1.25rem] border bg-card p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#947044]">Recent research</p><h2 className="display-serif mt-1 text-2xl">Active perspectives</h2></div><button onClick={() => setLocation("/workspace")} className="text-xs font-semibold text-primary hover:underline">View workspace</button></div>
        {dashboard.isLoading ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> : data?.scans.length ? <div className="divide-y divide-border">{data.scans.map(scan => <button key={scan.id} onClick={() => setLocation(`/workspace/${scan.id}`)} className="group flex w-full items-center justify-between gap-5 py-4 text-left first:pt-1"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[#d9caa8] bg-[#fcf9f1] text-[10px] font-medium text-[#76572f]">{scan.industryName}</Badge>{scan.projectName ? <span className="text-[11px] text-muted-foreground">{scan.projectName}</span> : null}</div><p className="truncate text-sm font-semibold text-foreground">{scan.executiveSummary}</p><p className="mt-1 text-xs text-muted-foreground">Created {dateLabel(scan.createdAt)}</p></div><ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></button>)}</div> : <EmptyPanel icon={Search} title="No scans yet" body="Your research workspace will populate after the first market scan." action="Start a scan" onClick={() => setLocation("/new")} />}</div>
      <div className="paper-card enter-up enter-delay-2 rounded-[1.25rem] border bg-[#173a33] p-6 text-[#f4f0e7]"><div className="flex size-9 items-center justify-center rounded-xl bg-[#e6cc83] text-[#173a33]"><Sparkles className="size-4" /></div><p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#d5bd7d]">Research workflow</p><h2 className="display-serif mt-2 text-3xl leading-none">A disciplined path from scan to point of view.</h2><ol className="mt-6 space-y-4 border-l border-white/15 pl-4 text-sm text-[#cbd8cf]"><li><strong className="text-[#f5f1e8]">01</strong><span className="ml-3">Select the market and define the client question.</span></li><li><strong className="text-[#f5f1e8]">02</strong><span className="ml-3">Review players, signals, risks, and opportunities.</span></li><li><strong className="text-[#f5f1e8]">03</strong><span className="ml-3">Use the brief as the spine of your deliverable.</span></li></ol><Button variant="outline" onClick={() => setLocation("/new")} className="mt-7 w-full border-white/20 bg-transparent text-[#f5f1e8] hover:bg-white/10 hover:text-white">Build an industry perspective</Button></div>
    </section>
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="paper-card rounded-[1.25rem] border bg-card p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#947044]">Tracked industries</p><h2 className="display-serif mt-1 text-2xl">Your market watchlist</h2></div><button onClick={() => setLocation("/industries")} className="text-xs font-semibold text-primary hover:underline">Manage</button></div>{dashboard.isLoading ? <Skeleton className="mt-5 h-24" /> : data?.industries.length ? <div className="mt-5 flex flex-wrap gap-2">{data.industries.map(industry => <button key={industry.id} onClick={() => setLocation("/new")} className="rounded-xl border border-[#d9caa9] bg-[#fcfaf4] px-3 py-2 text-left transition-colors hover:bg-[#f2ecdd]"><span className="block text-xs font-semibold">{industry.industryName}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Tracked market</span></button>)}</div> : <p className="mt-5 text-xs leading-5 text-muted-foreground">Add an industry to build your recurring market watchlist.</p>}</div>
      <div className="paper-card rounded-[1.25rem] border bg-card p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#947044]">Saved perspectives</p><h2 className="display-serif mt-1 text-2xl">Executive brief library</h2></div><button onClick={() => setLocation("/workspace")} className="text-xs font-semibold text-primary hover:underline">Open workspace</button></div>{dashboard.isLoading ? <Skeleton className="mt-5 h-24" /> : data?.briefs.length ? <div className="mt-3 divide-y">{data.briefs.slice(0, 3).map(brief => <button key={brief.id} onClick={() => setLocation(`/workspace/${brief.scanId}`)} className="flex w-full items-center justify-between gap-3 py-3 text-left"><span className="line-clamp-1 text-xs font-semibold">{brief.title}</span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground" /></button>)}</div> : <p className="mt-5 text-xs leading-5 text-muted-foreground">Save a scan to begin building a reusable library of industry perspectives.</p>}</div>
    </section>
  </div>;
}

function MetricCard({ label, value, icon: Icon, helper, loading, onClick }: { label: string; value?: number; icon: typeof Search; helper: string; loading: boolean; onClick: () => void }) { return <button onClick={onClick} className="paper-card enter-up rounded-[1.15rem] border bg-card p-5 text-left transition-transform hover:-translate-y-0.5"><div className="flex items-start justify-between"><span className="flex size-9 items-center justify-center rounded-xl bg-[#eef1ea] text-primary"><Icon className="size-4" /></span><ArrowRight className="size-4 text-[#b1aaa0]" /></div>{loading ? <Skeleton className="mt-6 h-8 w-12" /> : <p className="display-serif mt-5 text-4xl leading-none">{value ?? 0}</p>}<p className="mt-2 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></button>; }

function EmptyPanel({ icon: Icon, title, body, action, onClick }: { icon: typeof Search; title: string; body: string; action: string; onClick: () => void }) { return <div className="rounded-xl border border-dashed border-[#d8cfbc] bg-[#fbfaf5] p-8 text-center"><Icon className="mx-auto size-5 text-[#9d7c52]" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{body}</p><button onClick={onClick} className="mt-4 text-xs font-semibold text-primary hover:underline">{action}</button></div>; }
