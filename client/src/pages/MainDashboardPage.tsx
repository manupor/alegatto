import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageSquare, FileText, Scale, AlertTriangle, TrendingUp,
  FolderOpen, Gavel, ArrowRight, Clock
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function SkeletonCard() {
  return <div className="h-28 rounded-2xl bg-secondary/40 animate-pulse" />;
}

export default function MainDashboardPage() {
  const { user } = useAuth();

  const { data: documents = [], isLoading: docsLoading } = useQuery<any[]>({
    queryKey: ["/api/editor/documents"],
  });

  const { data: cases = [], isLoading: casesLoading } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const { data: appeals = [], isLoading: appealsLoading } = useQuery<any[]>({
    queryKey: ["/api/appeals"],
  });

  const { data: deadlines = [], isLoading: deadlinesLoading } = useQuery<any[]>({
    queryKey: ["/api/deadlines"],
  });

  const isLoading = docsLoading || casesLoading || appealsLoading || deadlinesLoading;

  const activeCases = (cases as any[]).filter((c: any) => c.status === "active").length;
  const docsThisMonth = (documents as any[]).filter((d: any) => {
    const created = new Date(d.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const pendingDeadlines = (deadlines as any[]).filter((d: any) => d.status === "pending");
  const urgentDeadlines = pendingDeadlines.filter((d: any) => {
    const days = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
    return days < 7;
  });

  const legalAreaCount: Record<string, number> = {};
  for (const c of cases as any[]) {
    legalAreaCount[c.legalArea] = (legalAreaCount[c.legalArea] || 0) + 1;
  }
  const topArea = Object.entries(legalAreaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const metrics = [
    {
      label: "Expedientes activos",
      value: isLoading ? "…" : activeCases,
      icon: FolderOpen,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
    },
    {
      label: "Documentos este mes",
      value: isLoading ? "…" : docsThisMonth,
      icon: FileText,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
    },
    {
      label: "Recursos generados",
      value: isLoading ? "…" : (appeals as any[]).length,
      icon: Gavel,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/20",
    },
    {
      label: "Alertas urgentes",
      value: isLoading ? "…" : urgentDeadlines.length,
      icon: AlertTriangle,
      color: urgentDeadlines.length > 0 ? "text-red-400" : "text-muted-foreground",
      bg: urgentDeadlines.length > 0 ? "bg-red-400/10" : "bg-secondary/40",
      border: urgentDeadlines.length > 0 ? "border-red-400/20" : "border-border",
    },
  ];

  const quickActions = [
    { label: "Consultar normativa", desc: "Asistente legal IA", href: "/dashboard/chat", icon: MessageSquare, color: "text-primary" },
    { label: "Analizar documento", desc: "PDF o DOCX con IA", href: "/dashboard/analysis", icon: Scale, color: "text-blue-400" },
    { label: "Nuevo recurso", desc: "Generador paso a paso", href: "/dashboard/appeals/new", icon: Gavel, color: "text-purple-400" },
    { label: "Nuevo expediente", desc: "Gestión de casos", href: "/dashboard/cases", icon: FolderOpen, color: "text-emerald-400" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-auto bg-background">
        <header className="flex-none px-8 py-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-foreground">
            Buenos días, {user?.name?.split(" ")[0] || "Abogado"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </header>

        <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Metric cards */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoading
                ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
                : metrics.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`rounded-2xl border bg-card p-5 shadow-sm ${m.border}`}
                    data-testid={`card-metric-${i}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{m.label}</p>
                        <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.bg} border ${m.border}`}>
                        <m.icon className={`w-5 h-5 ${m.color}`} />
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </section>

          {/* Area más consultada */}
          {!isLoading && (cases as any[]).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Área legal más consultada:</span>
              <span className="text-sm font-semibold text-foreground capitalize">{topArea}</span>
            </div>
          )}

          {/* Quick actions */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Acciones rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((a, i) => (
                <Link key={i} href={a.href}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-all cursor-pointer group"
                    data-testid={`card-action-${i}`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors`}>
                      <a.icon className={`w-5 h-5 ${a.color}`} />
                    </div>
                    <p className="font-medium text-foreground text-sm">{a.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>

          {/* Upcoming deadlines */}
          {pendingDeadlines.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Próximos vencimientos</h2>
                <Link href="/dashboard/alerts" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Ver todos <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {pendingDeadlines.slice(0, 5).map((d: any, i: number) => {
                  const days = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
                  const color = days < 7 ? "text-red-400" : days < 15 ? "text-yellow-400" : "text-emerald-400";
                  return (
                    <div key={d.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < pendingDeadlines.slice(0, 5).length - 1 ? "border-b border-border" : ""}`}>
                      <Clock className={`w-4 h-4 shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{d.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${color}`}>{days < 0 ? "Vencido" : days === 0 ? "Hoy" : `${days}d`}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(d.dueDate), "d MMM", { locale: es })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recent cases */}
          {(cases as any[]).length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Expedientes recientes</h2>
                <Link href="/dashboard/cases" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Ver todos <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {(cases as any[]).slice(0, 4).map((c: any, i: number) => (
                  <Link key={c.id} href={`/dashboard/cases/${c.id}`}>
                    <div className={`flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/20 transition-colors cursor-pointer ${i < Math.min((cases as any[]).length, 4) - 1 ? "border-b border-border" : ""}`}>
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.client}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${
                        c.status === "active" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        c.status === "appeal" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        "bg-secondary/50 text-muted-foreground border-border"
                      }`}>
                        {c.status === "active" ? "Activo" : c.status === "appeal" ? "En recurso" : "Cerrado"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
