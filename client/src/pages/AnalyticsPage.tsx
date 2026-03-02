import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RequireRole } from "@/components/RequireRole";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, FileText, Gavel } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { format, subWeeks, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#14B8A6"];

export default function AnalyticsPage() {
  const { data: cases = [] } = useQuery<any[]>({ queryKey: ["/api/cases"] });
  const { data: documents = [] } = useQuery<any[]>({ queryKey: ["/api/editor/documents"] });
  const { data: appeals = [] } = useQuery<any[]>({ queryKey: ["/api/appeals"] });

  // Legal area distribution (cases)
  const areaCount: Record<string, number> = {};
  for (const c of cases as any[]) {
    areaCount[c.legalArea] = (areaCount[c.legalArea] || 0) + 1;
  }
  const areaData = Object.entries(areaCount).map(([name, value]) => ({ name, value }));

  // Document type distribution
  const docTypes: Record<string, number> = {};
  for (const d of documents as any[]) {
    const t = d.tipo || "otro";
    docTypes[t] = (docTypes[t] || 0) + 1;
  }
  const docTypeData = Object.entries(docTypes).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  // Docs created per week (last 12 weeks)
  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 11 - i));
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const count = (documents as any[]).filter(d => {
      const created = new Date(d.createdAt);
      return created >= weekStart && created < weekEnd;
    }).length;
    return {
      week: format(weekStart, "d MMM", { locale: es }),
      documentos: count,
    };
  });

  // Appeals per process type
  const appealTypes: Record<string, number> = {};
  for (const a of appeals as any[]) {
    appealTypes[a.processType] = (appealTypes[a.processType] || 0) + 1;
  }
  const appealData = Object.entries(appealTypes).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value
  }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-sm">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  const CHART_STYLE = { fontSize: 12, fill: "#94a3b8" };

  return (
    <DashboardLayout>
      <RequireRole role="admin">
      <div className="flex flex-col h-full bg-background overflow-auto">
        <header className="flex-none px-4 py-4 md:px-8 md:py-5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" /> Analíticas
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block">Métricas y estadísticas del despacho</p>
        </header>

        <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Summary metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total expedientes", value: (cases as any[]).length, icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
              { label: "Documentos totales", value: (documents as any[]).length, icon: FileText, color: "text-emerald-400", bg: "bg-emerald-400/10" },
              { label: "Recursos generados", value: (appeals as any[]).length, icon: Gavel, color: "text-purple-400", bg: "bg-purple-400/10" },
            ].map((m, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5" data-testid={`analytics-metric-${i}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                    <m.icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly documents line chart */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Documentos creados por semana (últimas 12 semanas)
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={CHART_STYLE} />
                <YAxis allowDecimals={false} tick={CHART_STYLE} />
                <Tooltip content={customTooltip} />
                <Line type="monotone" dataKey="documentos" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", r: 4 }} name="Documentos" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Legal areas bar chart */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-5">Expedientes por área legal</h2>
              {areaData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos disponibles</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={areaData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={CHART_STYLE} />
                    <YAxis allowDecimals={false} tick={CHART_STYLE} />
                    <Tooltip content={customTooltip} />
                    <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} name="Expedientes" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Document types pie */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-5">Distribución por tipo de documento</h2>
              {docTypeData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos disponibles</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={docTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {docTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={customTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Appeals by type */}
          {appealData.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-5">Recursos por tipo de proceso</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={appealData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={CHART_STYLE} />
                  <YAxis allowDecimals={false} tick={CHART_STYLE} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Recursos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      </RequireRole>
    </DashboardLayout>
  );
}
