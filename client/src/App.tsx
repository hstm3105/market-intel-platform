import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/HomeCompact";
import IndustryPreferences from "./pages/IndustryPreferences";
import KnowledgeManagement from "./pages/KnowledgeManagement";
import Monitoring from "./pages/Monitoring";
import NewResearch from "./pages/NewResearch";
import NotFound from "./pages/NotFound";
import ScanDetail from "./pages/ScanDetail";
import SourceIntelligence from "./pages/SourceIntelligence";
import RiskComparison from "./pages/RiskComparison";
import OrganizationSettings from "./pages/OrganizationSettings";
import Governance from "./pages/Governance";
import Collaboration from "./pages/Collaboration";
import EvidenceAgents from "./pages/EvidenceAgents";
import PortfolioIntelligence from "./pages/PortfolioIntelligence";
import DeliveryHub from "./pages/DeliveryHubEnhanced";
import MobileCompanion from "./pages/MobileCompanion";
import Workspace from "./pages/Workspace";
import ExecutiveBriefings from "./pages/ExecutiveBriefings";

const COLLABORATION_RELEASE = "portfolio-command-center-v1";

function Router() { return <Switch><Route path="/mobile" component={MobileCompanion} /><Route><DashboardLayout><Switch><Route path="/" component={Home} /><Route path="/new" component={NewResearch} /><Route path="/industries" component={IndustryPreferences} /><Route path="/monitoring" component={Monitoring} /><Route path="/source-intelligence" component={SourceIntelligence} /><Route path="/knowledge" component={KnowledgeManagement} /><Route path="/portfolio" component={PortfolioIntelligence} /><Route path="/executive-briefings" component={ExecutiveBriefings} /><Route path="/delivery" component={DeliveryHub} /><Route path="/workspace" component={Workspace} /><Route path="/workspace/:scanId" component={ScanDetail} /><Route path="/risk-comparison" component={RiskComparison} /><Route path="/organization" component={OrganizationSettings} /><Route path="/governance" component={Governance} /><Route path="/collaboration" component={Collaboration} /><Route path="/agents" component={EvidenceAgents} /><Route path="/evidence-agents" component={EvidenceAgents} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></DashboardLayout></Route></Switch>; }
function App() { return <ErrorBoundary><div data-release={COLLABORATION_RELEASE}><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></div></ErrorBoundary>; }
export default App;
