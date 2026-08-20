import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BellRing, BookOpenCheck, BookOpenText, Building2, FolderOpen, GitCompareArrows, LayoutDashboard, Lock, LogOut, PanelLeft, Plus, Search, ShieldCheck, Sparkles, Waypoints } from "lucide-react";
import { useLocation } from "wouter";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: Search, label: "New research", path: "/new" },
  { icon: FolderOpen, label: "Workspace", path: "/workspace" },
  { icon: GitCompareArrows, label: "Compare risks", path: "/risk-comparison" },
  { icon: BookOpenText, label: "Tracked industries", path: "/industries" },
  { icon: BellRing, label: "Monitoring", path: "/monitoring" },
  { icon: ShieldCheck, label: "Source intelligence", path: "/source-intelligence" },
  { icon: BookOpenCheck, label: "Knowledge", path: "/knowledge" },
  { icon: Waypoints, label: "Portfolio", path: "/portfolio" },
  { icon: Building2, label: "Organization", path: "/organization" },
  { icon: Lock, label: "Governance", path: "/governance" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) {
    return (
      <main className="data-grid min-h-screen flex items-center justify-center p-6">
        <section className="paper-card max-w-md rounded-[1.5rem] border bg-card px-8 py-10 text-center">
          <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Sparkles className="size-5" /></div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f733e]">Private research environment</p>
          <h1 className="display-serif text-4xl leading-none">Your intelligence workspace awaits.</h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">Sign in to save research, organize your market perspectives, and keep every engagement private.</p>
          <Button onClick={startLogin} className="mt-8 w-full bg-primary py-6 text-primary-foreground hover:bg-primary/90">Sign in to continue</Button>
        </section>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#173a33] text-[#f7f3e9]">
        <SidebarHeader className="h-[5.25rem] justify-center border-b border-white/10 px-3">
          <button onClick={() => setLocation("/")} className="flex w-full items-center gap-3 rounded-xl px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dbc37d]">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#e6cc83] text-[#173a33]"><Sparkles className="size-4" /></span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden"><span className="block truncate text-sm font-semibold tracking-tight">Market intelligence</span><span className="mt-0.5 block text-[10px] uppercase tracking-[0.15em] text-[#b8c5bb]">Research system</span></span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-2 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#aabbb0] group-data-[collapsible=icon]:hidden">Workspace</p>
          <SidebarMenu>
            {menuItems.map(item => {
              const isActive = item.path === "/" ? location === "/" : location === item.path || location.startsWith(`${item.path}/`);
              return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} tooltip={item.label} onClick={() => setLocation(item.path)} className="h-11 rounded-xl text-[#dce6de] hover:bg-white/10 hover:text-white data-[active=true]:bg-[#e6cc83] data-[active=true]:text-[#173a33]"><item.icon className="size-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>;
            })}
          </SidebarMenu>
          <div className="mx-2 mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium text-[#edf2ec]">Research with intent</p>
            <p className="mt-2 text-xs leading-5 text-[#afc0b5]">Each scan preserves sources, analysis, and your strategic notes.</p>
            <button onClick={() => setLocation("/new")} className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#e6cc83]"><Plus className="size-3.5" /> Launch a scan</button>
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dbc37d]">
                <Avatar className="size-8 border border-white/15"><AvatarFallback className="bg-[#275349] text-xs text-[#f7f3e9]">{user.name?.charAt(0).toUpperCase() || "C"}</AvatarFallback></Avatar>
                <span className="min-w-0 group-data-[collapsible=icon]:hidden"><span className="block truncate text-xs font-semibold">{user.name || "Consultant"}</span><span className="mt-0.5 block truncate text-[11px] text-[#afc0b5]">Private workspace</span></span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem className="cursor-pointer text-destructive" onClick={logout}><LogOut className="mr-2 size-4" />Sign out</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-screen bg-transparent">
        <header className="flex h-[5.25rem] items-center justify-between border-b border-border/80 bg-background/70 px-4 backdrop-blur-xl md:px-7">
          <div className="flex items-center gap-3"><SidebarTrigger className="md:hidden" /><span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Consultant research desk</span></div>
          <Button onClick={() => setLocation("/new")} size="sm" className="rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90"><Plus className="mr-1.5 size-3.5" />New scan</Button>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-7 lg:p-9">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
