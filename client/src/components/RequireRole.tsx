import { useEffect } from "react";
import { useLocation } from "wouter";
import { useOrgContext } from "@/hooks/use-org";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ROLE_RANK: Record<string, number> = { admin: 4, senior: 3, assistant: 2, intern: 1 };

interface RequireRoleProps {
  role: "admin" | "senior" | "assistant" | "intern";
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { role: userRole, isLoading } = useOrgContext();
  const [, setLocation] = useLocation();

  const userRank = ROLE_RANK[userRole ?? ""] ?? 0;
  const requiredRank = ROLE_RANK[role] ?? 99;
  const allowed = userRank >= requiredRank;

  useEffect(() => {
    if (!isLoading && !allowed) {
      toast.error("Acceso denegado — no tienes permiso para ver esta sección");
      setLocation("/dashboard");
    }
  }, [isLoading, allowed, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
