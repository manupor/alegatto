import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, AlertTriangle, ChevronDown, ChevronUp,
  Download, FolderPlus, Loader2, Shield, Users, BookOpen,
  CheckCircle, XCircle, Info, Gavel, MessageSquare, Send, Bot, User
} from "lucide-react";
import { toast } from "sonner";

interface AnalysisResult {
  parties: { plaintiff: string; defendant: string };
  claims: string[];
  facts: string[];
  legal_basis: string[];
  detected_omissions: string[];
  procedural_risk: {
    level: "low" | "medium" | "high";
    reasons: string[];
    recommendations: string[];
  };
  relevant_articles: string[];
  executive_summary: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const RISK_CONFIG = {
  low: { label: "Bajo", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle },
  medium: { label: "Medio", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: Info },
  high: { label: "Alto", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
};

const SUGGESTED_QUESTIONS = [
  "¿Cuáles son los principales riesgos del documento?",
  "¿Qué obligaciones tiene cada parte?",
  "¿Hay cláusulas desfavorables para el cliente?",
  "¿Qué artículos legales aplican a este caso?",
  "¿Qué pasos recomiendas seguir?",
];

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DocumentChatPanel({ docText, filename }: { docText: string; filename: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/document-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          docText,
          filename,
          history: messages.slice(-6),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al obtener respuesta");
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la pregunta");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Lo siento, hubo un error al procesar tu pregunta. Por favor intenta de nuevo.",
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [docText, filename, messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-primary/25 bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-primary/5">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Preguntas sobre el documento</h3>
          <p className="text-xs text-muted-foreground">{filename}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground mb-1">¿Tiene preguntas sobre este documento?</p>
              <p className="text-xs text-muted-foreground">Pregúnteme cualquier cosa sobre el contenido</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendQuestion(q)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/80 transition-all disabled:opacity-50"
                  data-testid={`button-suggested-q-${i}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
                  ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary border border-border"}`}
                >
                  {msg.role === "user"
                    ? <User className="w-3.5 h-3.5" />
                    : <Bot className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div
                  className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-secondary border border-border text-foreground rounded-tl-sm"}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-secondary border border-border px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta sobre el documento… (Enter para enviar)"
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50 max-h-28 overflow-y-auto"
          style={{ fieldSizing: "content" } as any}
          data-testid="input-document-question"
        />
        <button
          onClick={() => sendQuestion(input)}
          disabled={!input.trim() || isLoading}
          className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          data-testid="button-send-document-question"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [filename, setFilename] = useState("");
  const [docText, setDocText] = useState("");
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setLoading(true);
    setAnalysis(null);
    setDocText("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/analyze-document", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al analizar");
      }
      const data = await res.json();
      setAnalysis(data.analysis);
      setFilename(data.filename);
      setDocText(data.docText ?? "");
      toast.success("Documento analizado exitosamente");
    } catch (err: any) {
      toast.error(err.message || "Error al analizar el documento");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    disabled: loading,
  });

  const exportAnalysisPdf = () => {
    if (!analysis) return;
    const content = `ANÁLISIS LEGAL - LexAI CR
Archivo: ${filename}

RESUMEN EJECUTIVO
${analysis.executive_summary}

PARTES
Demandante: ${analysis.parties.plaintiff}
Demandado: ${analysis.parties.defendant}

PRETENSIONES
${analysis.claims.map((c, i) => `${i + 1}. ${c}`).join("\n")}

HECHOS
${analysis.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

FUNDAMENTO JURÍDICO
${analysis.legal_basis.join("\n")}

OMISIONES DETECTADAS
${analysis.detected_omissions.join("\n")}

RIESGO PROCESAL: ${analysis.procedural_risk.level.toUpperCase()}
${analysis.procedural_risk.reasons.join("\n")}

RECOMENDACIONES
${analysis.procedural_risk.recommendations.join("\n")}

ARTÍCULOS RELEVANTES
${analysis.relevant_articles.join(", ")}
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analisis-${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Análisis exportado");
  };

  const risk = analysis?.procedural_risk;
  const riskConfig = risk ? RISK_CONFIG[risk.level] : null;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-auto">
        <header className="flex-none px-8 py-5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gavel className="w-6 h-6 text-primary" />
            Análisis de Documentos Legales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suba un PDF o DOCX para obtener análisis con IA de normativa costarricense
          </p>
        </header>

        <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-8
              ${isDragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-card"}
              ${loading ? "cursor-not-allowed opacity-60" : "hover:border-primary/60 hover:bg-secondary/20"}
            `}
          >
            <input {...getInputProps()} />
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-lg font-medium text-foreground">Analizando documento…</p>
                <p className="text-sm text-muted-foreground">Esto puede tomar unos segundos</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-colors
                  ${isDragActive ? "bg-primary/20 border-primary" : "bg-secondary/50 border-border"}`}>
                  <Upload className={`w-8 h-8 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {isDragActive ? "Suelte el archivo aquí" : "Arrastre su documento aquí"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">o haga clic para seleccionar</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="px-3 py-1 rounded-full bg-secondary border border-border">PDF</span>
                  <span className="px-3 py-1 rounded-full bg-secondary border border-border">DOCX</span>
                  <span>Máx. 20 MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <AnimatePresence>
            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Header with actions */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Archivo analizado</p>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {filename}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={exportAnalysisPdf}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-sm hover-elevate transition-colors"
                      data-testid="button-export-analysis"
                    >
                      <Download className="w-4 h-4" /> Exportar análisis
                    </button>
                    <button
                      onClick={() => window.open("/dashboard/documentos", "_self")}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm transition-colors"
                      data-testid="button-create-case"
                    >
                      <FolderPlus className="w-4 h-4" /> Crear expediente
                    </button>
                  </div>
                </div>

                {/* Executive summary */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                  <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Resumen Ejecutivo
                  </h3>
                  <p className="text-foreground leading-relaxed">{analysis.executive_summary}</p>
                </div>

                {/* Risk badge */}
                {riskConfig && (
                  <div className={`rounded-xl border p-5 ${riskConfig.bg}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className={`w-5 h-5 ${riskConfig.color}`} />
                      <span className="font-semibold text-foreground">Riesgo Procesal:</span>
                      <span className={`font-bold text-lg ${riskConfig.color}`}>{riskConfig.label}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {risk!.reasons.map((r, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${riskConfig.color} bg-current`} />
                          {r}
                        </p>
                      ))}
                    </div>
                    {risk!.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recomendaciones</p>
                        {risk!.recommendations.map((r, i) => (
                          <p key={i} className="text-sm text-foreground flex gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            {r}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Omissions */}
                {analysis.detected_omissions.length > 0 && (
                  <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-5">
                    <h3 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Omisiones Detectadas
                    </h3>
                    <ul className="space-y-2">
                      {analysis.detected_omissions.map((o, i) => (
                        <li key={i} className="text-sm text-foreground flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Collapsible sections */}
                <CollapsibleSection title="Partes del Proceso" icon={Users} defaultOpen>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Demandante</p>
                      <p className="text-foreground font-medium">{analysis.parties.plaintiff || "No identificado"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Demandado</p>
                      <p className="text-foreground font-medium">{analysis.parties.defendant || "No identificado"}</p>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title={`Pretensiones (${analysis.claims.length})`} icon={Gavel}>
                  <ul className="space-y-2">
                    {analysis.claims.map((c, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-3">
                        <span className="text-primary font-bold shrink-0">{i + 1}.</span> {c}
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>

                <CollapsibleSection title={`Hechos Relevantes (${analysis.facts.length})`} icon={FileText}>
                  <ul className="space-y-2">
                    {analysis.facts.map((f, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-3">
                        <span className="text-primary font-bold shrink-0">{i + 1}.</span> {f}
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>

                <CollapsibleSection title="Fundamento Jurídico" icon={BookOpen}>
                  <ul className="space-y-2">
                    {analysis.legal_basis.map((l, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-2">
                        <span className="text-primary">•</span> {l}
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>

                {analysis.relevant_articles.length > 0 && (
                  <CollapsibleSection title="Artículos Relevantes" icon={BookOpen}>
                    <div className="flex flex-wrap gap-2">
                      {analysis.relevant_articles.map((a, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm">
                          {a}
                        </span>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {/* Document Q&A Chat */}
                {docText && (
                  <DocumentChatPanel docText={docText} filename={filename} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
