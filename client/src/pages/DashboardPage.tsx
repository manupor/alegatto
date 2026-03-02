import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSendMessage, useConversations } from "@/hooks/use-chat";
import { Send, Bot, User, Sparkles, Scale, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function DashboardPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const { mutate: sendMessage, isPending } = useSendMessage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    sendMessage({ prompt: userMessage }, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      },
      onError: () => {
        setMessages(prev => [...prev, { role: 'assistant', content: "Hubo un error al procesar tu solicitud. Por favor intenta de nuevo." }]);
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background relative">
        {/* Header */}
        <header className="flex-none px-8 py-5 border-b border-border bg-background/80 backdrop-blur-md z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Asistente Legal IA
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Consulta normativa de Costa Rica o genera documentos
            </p>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center opacity-70">
                <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mb-6 border border-border">
                  <Scale className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">¿En qué puedo ayudarte hoy?</h2>
                <p className="text-muted-foreground max-w-md">
                  Pregunta sobre leyes costarricenses, solicita la redacción de un contrato, o pide análisis de un caso legal.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full max-w-2xl">
                  {["Redactar contrato de arrendamiento", "¿Cuáles son mis derechos laborales?", "Resumen de la Ley N° 8968", "Generar acuerdo de confidencialidad"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="p-4 rounded-xl bg-card border border-border text-left hover:border-primary/50 hover:bg-secondary/30 transition-all text-sm text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-sm ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'
                    }`}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                        : 'bg-card border border-border text-foreground shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-full bg-card border border-border text-foreground flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-none p-4 md:p-8 pt-0 bg-gradient-to-t from-background via-background to-transparent z-10">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta legal aquí..."
              className="w-full pl-6 pr-16 py-4 bg-card border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-lg transition-all text-base"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-muted-foreground">
            Alegatto puede cometer errores. Verifica la información importante.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
