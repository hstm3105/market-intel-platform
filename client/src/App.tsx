import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import IndustryPreferences from "./pages/IndustryPreferences";
import KnowledgeManagement from "./pages/KnowledgeManagement";
import Monitoring from "./pages/Monitoring";
import NewResearch from "./pages/NewResearch";
import NotFound from "./pages/NotFound";
import ScanDetail from "./pages/ScanDetail";
import SourceIntelligence from "./pages/SourceIntelligence";
import RiskComparison from "./pages/RiskComparison";
import OrganizationSettings from "./pages/OrganizationSettings";
import PortfolioIntelligence from "./pages/PortfolioIntelligence";
import Workspace from "./pages/Workspace";

function Router() { return <DashboardLayout><Switch><Route path="/" component={Home} /><Route path="/new" component={NewResearch} /><Route path="/industries" component={IndustryPreferences} /><Route path="/monitoring" component={Monitoring} /><Route path="/source-intelligence" component={SourceIntelligence} /><Route path="/knowledge" component={KnowledgeManagement} /><Route path="/portfolio" component={PortfolioIntelligence} /><Route path="/workspace" component={Workspace} /><Route path="/workspace/:scanId" component={ScanDetail} /><Route path="/risk-comparison" component={RiskComparison} /><Route path="/organization" component={OrganizationSettings} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></DashboardLayout>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
