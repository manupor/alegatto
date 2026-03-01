import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useOrgContext } from "@/hooks/use-org";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { org, isLoading: orgLoading } = useOrgContext();

  const isLoading = authLoading || orgLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // If user has no org, redirect to firm registration
  if (!org) {
    return <Redirect to="/register-firm" />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
