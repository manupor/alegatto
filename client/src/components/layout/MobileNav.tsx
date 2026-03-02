import { Link, useLocation } from "wouter";
import { Home, MessageSquare, Gavel, Bell, FolderOpen, Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrgContext } from "@/hooks/use-org";
import {
  FileText, FileSearch, BarChart3, Users, Scale, LogOut, X
} from "lucide-react";

const MOBILE_TAB_ITEMS = [
  { label: "Inicio", path: "/dashboard", icon: Home, exact: true },
  { label: "Chat IA", path: "/dashboard/chat", icon: MessageSquare },
  { label: "Recurso", path: "/dashboard/appeals/new", icon: Gavel },
  { label: "Alertas", path: "/dashboard/alerts", icon: Bell },
  { label: "Más", path: "__menu__", icon: Menu },
];

const ALL_NAV_ITEMS = [
  { label: "Inicio", path: "/dashboard", icon: Home },
  { label: "Asistente IA", path: "/dashboard/chat", icon: MessageSquare },
  { label: "Análisis de Docs", path: "/dashboard/analysis", icon: FileSearch },
  { label: "Generar Recurso", path: "/dashboard/appeals/new", icon: Gavel },
  { label: "Documentos", path: "/dashboard/documentos", icon: FileText },
  { label: "Expedientes", path: "/dashboard/cases", icon: FolderOpen },
  { label: "Alertas", path: "/dashboard/alerts", icon: Bell },
  { label: "Analíticas", path: "/dashboard/analytics", icon: BarChart3, adminOnly: true },
  { label: "Equipo", path: "/dashboard/team", icon: Users, adminOnly: true },
];

export function MobileNav() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { org, role, isAdmin } = useOrgContext();
  const [menuOpen, setMenuOpen] = useState(false);

  const roleLabelMap: Record<string, string> = {
    admin: "Administrador", senior: "Senior", assistant: "Asociado", intern: "Pasante",
  };

  const isActive = (path: string, exact = false) => {
    if (path === "__menu__") return false;
    if (exact) return location === path;
    return location === path || location.startsWith(path + "/");
  };

  const visibleNav = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border z-40 flex md:hidden backdrop-blur-md safe-area-bottom">
        {MOBILE_TAB_ITEMS.map(item => {
          const active = isActive(item.path, (item as any).exact);
          const isMenu = item.path === "__menu__";
          return isMenu ? (
            <button
              key="menu"
              onClick={() => setMenuOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground"
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">Más</span>
            </button>
          ) : (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Full-screen slide-up drawer menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-card rounded-t-2xl shadow-2xl border-t border-border max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* User info */}
            <div className="px-5 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <button onClick={() => setMenuOpen(false)} className="text-muted-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {org && (
                <div className="mt-2 flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">{org.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{org.plan}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{roleLabelMap[role ?? ""] || role}</span>
                </div>
              )}
            </div>

            {/* Nav items */}
            <div className="px-3 py-3 space-y-0.5">
              {visibleNav.map(item => {
                const active = location === item.path || location.startsWith(item.path + "/");
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                    data-testid={`mobile-menu-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${active ? "text-primary" : ""}`} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <div className="px-3 pb-6 pt-1 border-t border-border mt-1">
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                data-testid="button-mobile-logout"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
