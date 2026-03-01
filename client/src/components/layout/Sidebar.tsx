import { Link, useLocation } from "wouter";
import {
  MessageSquare, FileText, LogOut, Scale,
  Gavel, FolderOpen, Bell, BarChart3, FileSearch,
  Home, Users
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useOrgContext } from "@/hooks/use-org";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { org, role, isAdmin } = useOrgContext();

  const navGroups = [
    {
      label: "Principal",
      items: [
        { label: "Inicio", path: "/dashboard", icon: Home, exact: true },
        { label: "Asistente IA", path: "/dashboard/chat", icon: MessageSquare },
      ],
    },
    {
      label: "IA Legal",
      items: [
        { label: "Análisis de Docs", path: "/dashboard/analysis", icon: FileSearch },
        { label: "Generar Recurso", path: "/dashboard/appeals/new", icon: Gavel },
      ],
    },
    {
      label: "Gestión",
      items: [
        { label: "Documentos", path: "/dashboard/documentos", icon: FileText },
        { label: "Expedientes", path: "/dashboard/cases", icon: FolderOpen },
        { label: "Alertas", path: "/dashboard/alerts", icon: Bell },
        ...(isAdmin ? [{ label: "Analíticas", path: "/dashboard/analytics", icon: BarChart3 }] : []),
        ...(isAdmin ? [{ label: "Equipo", path: "/dashboard/team", icon: Users }] : []),
      ],
    },
  ];

  const isActive = (path: string, exact = false) => {
    if (exact) return location === path;
    if (path === "/dashboard/cases") return location === "/dashboard/cases" || location.startsWith("/dashboard/cases/");
    return location === path || location.startsWith(path + "/");
  };

  const roleLabelMap: Record<string, string> = {
    admin: "Administrador",
    senior: "Senior",
    assistant: "Asociado",
    intern: "Pasante",
  };

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col hidden md:flex sticky top-0 shrink-0">
      {/* Logo + org */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-foreground">LexAI</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Costa Rica</p>
          </div>
        </div>
        {org && (
          <div className="px-2 py-1.5 rounded-lg bg-secondary/40 border border-border">
            <p className="text-xs font-medium text-foreground truncate">{org.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground capitalize">{roleLabelMap[role ?? ""] || role}</span>
              <span className="text-border text-xs">·</span>
              <span className="text-[10px] text-primary capitalize">{org.plan}</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.path, (item as any).exact);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group
                      ${active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        <div className="px-3 py-2.5 rounded-lg bg-secondary/30 border border-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.name || "Usuario"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
