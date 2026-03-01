import { Link, useLocation } from "wouter";
import { MessageSquare, FileText, Settings, LogOut, Scale } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { label: "Nueva Consulta", path: "/dashboard", icon: MessageSquare },
    { label: "Documentos", path: "/dashboard/documentos", icon: FileText },
  ];

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col hidden md:flex sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Scale className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight text-foreground">LexAI</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Costa Rica</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        <div className="mb-4 px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Menú Principal
        </div>
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="mb-4 px-3 py-3 rounded-lg bg-secondary/50 border border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name || "Usuario"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
