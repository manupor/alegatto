import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, Plus, Search, Filter, Download, Edit3, Archive,
  ChevronDown, X, Loader2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const LEGAL_AREAS = ["Civil", "Laboral", "Penal", "Administrativo", "Constitucional", "Comercial"];
const STATUSES = [
  { value: "active", label: "Activo", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "appeal", label: "En recurso", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { value: "closed", label: "Cerrado", color: "bg-secondary/50 text-muted-foreground border-border" },
  { value: "archived", label: "Archivado", color: "bg-secondary/30 text-muted-foreground border-border" },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(x => x.value === status) || STATUSES[2];
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${s.color}`}>{s.label}</span>
  );
}

function CreateCaseModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", client: "", legalArea: "Civil", caseNumber: "" });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => fetch("/api/cases", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast.success("Expediente creado");
      onClose();
    },
    onError: () => toast.error("Error al crear expediente"),
  });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl z-50 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Nuevo Expediente</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutate(form); }} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Nombre del caso *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required placeholder="Ej. García vs. Municipalidad de San José"
              data-testid="input-case-name"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Cliente *</label>
            <input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))}
              required placeholder="Nombre del cliente"
              data-testid="input-case-client"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Área legal</label>
              <select value={form.legalArea} onChange={e => setForm(p => ({ ...p, legalArea: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                {LEGAL_AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">N° Expediente</label>
              <input value={form.caseNumber} onChange={e => setForm(p => ({ ...p, caseNumber: e.target.value }))}
                placeholder="XX-XXXXXX"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Crear expediente"}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

export default function CasesPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: cases = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/cases"] });

  const filtered = (cases as any[]).filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.client.toLowerCase().includes(search.toLowerCase());
    const matchArea = !areaFilter || c.legalArea === areaFilter;
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchArea && matchStatus;
  });

  const exportCsv = () => {
    const rows = [["Nombre", "Cliente", "Área", "Estado", "N° Expediente", "Creado"]];
    for (const c of filtered as any[]) {
      rows.push([c.name, c.client, c.legalArea, c.status, c.caseNumber || "", format(new Date(c.createdAt), "dd/MM/yyyy")]);
    }
    const csv = rows.map(r => r.map(x => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "expedientes.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background overflow-auto">
        <header className="flex-none px-4 py-4 md:px-8 md:py-5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
              <span className="truncate">Expedientes</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block">Gestión de casos y expedientes legales</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportCsv} data-testid="button-export-csv"
              className="flex items-center gap-1.5 px-2.5 py-2 md:px-3 rounded-lg border border-border text-sm text-foreground hover:bg-secondary/50 transition-colors">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={() => setShowCreateModal(true)} data-testid="button-create-case"
              className="flex items-center gap-1.5 px-3 py-2 md:px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo expediente</span><span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap mb-6">
            <div className="relative flex-1 min-w-48 max-w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar expedientes..."
                data-testid="input-search-cases"
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
              className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todas las áreas</option>
              {LEGAL_AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todos los estados</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {(search || areaFilter || statusFilter) && (
              <button onClick={() => { setSearch(""); setAreaFilter(""); setStatusFilter(""); }}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                Cargando expedientes…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <FolderOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium text-foreground">No hay expedientes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || areaFilter || statusFilter ? "Sin resultados para los filtros aplicados" : "Crea tu primer expediente"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      {["Nombre", "Cliente", "Área", "Estado", "Última actividad", "Acciones"].map(h => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((c: any) => (
                      <tr key={c.id} className="hover:bg-secondary/10 transition-colors group" data-testid={`row-case-${c.id}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-medium text-foreground text-sm">{c.name}</span>
                          </div>
                          {c.caseNumber && <span className="text-xs text-muted-foreground ml-6">{c.caseNumber}</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-foreground">{c.client}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-secondary/50 border border-border text-foreground font-medium">{c.legalArea}</span>
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {format(new Date(c.updatedAt), "d MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/cases/${c.id}`}>
                              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs hover:bg-secondary/80 transition-colors">
                                <Edit3 className="w-3.5 h-3.5" /> Ver
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && <CreateCaseModal onClose={() => setShowCreateModal(false)} />}
      </AnimatePresence>
    </DashboardLayout>
  );
}
