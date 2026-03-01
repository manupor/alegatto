import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Scale, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";

const LEGAL_AREAS = [
  "Penal", "Civil", "Laboral", "Comercial", "Constitucional",
  "Administrativo", "Procesal Penal", "Procesal Civil", "Tránsito"
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([...LEGAL_AREAS]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const selectAll = () => setSelectedAreas([...LEGAL_AREAS]);
  const clearAll = () => setSelectedAreas([]);

  const filteredCount = selectedAreas.length;
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
          materias: allSelected ? [] : selectedAreas,
        }),
      });
      if (!res.ok) throw new Error("Error al consultar");
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      toast.error("Error al procesar la consulta");
      setMessages(prev => [...prev, { role: "assistant", content: "Hubo un error al procesar tu consulta. Por favor intenta de nuevo." }]);
    } finally {
      setIsPending(false);
    }
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
                Consulta sobre normativa costarricense
              </p>
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              data-testid="button-toggle-filters"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors
                ${showFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <Filter className="w-4 h-4" />
              Áreas
              {!allSelected && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-bold">{filteredCount}</span>
              )}
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Filter panel */}
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
                  Pregunta sobre leyes costarricenses o solicita análisis legal.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 w-full max-w-xl">
                  {["Redactar contrato de arrendamiento", "¿Cuáles son mis derechos laborales?", "Resumen de la Ley N° 8968", "Generar acuerdo de confidencialidad"].map(s => (
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
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center shadow-sm ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                        : "bg-card border border-border text-foreground shadow-sm"
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed text-[14px]">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isPending && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-card border border-border flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-200" />
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
              placeholder="Escribe tu consulta legal aquí..."
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
            LexAI puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
