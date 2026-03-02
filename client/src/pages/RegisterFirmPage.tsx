import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Scale, Building2, Check, X, Loader2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const PLANS = [
  {
    value: "free",
    name: "Free",
    price: "Gratis",
    desc: "Para empezar",
    features: ["1 usuario", "10 documentos/mes", "Chat IA básico", "Análisis de documentos"],
    highlight: false,
  },
  {
    value: "pro",
    name: "Pro",
    price: "$99/mes",
    desc: "Para despachos",
    features: ["5 usuarios", "Documentos ilimitados", "Chat IA avanzado", "Análisis prioritario", "Soporte premium"],
    highlight: true,
  },
  {
    value: "enterprise",
    name: "Enterprise",
    price: "Personalizado",
    desc: "Para firmas grandes",
    features: ["Usuarios ilimitados", "Todo incluido", "API dedicada", "SLA garantizado", "Soporte 24/7"],
    highlight: false,
  },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 32);
}

export default function RegisterFirmPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [firmName, setFirmName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [plan, setPlan] = useState("free");
  const [submitting, setSubmitting] = useState(false);

  const slugTimer = useRef<ReturnType<typeof setTimeout>>();

  // Auto-suggest slug from firm name
  useEffect(() => {
    if (!slugEdited && firmName) {
      setSlug(slugify(firmName));
    }
  }, [firmName, slugEdited]);

  // Validate slug availability
  useEffect(() => {
    if (!slug) { setSlugAvailable(null); return; }
    setSlugAvailable(null);
    setSlugChecking(true);
    clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/org/slug/${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugAvailable(data.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 500);
    return () => clearTimeout(slugTimer.current);
  }, [slug]);

  const canSubmit = firmName.trim() && slug && slugAvailable === true && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/org/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: firmName.trim(), slug, plan }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear la organización");
      }
      toast.success("¡Despacho registrado exitosamente!");
      await queryClient.refetchQueries({ queryKey: ["/api/org/context"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Scale className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Registra tu despacho</h1>
          <p className="text-muted-foreground mt-2">Configura tu organización en Alegatto para empezar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Firm info */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Información del despacho
            </h2>

            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Nombre del despacho *</label>
              <input
                value={firmName}
                onChange={e => setFirmName(e.target.value)}
                placeholder="Ej. Rodríguez & Asociados Abogados"
                required
                data-testid="input-firm-name"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">
                Identificador único (slug) *
                <span className="ml-2 text-xs text-muted-foreground">alegatto.com/<span className="text-foreground">{slug || "tu-despacho"}</span></span>
              </label>
              <div className="relative">
                <input
                  value={slug}
                  onChange={e => { setSlug(slugify(e.target.value)); setSlugEdited(true); }}
                  placeholder="rodriguez-asociados"
                  required
                  data-testid="input-firm-slug"
                  className={`w-full px-4 py-3 pr-10 bg-background border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
                    slugAvailable === true ? "border-emerald-500 focus:ring-emerald-500/30"
                    : slugAvailable === false ? "border-red-500 focus:ring-red-500/30"
                    : "border-border focus:border-primary"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugChecking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {!slugChecking && slugAvailable === true && <Check className="w-4 h-4 text-emerald-500" />}
                  {!slugChecking && slugAvailable === false && <X className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {slugAvailable === false && (
                <p className="text-xs text-red-400 mt-1">Este identificador ya está en uso</p>
              )}
              {slugAvailable === true && (
                <p className="text-xs text-emerald-400 mt-1">Disponible</p>
              )}
            </div>
          </div>

          {/* Plan selector */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-5">Selecciona un plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlan(p.value)}
                  data-testid={`button-plan-${p.value}`}
                  className={`relative rounded-xl border p-4 text-left transition-all ${
                    plan === p.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  } ${p.highlight ? "ring-2 ring-primary/20" : ""}`}
                >
                  {p.highlight && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      Popular
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`font-bold text-sm ${plan === p.value ? "text-primary" : "text-foreground"}`}>{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    {plan === p.value && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-lg font-bold text-foreground mb-3">{p.price}</p>
                  <ul className="space-y-1.5">
                    {p.features.map(f => (
                      <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="button-register-firm"
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Registrando despacho…</>
            ) : (
              <>Registrar despacho <ChevronRight className="w-5 h-5" /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
