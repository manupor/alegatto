import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/AuthPage";
import MainDashboardPage from "@/pages/MainDashboardPage";
import ChatPage from "@/pages/ChatPage";
import DocumentsPage from "@/pages/DocumentsPage";
import EditorPage from "@/pages/EditorPage";
import AnalysisPage from "@/pages/AnalysisPage";
import AppealNewPage from "@/pages/AppealNewPage";
import CasesPage from "@/pages/CasesPage";
import CaseDetailPage from "@/pages/CaseDetailPage";
import AlertsPage from "@/pages/AlertsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={MainDashboardPage} />
      <Route path="/dashboard/chat" component={ChatPage} />
      <Route path="/dashboard/analysis" component={AnalysisPage} />
      <Route path="/dashboard/appeals/new" component={AppealNewPage} />
      <Route path="/dashboard/documentos" component={DocumentsPage} />
      <Route path="/dashboard/editor/:id" component={EditorPage} />
      <Route path="/dashboard/cases" component={CasesPage} />
      <Route path="/dashboard/cases/:id" component={CaseDetailPage} />
      <Route path="/dashboard/alerts" component={AlertsPage} />
      <Route path="/dashboard/analytics" component={AnalyticsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SonnerToaster theme="dark" position="top-center" richColors />
        <ShadcnToaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
