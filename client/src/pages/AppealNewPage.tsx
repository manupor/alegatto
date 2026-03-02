import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, GripVertical,
  Check, Loader2, Copy, FileText, Download, Edit
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

const PROCESS_TYPES = [
  { value: "civil", label: "Civil" },
  { value: "laboral", label: "Laboral" },
  { value: "penal", label: "Penal" },
  { value: "administrativo", label: "Administrativo" },
  { value: "constitucional", label: "Constitucional" },
];

const RESOLUTION_TYPES = ["Sentencia", "Auto", "Resolución Interlocutoria"];
const WRITING_STYLES = [
  { value: "basic", label: "Básico", desc: "Lenguaje claro y accesible" },
  { value: "technical", label: "Técnico", desc: "Lenguaje jurídico técnico preciso" },
  { value: "expert", label: "Experto", desc: "Altamente especializado" },
];

interface Grievance {
  id: string;
  title: string;
  description: string;
}

interface NormativaResult {
  fuente: string;
  materia: string;
  articulo: string;
  contenido: string;
  score: number;
}

const STEPS = [
  "Tipo de proceso",
  "Resolución impugnada",
  "Agravios",
  "Fundamento legal",
  "Configuración",
];

export default function AppealNewPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);

  // Step 1
  const [processType, setProcessType] = useState("");
  // Step 2
  const [resolvingBody, setResolvingBody] = useState("");
  const [resolutionType, setResolutionType] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  // Step 3
  const [grievances, setGrievances] = useState<Grievance[]>([
    { id: crypto.randomUUID(), title: "", description: "" }
  ]);
  // Step 4
  const [normativaResults, setNormativaResults] = useState<NormativaResult[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [manualJurisprudence, setManualJurisprudence] = useState("");
  const [normativaLoading, setNormativaLoading] = useState(false);
  // Step 5
  const [writingStyle, setWritingStyle] = useState("technical");
  const [lawyerName, setLawyerName] = useState("");
  const [barNumber, setBarNumber] = useState("");
  const [destinationCourt, setDestinationCourt] = useState("");
  // Output
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);

  const addGrievance = () => {
    if (grievances.length >= 10) return;
    setGrievances(prev => [...prev, { id: crypto.randomUUID(), title: "", description: "" }]);
  };

  const removeGrievance = (id: string) => {
    if (grievances.length <= 1) return;
    setGrievances(prev => prev.filter(g => g.id !== id));
  };

  const updateGrievance = (id: string, field: "title" | "description", value: string) => {
    setGrievances(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  // Load normativa when reaching step 3 (index 3)
  useEffect(() => {
    if (step === 3 && grievances.length > 0 && normativaResults.length === 0) {
      loadNormativa();
    }
  }, [step]);

  const loadNormativa = async () => {
    const query = grievances.map(g => g.title + " " + g.description).join(" ");
    setNormativaLoading(true);
    try {
      const res = await fetch("/api/search-normativa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, materias: [processType], topK: 8 }),
      });
      const data = await res.json();
      setNormativaResults(data.results || []);
    } catch {
      toast.error("No se pudo cargar la normativa");
    } finally {
      setNormativaLoading(false);
    }
  };

  const toggleArticle = (articulo: string) => {
    setSelectedArticles(prev =>
      prev.includes(articulo) ? prev.filter(a => a !== articulo) : [...prev, articulo]
    );
  };

  const canNext = () => {
    if (step === 0) return !!processType;
    if (step === 1) return !!resolvingBody && !!resolutionType && !!caseNumber;
    if (step === 2) return grievances.every(g => g.title.trim());
    if (step === 3) return true;
    if (step === 4) return !!lawyerName && !!barNumber && !!destinationCourt;
    return true;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedDoc("");
    setShowOutput(true);

    try {
      const res = await fetch("/api/generate-appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processType, caseNumber, resolvingBody, resolutionType, resolutionDate,
          grievances, selectedArticles, manualJurisprudence,
          writingStyle, lawyerName, barNumber, destinationCourt,
        }),
      });

      if (!res.ok) throw new Error("Error generando recurso");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setGeneratedDoc(full);
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }

      // Auto-save appeal metadata and editor document after generation
      try {
        await fetch("/api/appeals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            processType, caseNumber, resolvingBody, resolutionType, resolutionDate,
            grievances, selectedArticles, manualJurisprudence,
            writingStyle, lawyerName, barNumber, destinationCourt,
            status: "draft",
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/appeals"] });
      } catch {
        // Non-blocking: appeal metadata save failure doesn't break the UX
      }

      try {
        const docRes = await fetch("/api/editor/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: `Recurso de Apelación - Exp. ${caseNumber || "sin número"}`,
            contenidoHtml: `<pre>${full}</pre>`,
            tipo: "apelacion",
          }),
        });
        const doc = await docRes.json();
        if (doc?.id) {
          setSavedDocId(doc.id);
          queryClient.invalidateQueries({ queryKey: ["/api/editor/documents"] });
        }
      } catch {
        // Non-blocking: document save failure doesn't break the UX
      }

      toast.success("Recurso generado y guardado");
    } catch (err: any) {
      toast.error(err.message || "Error generando recurso");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDoc);
    toast.success("Copiado al portapapeles");
  };

  const downloadTxt = () => {
    const blob = new Blob([generatedDoc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recurso-apelacion-${caseNumber || "nuevo"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const editInEditor = async () => {
    if (savedDocId) {
      setLocation(`/dashboard/editor/${savedDocId}`);
      return;
    }
    try {
      const res = await fetch("/api/editor/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: `Recurso de Apelación - Exp. ${caseNumber || "sin número"}`,
          contenidoHtml: `<pre>${generatedDoc}</pre>`,
          tipo: "apelacion",
        }),
      });
      const doc = await res.json();
      setSavedDocId(doc.id);
      setLocation(`/dashboard/editor/${doc.id}`);
    } catch {
      toast.error("Error al abrir en editor");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        {/* Left panel - Stepper: hidden on mobile when output is shown */}
        <div className={`flex flex-col h-full
          ${showOutput
            ? "hidden md:flex md:w-1/2 md:border-r md:border-border"
            : "flex w-full"
          } transition-all duration-500`}>
          {/* Header */}
          <header className="flex-none px-4 py-4 md:px-8 md:py-5 border-b border-border bg-background/80 backdrop-blur-md">
            <h1 className="text-lg md:text-2xl font-bold text-foreground">Generador de Recurso</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block">Complete los pasos para generar el recurso</p>
          </header>

          {/* Step indicators */}
          <div className="flex-none px-4 py-3 md:px-8 md:py-5 border-b border-border">
            <div className="flex items-center gap-1 overflow-x-auto">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                    ${i === step ? "bg-primary text-primary-foreground" :
                      i < step ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                    {i === step && <span className="ml-1">{s}</span>}
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-auto p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl"
              >
                {/* STEP 1 */}
                {step === 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-6">¿Qué tipo de proceso es?</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {PROCESS_TYPES.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setProcessType(p.value)}
                          data-testid={`button-process-${p.value}`}
                          className={`p-4 rounded-xl border text-left transition-all
                            ${processType === p.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-foreground hover:border-primary/50"}`}
                        >
                          <span className="font-medium">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Resolución impugnada</h2>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Órgano resolutor *</label>
                      <input
                        value={resolvingBody}
                        onChange={e => setResolvingBody(e.target.value)}
                        placeholder="Ej. Juzgado Civil de Mayor Cuantía de San José"
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        data-testid="input-resolving-body"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Tipo de resolución *</label>
                      <div className="flex gap-2 flex-wrap">
                        {RESOLUTION_TYPES.map(t => (
                          <button key={t} onClick={() => setResolutionType(t)}
                            className={`px-4 py-2 rounded-lg border text-sm transition-all
                              ${resolutionType === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/50"}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">N° de expediente *</label>
                        <input
                          value={caseNumber}
                          onChange={e => setCaseNumber(e.target.value)}
                          placeholder="XX-XXXXXX-XXXX-CO"
                          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-case-number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Fecha resolución</label>
                        <input
                          type="date"
                          value={resolutionDate}
                          onChange={e => setResolutionDate(e.target.value)}
                          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-resolution-date"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 2 && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-foreground">Agravios</h2>
                      <button
                        onClick={addGrievance}
                        disabled={grievances.length >= 10}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
                        data-testid="button-add-grievance"
                      >
                        <Plus className="w-4 h-4" /> Agregar agravio
                      </button>
                    </div>
                    <div className="space-y-4">
                      {grievances.map((g, i) => (
                        <div key={g.id} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-primary">Agravio {i + 1}</span>
                            {grievances.length > 1 && (
                              <button onClick={() => removeGrievance(g.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors" data-testid={`button-remove-grievance-${i}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <input
                            value={g.title}
                            onChange={e => updateGrievance(g.id, "title", e.target.value)}
                            placeholder="Título del agravio *"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            data-testid={`input-grievance-title-${i}`}
                          />
                          <textarea
                            value={g.description}
                            onChange={e => updateGrievance(g.id, "description", e.target.value)}
                            placeholder="Descripción detallada del agravio..."
                            rows={3}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                            data-testid={`textarea-grievance-desc-${i}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 4 */}
                {step === 3 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-6">Fundamento Legal</h2>
                    {normativaLoading ? (
                      <div className="flex items-center gap-3 text-muted-foreground py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Buscando normativa relevante…</span>
                      </div>
                    ) : (
                      <div className="space-y-3 mb-6">
                        <p className="text-sm text-muted-foreground">Seleccione los artículos a incluir en el recurso:</p>
                        {normativaResults.map((r, i) => {
                          const key = `${r.fuente} - ${r.articulo}`;
                          const isSelected = selectedArticles.includes(key);
                          return (
                            <button
                              key={i}
                              onClick={() => toggleArticle(key)}
                              data-testid={`button-article-${i}`}
                              className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-primary bg-primary" : "border-border"}`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-primary">{r.fuente} {r.articulo && `- ${r.articulo}`}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{r.materia}</p>
                                  <p className="text-sm text-foreground mt-1 line-clamp-2">{r.contenido}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Jurisprudencia adicional (opcional)</label>
                      <textarea
                        value={manualJurisprudence}
                        onChange={e => setManualJurisprudence(e.target.value)}
                        placeholder="Cite resoluciones de la Sala Constitucional, Sala Segunda, etc."
                        rows={3}
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        data-testid="textarea-jurisprudence"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5 */}
                {step === 4 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Configuración del documento</h2>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Estilo de redacción</label>
                      <div className="grid grid-cols-3 gap-3">
                        {WRITING_STYLES.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setWritingStyle(s.value)}
                            data-testid={`button-style-${s.value}`}
                            className={`p-3 rounded-xl border text-left transition-all ${writingStyle === s.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                          >
                            <p className={`font-medium text-sm ${writingStyle === s.value ? "text-primary" : "text-foreground"}`}>{s.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Nombre del abogado *</label>
                        <input value={lawyerName} onChange={e => setLawyerName(e.target.value)}
                          placeholder="Lic. Juan Pérez Mora" data-testid="input-lawyer-name"
                          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">N° Colegiado *</label>
                        <input value={barNumber} onChange={e => setBarNumber(e.target.value)}
                          placeholder="XXXX" data-testid="input-bar-number"
                          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Tribunal de destino *</label>
                      <input value={destinationCourt} onChange={e => setDestinationCourt(e.target.value)}
                        placeholder="Ej. Tribunal de Apelaciones Civil de San José" data-testid="input-destination-court"
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex-none px-4 py-4 md:px-8 md:py-5 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-foreground disabled:opacity-30 hover-elevate"
              data-testid="button-prev-step"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-40"
                data-testid="button-next-step"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canNext() || generating}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
                data-testid="button-generate-appeal"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Generar Recurso
              </button>
            )}
          </div>
        </div>

        {/* Right panel - Output: full screen on mobile, 50% on desktop */}
        <AnimatePresence>
          {showOutput && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full overflow-hidden w-full md:w-1/2"
            >
              <div className="flex-none px-4 py-3 md:px-6 md:py-5 border-b border-border flex items-center justify-between bg-background/80 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Back to form button - mobile only */}
                  <button
                    onClick={() => setShowOutput(false)}
                    className="md:hidden flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs shrink-0"
                    data-testid="button-back-to-form"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="font-semibold text-foreground flex items-center gap-2 truncate text-sm md:text-base">
                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
                    Recurso Generado
                    {generating && <span className="text-xs text-muted-foreground ml-1 animate-pulse">Generando…</span>}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={copyToClipboard} disabled={!generatedDoc} data-testid="button-copy"
                    className="flex items-center gap-1 px-2 py-1.5 md:px-3 rounded-lg border border-border text-xs text-foreground disabled:opacity-30">
                    <Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copiar</span>
                  </button>
                  <button onClick={downloadTxt} disabled={!generatedDoc} data-testid="button-download"
                    className="hidden sm:flex items-center gap-1 px-2 py-1.5 md:px-3 rounded-lg border border-border text-xs text-foreground disabled:opacity-30">
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </button>
                  <button onClick={editInEditor} disabled={!generatedDoc || generating} data-testid="button-edit-in-editor"
                    className="flex items-center gap-1 px-2.5 py-1.5 md:px-3 rounded-lg bg-primary text-primary-foreground text-xs disabled:opacity-30">
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>
              </div>
              <div ref={outputRef} className="flex-1 overflow-auto p-4 md:p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">
                  {generatedDoc || <span className="text-muted-foreground">El recurso aparecerá aquí…</span>}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
