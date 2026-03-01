import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDocument, useUpdateDocument } from "@/hooks/use-documents";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { FirmaModal } from "@/components/firma/FirmaModal";
import { ArrowLeft, Save, Printer, PenTool, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useParams } from "wouter";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: document, isLoading } = useDocument(id || "");
  const { mutate: updateDocument, isPending: isSaving } = useUpdateDocument();
  
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isFirmaModalOpen, setIsFirmaModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Sync initial data
  useEffect(() => {
    if (document && !content && !title) {
      setContent(document.contenidoHtml);
      setTitle(document.titulo);
    }
  }, [document]);

  // Autosave
  useEffect(() => {
    if (!document || !content || (content === document.contenidoHtml && title === document.titulo)) return;

    const timer = setTimeout(() => {
      setSaveStatus("saving");
      updateDocument(
        { id: document.id, contenidoHtml: content, titulo: title },
        { 
          onSuccess: () => {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          },
          onError: () => setSaveStatus("idle")
        }
      );
    }, 2000); // 2s debounce

    return () => clearTimeout(timer);
  }, [content, title, document?.id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!document) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Documento no encontrado.
        </div>
      </DashboardLayout>
    );
  }

  const isReadOnly = document.estado === "firmado";

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background print:bg-white">
        
        {/* Editor Header */}
        <header className="flex-none px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden z-10">
          <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
            <Link href="/dashboard/documentos" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <div className="flex-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReadOnly}
                className="text-xl font-display font-bold text-foreground bg-transparent border-none focus:outline-none focus:ring-0 w-full disabled:opacity-80"
                placeholder="Título del documento..."
              />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  {document.estado}
                </span>
                <span className="text-border">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Guardando...</>}
                  {saveStatus === "saved" && <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Guardado</>}
                  {saveStatus === "idle" && "Sin cambios recientes"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>
            
            {!isReadOnly && (
              <button
                onClick={() => setIsFirmaModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:bg-primary/90 transition-all"
              >
                <PenTool className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar a Firmar</span>
              </button>
            )}
          </div>
        </header>

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-secondary/5 print:p-0 print:bg-white">
          <div className="max-w-4xl mx-auto h-full">
            {isReadOnly && (
              <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm flex items-center gap-2 print:hidden">
                <FileSignature className="w-5 h-5" />
                Este documento ya ha sido firmado o enviado a firmar. Es de solo lectura.
              </div>
            )}
            <TiptapEditor 
              content={content} 
              onChange={setContent} 
              editable={!isReadOnly} 
            />
          </div>
        </div>
      </div>

      <FirmaModal 
        isOpen={isFirmaModalOpen} 
        onClose={() => setIsFirmaModalOpen(false)} 
        documentId={document.id} 
      />
    </DashboardLayout>
  );
}
