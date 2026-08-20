import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import IndustryPreferences from "./pages/IndustryPreferences";
import NewResearch from "./pages/NewResearch";
import NotFound from "./pages/NotFound";
import ScanDetail from "./pages/ScanDetail";
import Workspace from "./pages/Workspace";

function Router() { return <DashboardLayout><Switch><Route path="/" component={Home} /><Route path="/new" component={NewResearch} /><Route path="/industries" component={IndustryPreferences} /><Route path="/workspace" component={Workspace} /><Route path="/workspace/:scanId" component={ScanDetail} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></DashboardLayout>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
