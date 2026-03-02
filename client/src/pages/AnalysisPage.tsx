import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, AlertTriangle, ChevronDown, ChevronUp,
  Download, FolderPlus, Loader2, Shield, Users, BookOpen,
  CheckCircle, XCircle, Info, Gavel, MessageSquare, Send, Bot, User, FileDown,
  Bell, Calendar, X, CalendarPlus
} from "lucide-react";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, TableRow, TableCell, Table, WidthType
} from "docx";
import { saveAs } from "file-saver";

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
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // ── Appeal reminder modal ──────────────────────────────
  const [showReminder, setShowReminder] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [calendarEventLink, setCalendarEventLink] = useState<string | null>(null);
  const defaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  };
  const [reminderDate, setReminderDate] = useState(defaultDueDate);
  const [reminderDesc, setReminderDesc] = useState("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

      // Auto-trigger reminder modal for medium/high procedural risk
      const risk = data.analysis?.procedural_risk?.level;
      if (risk === "medium" || risk === "high") {
        const recs = (data.analysis?.procedural_risk?.recommendations ?? []).join(" ");
        setReminderDesc(
          `Recurso de apelación – ${data.filename}. Riesgo: ${risk === "high" ? "Alto" : "Medio"}. ${recs}`
        );
        setReminderDate(defaultDueDate());
        setCalendarEventLink(null);
        setShowReminder(true);
      }
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

  // ── Calendar status ────────────────────────────────────
  const { data: calStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
  });
  const calendarConnected = calStatus?.connected ?? false;

  // ── Reminder functions ─────────────────────────────────
  const saveReminderInApp = async () => {
    if (!reminderDate || !reminderDesc.trim()) {
      toast.error("Completá la fecha y descripción");
      return;
    }
    setReminderSaving(true);
    try {
      await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: reminderDesc, dueDate: reminderDate, status: "pending" }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
      toast.success("Recordatorio guardado en LexAI");

      // Browser push notification (if permission granted)
      if (Notification.permission === "granted") {
        new Notification("LexAI CR — Recordatorio de Apelación", {
          body: `Fecha límite: ${new Date(reminderDate + "T12:00:00").toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}`,
          icon: "/favicon.ico",
        });
      } else if (Notification.permission !== "denied") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          new Notification("LexAI CR — Recordatorio guardado", {
            body: `Fecha límite: ${new Date(reminderDate + "T12:00:00").toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}`,
            icon: "/favicon.ico",
          });
        }
      }

      setShowReminder(false);
    } catch {
      toast.error("Error al guardar el recordatorio");
    } finally {
      setReminderSaving(false);
    }
  };

  const syncGoogleCalendar = async () => {
    if (!reminderDate || !reminderDesc.trim()) {
      toast.error("Completá la fecha y descripción");
      return;
    }
    setSyncingCalendar(true);
    try {
      const res = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `Apelación – ${filename}`,
          description: reminderDesc,
          date: reminderDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al sincronizar");
      }
      const data = await res.json();
      setCalendarEventLink(data.eventLink);
      toast.success("Evento creado en Google Calendar con recordatorios");
    } catch (err: any) {
      toast.error(err.message || "Error al sincronizar con Google Calendar");
    } finally {
      setSyncingCalendar(false);
    }
  };

  const downloadICS = () => {
    const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dateStr = reminderDate.replace(/-/g, "");
    const nextDay = (() => {
      const d = new Date(reminderDate + "T12:00:00");
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0].replace(/-/g, "");
    })();
    const desc = reminderDesc.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LexAI CR//ES",
      "BEGIN:VEVENT",
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${nextDay}`,
      `SUMMARY:Apelación – ${filename}`,
      `DESCRIPTION:${desc}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Recordatorio LexAI CR",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recordatorio-apelacion.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo .ics descargado — abrilo en tu app de calendario");
  };

  const exportAsDocx = async () => {
    if (!analysis) return;
    setExporting(true);
    setExportOpen(false);
    try {
      const RIESGO_MAP: Record<string, string> = { low: "BAJO", medium: "MEDIO", high: "ALTO" };
      const riesgoLabel = RIESGO_MAP[analysis.procedural_risk.level] ?? analysis.procedural_risk.level;

      const heading = (text: string) =>
        new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 120 } });

      const bullet = (text: string) =>
        new Paragraph({
          children: [new TextRun({ text: `• ${text}`, size: 22 })],
          spacing: { after: 80 },
        });

      const numbered = (text: string, n: number) =>
        new Paragraph({
          children: [new TextRun({ text: `${n}. ${text}`, size: 22 })],
          spacing: { after: 80 },
        });

      const doc = new Document({
        creator: "LexAI CR",
        title: `Análisis Legal – ${filename}`,
        description: "Análisis generado por LexAI CR",
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: "ANÁLISIS LEGAL", bold: true, size: 36, color: "10B981" })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({ text: "LexAI CR — Asistente Jurídico Inteligente", size: 22, color: "64748B" })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({ text: `Archivo: ${filename}`, size: 20, italics: true, color: "64748B" })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({ text: `Fecha: ${new Date().toLocaleDateString("es-CR")}`, size: 20, color: "64748B" })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
              }),

              heading("RESUMEN EJECUTIVO"),
              new Paragraph({ children: [new TextRun({ text: analysis.executive_summary, size: 22 })], spacing: { after: 200 } }),

              heading("RIESGO PROCESAL"),
              new Paragraph({
                children: [
                  new TextRun({ text: "Nivel de riesgo: ", bold: true, size: 22 }),
                  new TextRun({ text: riesgoLabel, bold: true, size: 22, color: analysis.procedural_risk.level === "high" ? "EF4444" : analysis.procedural_risk.level === "medium" ? "F59E0B" : "10B981" }),
                ],
                spacing: { after: 100 },
              }),
              ...analysis.procedural_risk.reasons.map(r => bullet(r)),
              ...(analysis.procedural_risk.recommendations.length > 0
                ? [new Paragraph({ children: [new TextRun({ text: "Recomendaciones:", bold: true, size: 22 })], spacing: { before: 120, after: 80 } }),
                   ...analysis.procedural_risk.recommendations.map(r => bullet("✓ " + r))]
                : []),

              heading("PARTES DEL PROCESO"),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Demandante", bold: true, size: 22 })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Demandado", bold: true, size: 22 })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: analysis.parties.plaintiff || "No identificado", size: 22 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: analysis.parties.defendant || "No identificado", size: 22 })] })] }),
                    ],
                  }),
                ],
              }),

              ...(analysis.claims.length > 0 ? [
                heading(`PRETENSIONES (${analysis.claims.length})`),
                ...analysis.claims.map((c, i) => numbered(c, i + 1)),
              ] : []),

              ...(analysis.facts.length > 0 ? [
                heading(`HECHOS RELEVANTES (${analysis.facts.length})`),
                ...analysis.facts.map((f, i) => numbered(f, i + 1)),
              ] : []),

              ...(analysis.legal_basis.length > 0 ? [
                heading("FUNDAMENTO JURÍDICO"),
                ...analysis.legal_basis.map(l => bullet(l)),
              ] : []),

              ...(analysis.detected_omissions.length > 0 ? [
                heading("OMISIONES DETECTADAS"),
                ...analysis.detected_omissions.map(o => bullet("⚠ " + o)),
              ] : []),

              ...(analysis.relevant_articles.length > 0 ? [
                heading("ARTÍCULOS RELEVANTES"),
                new Paragraph({
                  children: [new TextRun({ text: analysis.relevant_articles.join(" · "), size: 22 })],
                  spacing: { after: 200 },
                }),
              ] : []),

              new Paragraph({
                children: [new TextRun({ text: "—", color: "64748B", size: 18 })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 },
              }),
              new Paragraph({
                children: [new TextRun({ text: "Generado por LexAI CR · lexai.cr", color: "64748B", size: 18, italics: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `analisis-${filename.replace(/\.[^.]+$/, "")}.docx`);
      toast.success("Exportado como Word (.docx)");
    } catch (err: any) {
      toast.error("Error al exportar: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const exportAsPdf = () => {
    if (!analysis) return;
    setExportOpen(false);
    const RIESGO_MAP: Record<string, string> = { low: "BAJO", medium: "MEDIO", high: "ALTO" };
    const RIESGO_COLOR: Record<string, string> = { low: "#10B981", medium: "#F59E0B", high: "#EF4444" };
    const riesgoLabel = RIESGO_MAP[analysis.procedural_risk.level] ?? analysis.procedural_risk.level;
    const riesgoColor = RIESGO_COLOR[analysis.procedural_risk.level] ?? "#64748B";

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Análisis Legal – ${filename}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; font-size: 12pt; color: #1e293b; background: #fff; padding: 40px 60px; }
    .header { text-align: center; border-bottom: 3px solid #10B981; padding-bottom: 20px; margin-bottom: 28px; }
    .logo { font-size: 22pt; font-weight: bold; color: #10B981; letter-spacing: 2px; }
    .subtitle { font-size: 10pt; color: #64748b; margin-top: 4px; }
    .meta { font-size: 9pt; color: #94a3b8; margin-top: 6px; }
    h2 { font-size: 13pt; font-weight: bold; color: #0f172a; border-left: 4px solid #10B981; padding-left: 10px; margin: 24px 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    p, li { line-height: 1.6; margin-bottom: 6px; font-size: 11pt; }
    ul { padding-left: 20px; }
    .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px 18px; margin-bottom: 4px; }
    .risk-box { border-radius: 6px; padding: 14px 18px; margin-bottom: 4px; }
    .risk-label { font-size: 14pt; font-weight: bold; color: ${riesgoColor}; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; font-size: 11pt; }
    th { background: #f8fafc; font-weight: bold; }
    .pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .pill { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #059669; border-radius: 99px; padding: 2px 10px; font-size: 10pt; }
    .footer { text-align: center; margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9pt; }
    @media print { body { padding: 20px 40px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">LexAI CR</div>
    <div class="subtitle">Asistente Jurídico Inteligente para Costa Rica</div>
    <div class="meta">Archivo: ${filename} &nbsp;·&nbsp; ${new Date().toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>

  <h2>Resumen Ejecutivo</h2>
  <div class="summary-box"><p>${analysis.executive_summary}</p></div>

  <h2>Riesgo Procesal</h2>
  <div class="risk-box" style="background:${riesgoColor}15; border:1px solid ${riesgoColor}40;">
    <p>Nivel: <span class="risk-label">${riesgoLabel}</span></p>
    <ul style="margin-top:8px">${analysis.procedural_risk.reasons.map(r => `<li>${r}</li>`).join("")}</ul>
    ${analysis.procedural_risk.recommendations.length > 0 ? `
    <p style="margin-top:12px;font-weight:bold;">Recomendaciones:</p>
    <ul>${analysis.procedural_risk.recommendations.map(r => `<li>✓ ${r}</li>`).join("")}</ul>` : ""}
  </div>

  <h2>Partes del Proceso</h2>
  <table>
    <tr><th>Demandante</th><th>Demandado</th></tr>
    <tr><td>${analysis.parties.plaintiff || "No identificado"}</td><td>${analysis.parties.defendant || "No identificado"}</td></tr>
  </table>

  ${analysis.detected_omissions.length > 0 ? `
  <h2>Omisiones Detectadas</h2>
  <ul>${analysis.detected_omissions.map(o => `<li>⚠ ${o}</li>`).join("")}</ul>` : ""}

  ${analysis.claims.length > 0 ? `
  <h2>Pretensiones (${analysis.claims.length})</h2>
  <ol>${analysis.claims.map(c => `<li>${c}</li>`).join("")}</ol>` : ""}

  ${analysis.facts.length > 0 ? `
  <h2>Hechos Relevantes (${analysis.facts.length})</h2>
  <ol>${analysis.facts.map(f => `<li>${f}</li>`).join("")}</ol>` : ""}

  ${analysis.legal_basis.length > 0 ? `
  <h2>Fundamento Jurídico</h2>
  <ul>${analysis.legal_basis.map(l => `<li>${l}</li>`).join("")}</ul>` : ""}

  ${analysis.relevant_articles.length > 0 ? `
  <h2>Artículos Relevantes</h2>
  <div class="pills">${analysis.relevant_articles.map(a => `<span class="pill">${a}</span>`).join("")}</div>` : ""}

  <div class="footer">Generado por LexAI CR · lexai.cr</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { toast.error("Habilite ventanas emergentes para exportar PDF"); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
    toast.success("Abriendo vista de impresión para PDF…");
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
                  <div className="flex gap-2 flex-wrap items-center">
                    {/* Export dropdown */}
                    <div className="relative" ref={exportRef}>
                      <button
                        onClick={() => setExportOpen(v => !v)}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        data-testid="button-export-analysis"
                      >
                        {exporting
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <FileDown className="w-4 h-4" />}
                        Exportar
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {exportOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
                          >
                            <div className="p-1">
                              <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Formato</p>
                              <button
                                onClick={exportAsDocx}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                                data-testid="button-export-docx"
                              >
                                <span className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4 text-blue-400" />
                                </span>
                                <div className="text-left">
                                  <p className="font-medium">Word (.docx)</p>
                                  <p className="text-xs text-muted-foreground">Microsoft Word</p>
                                </div>
                              </button>
                              <button
                                onClick={exportAsPdf}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                                data-testid="button-export-pdf"
                              >
                                <span className="w-8 h-8 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                  <FileDown className="w-4 h-4 text-red-400" />
                                </span>
                                <div className="text-left">
                                  <p className="font-medium">PDF</p>
                                  <p className="text-xs text-muted-foreground">Impresión / vista previa</p>
                                </div>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

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
      {/* ── Appeal Reminder Modal ───────────────────────── */}
      <AnimatePresence>
        {showReminder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowReminder(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-border bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Recordatorio de Apelación</h3>
                    <p className="text-xs text-amber-400 mt-0.5">
                      {analysis?.procedural_risk.level === "high" ? "⚠ Riesgo Alto detectado" : "• Riesgo Medio detectado"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReminder(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-close-reminder"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Este documento tiene oportunidades de apelación. ¿Deseas guardar un recordatorio?
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha límite de apelación</label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    data-testid="input-reminder-date"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descripción</label>
                  <textarea
                    value={reminderDesc}
                    onChange={(e) => setReminderDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    data-testid="input-reminder-desc"
                  />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {/* Save in LexAI (primary) */}
                  <button
                    onClick={saveReminderInApp}
                    disabled={reminderSaving}
                    className="flex items-center justify-center gap-2.5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    data-testid="button-save-reminder-app"
                  >
                    {reminderSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    Guardar en LexAI + Notificación
                  </button>

                  {/* Google Calendar — smart section */}
                  {calendarConnected ? (
                    calendarEventLink ? (
                      <a
                        href={calendarEventLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        data-testid="link-calendar-event"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Evento creado — Ver en Google Calendar
                      </a>
                    ) : (
                      <button
                        onClick={syncGoogleCalendar}
                        disabled={syncingCalendar}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-sm text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                        data-testid="button-sync-google-calendar"
                      >
                        {syncingCalendar ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                        Sincronizar con Google Calendar
                      </button>
                    )
                  ) : (
                    <a
                      href="/api/auth/google"
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-secondary text-sm text-muted-foreground hover:bg-secondary/80 transition-colors"
                      data-testid="link-connect-google"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Conectar Google Calendar
                    </a>
                  )}

                  {/* Download ICS for phone / Apple Calendar */}
                  <button
                    onClick={downloadICS}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors"
                    data-testid="button-download-ics"
                  >
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Agregar al calendario del teléfono (.ics)
                  </button>

                  <button
                    onClick={() => setShowReminder(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    data-testid="button-skip-reminder"
                  >
                    Omitir por ahora
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
