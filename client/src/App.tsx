import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import DocumentsPage from "@/pages/DocumentsPage";
import EditorPage from "@/pages/EditorPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/auth" />} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes - Protection handled within DashboardLayout */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/dashboard/documentos" component={DocumentsPage} />
      <Route path="/dashboard/editor/:id" component={EditorPage} />

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
