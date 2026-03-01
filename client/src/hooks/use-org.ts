import { useQuery } from "@tanstack/react-query";

export interface OrgContext {
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  } | null;
  role: "admin" | "senior" | "assistant" | "intern" | null;
  isAdmin: boolean;
  isSenior: boolean;
  canEdit: boolean;
  canViewAnalytics: boolean;
  canManageTeam: boolean;
}

export function useOrgContext(): OrgContext & { isLoading: boolean } {
  const { data, isLoading } = useQuery<OrgContext>({
    queryKey: ["/api/org/context"],
    queryFn: () => fetch("/api/org/context", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    retry: false,
    staleTime: 30000,
  });

  return {
    org: data?.org ?? null,
    role: data?.role ?? null,
    isAdmin: data?.role === "admin",
    isSenior: data?.role === "senior" || data?.role === "admin",
    canEdit: data?.role === "admin" || data?.role === "senior" || data?.role === "assistant",
    canViewAnalytics: data?.role === "admin",
    canManageTeam: data?.role === "admin",
    isLoading,
  };
}
