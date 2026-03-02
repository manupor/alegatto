import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, Sparkles, Scale, Filter, ChevronDown, ChevronUp,
  FileText, AlertTriangle, ShieldCheck, Layers
} from "lucide-react";
import { toast } from "sonner";

const LEGAL_AREAS = [
  "Penal", "Civil", "Laboral", "Comercial", "Constitucional",
  "Administrativo", "Procesal Penal", "Procesal Civil", "Tránsito"
];

interface MessageMeta {
  materia?: string | null;
  riesgo?: string | null;
  layerStats?: { a: number; b: number; c: number };
  durationMs?: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  meta?: MessageMeta;
}

// ── Lightweight markdown renderer ────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="border-border my-2" />);
      continue;
    }
    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={key++} className="border-l-2 border-primary/50 pl-3 text-muted-foreground italic my-1">
          {inlineFormat(line.slice(2))}
        </blockquote>
      );
      continue;
    }
    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="font-semibold text-foreground mt-3 mb-1 text-sm">{inlineFormat(line.slice(4))}</h3>);
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="font-bold text-foreground mt-3 mb-1">{inlineFormat(line.slice(3))}</h2>);
      continue;
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={key++} className="flex gap-2 my-0.5">
          <span className="text-primary font-medium shrink-0">{line.match(/^\d+/)![0]}.</span>
          <span>{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
      continue;
    }
    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={key++} className="flex gap-2 my-0.5">
          <span className="text-primary mt-1.5 shrink-0">•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
      continue;
    }
    // Empty line
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }
    // Normal paragraph
    elements.push(<p key={key++} className="leading-relaxed">{inlineFormat(line)}</p>);
  }

  return <>{elements}</>;
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-secondary/60 px-1 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ── Risk badge ────────────────────────────────────────────

function RiskBadge({ riesgo }: { riesgo: string }) {
  const cfg: Record<string, { cls: string; icon: JSX.Element }> = {
    BAJO:  { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <ShieldCheck className="w-3 h-3" /> },
    MEDIO: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",   icon: <AlertTriangle className="w-3 h-3" /> },
    ALTO:  { cls: "bg-red-500/10 text-red-400 border-red-500/20",          icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const key = riesgo.toUpperCase();
  const { cls, icon } = cfg[key] ?? { cls: "bg-secondary/50 text-muted-foreground border-border", icon: <AlertTriangle className="w-3 h-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      {icon} Riesgo {riesgo}
    </span>
  );
}

// ── Main component ────────────────────────────────────────

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([...LEGAL_AREAS]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, isPending]);

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  };
  const selectAll = () => setSelectedAreas([...LEGAL_AREAS]);
  const clearAll = () => setSelectedAreas([]);

  const allSelected = selectedAreas.length === LEGAL_AREAS.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          conversationId,
          materias: allSelected ? [] : selectedAreas,
        }),
      });
      if (!res.ok) throw new Error("Error al consultar");
      const data = await res.json();

      // Track conversationId for multi-turn history
      if (data.conversationId) setConversationId(data.conversationId);

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        meta: data.meta,
      }]);
    } catch {
      toast.error("Error al procesar la consulta");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Hubo un error al procesar tu consulta. Por favor intenta de nuevo.",
      }]);
    } finally {
      setIsPending(false);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background relative">
        {/* Header */}
        <header className="flex-none px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Asistente Legal IA
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Derecho costarricense · RAG 3 capas · {messages.length > 0 && conversationId ? "Conversación activa" : "Nueva consulta"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={startNewConversation}
                  data-testid="button-new-conversation"
                  className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  Nueva consulta
                </button>
              )}
              <button
                onClick={() => setShowFilters(v => !v)}
                data-testid="button-toggle-filters"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors
                  ${showFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Filter className="w-4 h-4" />
                Áreas
                {!allSelected && (
                  <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-bold">{selectedAreas.length}</span>
                )}
                {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground font-medium">Filtrar por área legal:</p>
                    <div className="flex gap-2">
                      <button onClick={selectAll} className="text-xs text-primary hover:underline">Todo</button>
                      <span className="text-muted-foreground">|</span>
                      <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground">Ninguno</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LEGAL_AREAS.map(area => (
                      <button
                        key={area}
                        onClick={() => toggleArea(area)}
                        data-testid={`filter-area-${area}`}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                          ${selectedAreas.includes(area)
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center opacity-70">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-5 border border-border">
                  <Scale className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">¿En qué puedo ayudarte?</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Pregunta sobre leyes costarricenses. Busco artículos exactos, analizo temas y cito la fuente.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 w-full max-w-xl">
                  {[
                    "¿Qué dice el artículo 112 del Código Penal?",
                    "¿Cuáles son los derechos del imputado en Costa Rica?",
                    "¿Cómo se disuelve una sociedad anónima en Costa Rica?",
                    "¿Qué establece la Constitución sobre el derecho a la vida?",
                  ].map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="p-3.5 rounded-xl bg-card border border-border text-left hover:border-primary/50 hover:bg-secondary/30 transition-all text-sm text-foreground">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-testid={`message-${msg.role}-${i}`}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center shadow-sm ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className="max-w-[82%] flex flex-col gap-1.5">
                      <div className={`rounded-2xl px-4 py-3 text-[14px] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                          : "bg-card border border-border text-foreground shadow-sm"
                      }`}>
                        {msg.role === "assistant"
                          ? <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                          : <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        }
                      </div>

                      {/* Metadata badges for AI messages */}
                      {msg.role === "assistant" && msg.meta && (
                        <div className="flex flex-wrap gap-1.5 px-1">
                          {msg.meta.materia && (
                            <span
                              data-testid={`badge-materia-${i}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                            >
                              <FileText className="w-3 h-3" />
                              {msg.meta.materia}
                            </span>
                          )}
                          {msg.meta.riesgo && msg.meta.riesgo !== "N/A" && (
                            <RiskBadge riesgo={msg.meta.riesgo} />
                          )}
                          {msg.meta.layerStats && (msg.meta.layerStats.a + msg.meta.layerStats.b + msg.meta.layerStats.c) > 0 && (
                            <span
                              data-testid={`badge-sources-${i}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary/60 text-muted-foreground border border-border"
                              title={`Capa A: ${msg.meta.layerStats.a} arts. | Capa B: ${msg.meta.layerStats.b} arts. | Capa C: ${msg.meta.layerStats.c} arts.`}
                            >
                              <Layers className="w-3 h-3" />
                              {msg.meta.layerStats.a + msg.meta.layerStats.b + msg.meta.layerStats.c} artículos recuperados
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isPending && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-card border border-border flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:100ms]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:200ms]" />
                      </div>
                      <span className="text-xs text-muted-foreground">Buscando en normativa costarricense…</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex-none p-4 md:p-6 pt-0 bg-gradient-to-t from-background via-background to-transparent z-10">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ej: ¿Qué dice el artículo 112 del Código Penal?"
              data-testid="input-chat"
              className="w-full pl-5 pr-14 py-3.5 bg-card border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-lg transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              data-testid="button-send-chat"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-center mt-2 text-xs text-muted-foreground">
            Alegatto busca en 4.481 artículos de 8 leyes costarricenses · Verifica la información con un abogado
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
