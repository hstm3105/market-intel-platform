import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Building2, Check, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const roles = ["admin", "research_lead", "analyst", "viewer"] as const;
const labels: Record<(typeof roles)[number] | "owner", string> = { owner: "Owner", admin: "Admin", research_lead: "Research lead", analyst: "Analyst", viewer: "Viewer" };
const descriptions: Record<(typeof roles)[number] | "owner", string> = { owner: "Full organization control and billing-ready authority", admin: "Manage members, workspaces, and research", research_lead: "Create research and lead project work", analyst: "Create research and contribute notes", viewer: "Read-only access to organization research" };

export default function OrganizationSettings() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.marketIntel.organization.summary.useQuery();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof roles)[number]>("analyst");
  const addMember = trpc.marketIntel.organization.addMember.useMutation({ onSuccess: () => { toast.success("Member access updated."); setEmail(""); utils.marketIntel.organization.summary.invalidate(); }, onError: error => toast.error(error.message) });
  const updateRole = trpc.marketIntel.organization.updateMemberRole.useMutation({ onSuccess: () => { toast.success("Member role updated."); utils.marketIntel.organization.summary.invalidate(); }, onError: error => toast.error(error.message) });
  const switchOrganization = trpc.marketIntel.organization.switch.useMutation({ onSuccess: () => { toast.success("Active workspace switched."); utils.invalidate(); }, onError: error => toast.error(error.message) });

  if (isLoading || !data) return <div className="space-y-6"><Skeleton className="h-48 rounded-[1.75rem]" /><Skeleton className="h-72 rounded-[1.75rem]" /></div>;
  const canManage = data.active.role === "owner" || data.active.role === "admin";

  return <div className="space-y-7">
    <section className="paper-card relative overflow-hidden rounded-[1.75rem] border p-7 md:p-10">
      <div className="absolute -right-10 -top-12 size-56 rounded-full bg-[#e6cc83]/20 blur-3xl" />
      <div className="relative max-w-3xl"><div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f733e]"><Building2 className="size-3.5" /> Enterprise workspace</div><h1 className="display-serif text-4xl leading-[0.95] md:text-5xl">Your organization’s research boundary.</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">Manage who can access this organization, what they can do, and which workspace is active. Existing research stays private to its creator inside the organization.</p></div>
      <div className="relative mt-8 flex flex-wrap gap-3"><Badge className="rounded-full bg-[#173a33] px-3 py-1.5 text-[#f7f3e9] hover:bg-[#173a33]"><ShieldCheck className="mr-1.5 size-3.5" />{labels[data.active.role]}</Badge><Badge variant="outline" className="rounded-full px-3 py-1.5">{data.members.length} members</Badge></div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <article className="paper-card rounded-[1.5rem] border p-6"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e9f0eb] text-primary"><Building2 className="size-5" /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9f733e]">Active organization</p><h2 className="mt-1 text-xl font-semibold">{data.active.name}</h2><p className="mt-2 text-sm text-muted-foreground">{descriptions[data.active.role]}</p></div></div><div className="mt-6 border-t pt-5"><Label className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Switch workspace</Label><Select value={data.active.id} onValueChange={organizationId => switchOrganization.mutate({ organizationId })}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{data.organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name} · {labels[org.role]}</SelectItem>)}</SelectContent></Select></div></article>
      <article className="paper-card rounded-[1.5rem] border p-6"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#fff5d8] text-[#9f733e]"><UserPlus className="size-5" /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9f733e]">Member directory</p><h2 className="mt-1 text-xl font-semibold">Add a signed-in colleague</h2></div></div>{canManage ? <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]" onSubmit={event => { event.preventDefault(); addMember.mutate({ email, role }); }}><Input aria-label="Colleague email" type="email" placeholder="colleague@firm.com" value={email} onChange={event => setEmail(event.target.value)} required className="h-11 rounded-xl" /><Select value={role} onValueChange={value => setRole(value as (typeof roles)[number])}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{roles.map(item => <SelectItem value={item} key={item}>{labels[item]}</SelectItem>)}</SelectContent></Select><Button type="submit" disabled={addMember.isPending} className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">{addMember.isPending ? "Saving…" : "Add member"}</Button></form> : <p className="mt-5 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Your current role is read-only for membership management.</p>}<p className="mt-3 text-xs leading-5 text-muted-foreground">Colleagues can be added once they have signed in to the platform with this email address.</p></article>
    </section>

    <section className="paper-card overflow-hidden rounded-[1.5rem] border"><div className="flex items-center justify-between border-b px-6 py-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9f733e]">Access directory</p><h2 className="mt-1 text-xl font-semibold">Organization members</h2></div><Users className="size-5 text-muted-foreground" /></div><div className="divide-y">{data.members.map(member => <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between" key={member.id}><div className="min-w-0"><p className="font-medium">{member.name || member.email || "Unnamed member"}{member.userId === data.active.ownerUserId && <span className="ml-2 text-xs text-muted-foreground">Organization owner</span>}</p><p className="mt-1 truncate text-sm text-muted-foreground">{member.email || "No email available"}</p></div><div className="flex items-center gap-3">{canManage && member.role !== "owner" ? <Select value={member.role} onValueChange={value => updateRole.mutate({ userId: member.userId, role: value as (typeof roles)[number] })}><SelectTrigger className="h-9 w-[160px] rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{roles.map(item => <SelectItem value={item} key={item}>{labels[item]}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline" className="rounded-full">{labels[member.role]}</Badge>}<span className="hidden size-7 items-center justify-center rounded-full bg-[#e9f0eb] text-primary sm:flex">{member.role === "owner" && <Check className="size-4" />}</span></div></div>)}</div></section>
  </div>;
}
