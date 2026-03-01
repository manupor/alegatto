import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Mail, User, Send } from "lucide-react";
import { useEnviarFirma } from "@/hooks/use-firma";

interface FirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

export function FirmaModal({ isOpen, onClose, documentId }: FirmaModalProps) {
  const [firmantes, setFirmantes] = useState([{ nombre: "", email: "" }]);
  const { mutate: enviarFirma, isPending } = useEnviarFirma();

  const addFirmante = () => {
    if (firmantes.length < 3) {
      setFirmantes([...firmantes, { nombre: "", email: "" }]);
    }
  };

  const removeFirmante = (index: number) => {
    setFirmantes(firmantes.filter((_, i) => i !== index));
  };

  const updateFirmante = (index: number, field: "nombre" | "email", value: string) => {
    const updated = [...firmantes];
    updated[index][field] = value;
    setFirmantes(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validFirmantes = firmantes.filter(f => f.nombre.trim() !== "" && f.email.trim() !== "");
    
    if (validFirmantes.length === 0) return;

    enviarFirma(
      { documentId, firmantes: validFirmantes },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">Enviar a Firmar</h2>
                <p className="text-sm text-muted-foreground mt-1">Añade hasta 3 firmantes para este documento.</p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                {firmantes.map((firmante, index) => (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    key={index} 
                    className="flex gap-4 items-start"
                  >
                    <div className="flex-1 space-y-4">
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <input
                          required
                          type="text"
                          placeholder="Nombre del firmante"
                          value={firmante.nombre}
                          onChange={(e) => updateFirmante(index, "nombre", e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <input
                          required
                          type="email"
                          placeholder="Correo electrónico"
                          value={firmante.email}
                          onChange={(e) => updateFirmante(index, "email", e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    {firmantes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFirmante(index)}
                        className="p-2.5 mt-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              {firmantes.length < 3 && (
                <button
                  type="button"
                  onClick={addFirmante}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Añadir otro firmante
                </button>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Enviando..." : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Solicitud
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
