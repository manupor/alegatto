import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDocument, useUpdateDocument } from "@/hooks/use-documents";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { FirmaModal } from "@/components/firma/FirmaModal";
import {
  ArrowLeft, Save, PenTool, Loader2, CheckCircle2, FileSignature,
  History, Download, FileText, X, RotateCcw, Clock
} from "lucide-react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DocumentVersion } from "@shared/schema";

function downloadDocx(title: string, htmlContent: string) {
  // Strip HTML for basic text DOCX
  const tmp = document.createElement("div");
  tmp.innerHTML = htmlContent;
  const text = tmp.innerText;

  const blob = new Blob([text], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: document, isLoading } = useDocument(id || "");
  const { mutate: updateDocument, isPending: isSaving } = useUpdateDocument();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isFirmaModalOpen, setIsFirmaModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [wordCount, setWordCount] = useState(0);
  const initialized = useRef(false);
  const contentRef = useRef(content);
  const titleRef = useRef(title);

  contentRef.current = content;
  titleRef.current = title;

  // Version history
  const { data: versions = [], refetch: refetchVersions } = useQuery<DocumentVersion[]>({
    queryKey: ["/api/editor/documents", id, "versions"],
    queryFn: () => fetch(`/api/editor/documents/${id}/versions`).then(r => r.json()),
    enabled: !!id && isHistoryOpen,
  });

  // Sync initial data
  useEffect(() => {
    if (document && !initialized.current) {
      setContent(document.contenidoHtml);
      setTitle(document.titulo);
      initialized.current = true;
      updateWordCount(document.contenidoHtml);
    }
  }, [document]);

  const updateWordCount = (html: string) => {
    const tmp = document.createElement ? document.createElement("div") : null;
    if (!tmp) return;
    tmp.innerHTML = html;
    const text = tmp.innerText || tmp.textContent || "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  };

  const handleContentChange = (html: string) => {
    setContent(html);
    updateWordCount(html);
  };

  const doSave = useCallback(() => {
    if (!document) return;
    const currentContent = contentRef.current;
    const currentTitle = titleRef.current;
    if (currentContent === document.contenidoHtml && currentTitle === document.titulo) return;

    setSaveStatus("saving");
    updateDocument(
      { id: document.id, contenidoHtml: currentContent, titulo: currentTitle },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 3000);
          refetchVersions();
        },
        onError: () => {
          setSaveStatus("idle");
          toast.error("Error al guardar");
        }
      }
    );
  }, [document, updateDocument, refetchVersions]);

  // Debounced save (2s after typing stops)
  useEffect(() => {
    if (!initialized.current) return;
    const t = setTimeout(doSave, 2000);
    return () => clearTimeout(t);
  }, [content, title]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!initialized.current) return;
    const interval = setInterval(doSave, 30000);
    return () => clearInterval(interval);
  }, [doSave]);

  const restoreVersion = async (versionId: string) => {
    const res = await fetch(`/api/editor/documents/${id}/versions/${versionId}/restore`, {
      method: "POST",
    });
    if (!res.ok) { toast.error("No se pudo restaurar la versión"); return; }
    const doc = await res.json();
    setContent(doc.contenidoHtml);
    initialized.current = true;
    queryClient.invalidateQueries({ queryKey: ["/api/editor/documents", id] });
    toast.success("Versión restaurada");
    setIsHistoryOpen(false);
  };

  const exportPdf = () => {
    window.print();
  };

  const exportDocx = () => {
    if (!document) return;
    downloadDocx(document.titulo, content);
    toast.success("DOCX descargado");
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
        {/* Header */}
        <header className="flex-none px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden z-10">
          <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
            <Link href="/dashboard/documentos" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReadOnly}
                data-testid="input-document-title"
                className="text-xl font-bold text-foreground bg-transparent border-none focus:outline-none focus:ring-0 w-full disabled:opacity-80 truncate"
                placeholder="Título del documento..."
              />
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                  document.estado === "firmado"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : document.estado === "revision"
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {document.estado === "borrador" ? "Borrador" : document.estado === "revision" ? "En revisión" : "Firmado"}
                </span>
                <span className="text-border">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="status-save">
                  {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</>}
                  {saveStatus === "saved" && <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Guardado ✓</>}
                  {saveStatus === "idle" && "Sin cambios recientes"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={() => { setIsHistoryOpen(v => !v); }}
              data-testid="button-version-history"
              className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground text-sm rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historial</span>
            </button>

            <button
              onClick={exportPdf}
              data-testid="button-export-pdf"
              className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground text-sm rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={exportDocx}
              data-testid="button-export-docx"
              className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground text-sm rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">DOCX</span>
            </button>

            {!isReadOnly && (
              <button
                onClick={() => setIsFirmaModalOpen(true)}
                data-testid="button-send-to-sign"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <PenTool className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar a Firmar</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Editor body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-secondary/5 print:p-0 print:bg-white">
            <div className="max-w-4xl mx-auto h-full flex flex-col">
              {isReadOnly && (
                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center gap-2 print:hidden">
                  <FileSignature className="w-5 h-5 shrink-0" />
                  Este documento ya ha sido firmado o enviado a firmar. Es de solo lectura.
                </div>
              )}
              <TiptapEditor
                content={content}
                onChange={handleContentChange}
                editable={!isReadOnly}
              />
            </div>
          </div>

          {/* Version history drawer */}
          <AnimatePresence>
            {isHistoryOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="border-l border-border bg-card flex flex-col overflow-hidden shrink-0 print:hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">Historial de versiones</h3>
                  </div>
                  <button onClick={() => setIsHistoryOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {versions.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No hay versiones guardadas</p>
                      <p className="text-xs mt-1">Las versiones se guardan al editar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((v, i) => (
                        <div key={v.id} className="rounded-lg border border-border bg-background p-3" data-testid={`version-item-${i}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-primary font-medium">v{versions.length - i}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(v.createdAt), "d MMM, HH:mm", { locale: es })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {v.contenidoHtml.replace(/<[^>]+>/g, " ").substring(0, 100)}…
                          </p>
                          <button
                            onClick={() => restoreVersion(v.id)}
                            data-testid={`button-restore-version-${i}`}
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Footer with word count */}
        <div className="flex-none px-6 py-2 border-t border-border bg-card flex items-center justify-between print:hidden">
          <span className="text-xs text-muted-foreground" data-testid="text-word-count">
            {wordCount} palabras
          </span>
          <span className="text-xs text-muted-foreground">
            Guardado automáticamente cada 30 segundos
          </span>
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
