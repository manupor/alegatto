import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import { FileText, Plus, FileSignature, Edit3, Trash2, Search, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DocumentsPage() {
  const [, setLocation] = useLocation();
  const { data: documents = [], isLoading } = useDocuments();
  const { mutate: createDocument, isPending: isCreating } = useCreateDocument();

  const stats = [
    { label: "Total Documentos", value: documents.length, icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Borradores", value: documents.filter((d: any) => d.estado === 'borrador').length, icon: Edit3, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "En Revisión", value: documents.filter((d: any) => d.estado === 'revision').length, icon: Clock, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Firmados", value: documents.filter((d: any) => d.estado === 'firmado').length, icon: FileSignature, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  ];

  const handleCreateNew = () => {
    createDocument(
      { titulo: "Nuevo Documento", contenidoHtml: "<h1>Nuevo Documento</h1><p>Comienza a escribir aquí...</p>", tipo: "otro" },
      { onSuccess: (doc) => setLocation(`/dashboard/editor/${doc.id}`) }
    );
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background overflow-y-auto p-4 md:p-8">
        
        {/* Header & Stats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Documentos</h1>
              <p className="text-muted-foreground mt-1">Gestiona tus contratos y documentos legales.</p>
            </div>
            <button
              onClick={handleCreateNew}
              disabled={isCreating}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" />
              {isCreating ? "Creando..." : "Nuevo Documento"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search & List */}
        <div className="bg-card border border-border rounded-2xl shadow-sm flex-1 flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por título..."
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando documentos...</div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-bold text-foreground">No hay documentos</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Aún no has creado ningún documento legal.</p>
                <button
                  onClick={handleCreateNew}
                  className="text-primary font-medium hover:underline text-sm"
                >
                  Crear mi primer documento
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Última Modificación</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-secondary/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground">{doc.titulo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          doc.estado === 'firmado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          doc.estado === 'revision' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {doc.estado.charAt(0).toUpperCase() + doc.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground capitalize">
                        {doc.tipo}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(doc.updatedAt), "d MMM yyyy, HH:mm", { locale: es })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setLocation(`/dashboard/editor/${doc.id}`)}
                          className="px-3 py-1.5 bg-secondary text-foreground text-sm font-medium rounded-md hover:bg-secondary/80 transition-colors inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 className="w-4 h-4" />
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
