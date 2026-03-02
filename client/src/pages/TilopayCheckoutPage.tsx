import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2, ShieldCheck, ArrowLeft, Zap, Building2 } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Tilopay: any;
    jQuery: any;
    $: any;
  }
}

const PLAN_INFO: Record<string, { name: string; price: string; desc: string }> = {
  pro: { name: "Plan Pro", price: "$20.00 USD/mes", desc: "Abogados independientes · Todo ilimitado" },
  corporate: { name: "Plan Corporativo", price: "$50.00 USD/mes", desc: "Firmas legales · Multi-tenant · Equipo ilimitado" },
};

export default function TilopayCheckoutPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const plan = params.get("plan") || "pro";
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.pro;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const sdkRef = useRef(false);

  useEffect(() => {
    fetch(`/api/billing/tilopay/config?plan=${plan}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.message) throw new Error(data.message);
        setConfig(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [plan]);

  useEffect(() => {
    if (!config || sdkRef.current) return;
    sdkRef.current = true;

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });

    const initTilopay = async () => {
      try {
        await loadScript("https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js");
        await loadScript("https://app.tilopay.com/sdk/v1/sdk.min.js");

        if (!window.Tilopay) throw new Error("Tilopay SDK no cargó");

        window.Tilopay.Init({
          token: config.apiKey,
          currency: config.currency,
          language: config.language || "es",
          amount: config.amount,
          orderNumber: config.orderNumber,
          capture: 1,
          subscription: 1,
          redirect: config.callbackUrl,
          billToEmail: config.email || "",
          billToFirstName: config.firstName || "Cliente",
          billToLastName: config.lastName || "Alegatto",
          billToCountry: "CR",
          billToCity: "San José",
          billToState: "SJ",
          billToAddress: "Costa Rica",
          billToZipPostCode: "10101",
          billToTelephone: "00000000",
          shipToFirstName: config.firstName || "Cliente",
          shipToLastName: config.lastName || "Alegatto",
          shipToCountry: "CR",
          shipToCity: "San José",
          shipToState: "SJ",
          shipToAddress: "Costa Rica",
          shipToZipPostCode: "10101",
          shipToTelephone: "00000000",
        });
      } catch (e: any) {
        console.error("[tilopay-init]", e.message);
        setError("No se pudo cargar el formulario de pago. Intente de nuevo.");
      }
    };

    initTilopay();
  }, [config]);

  return (
    <DashboardLayout>
      <div className="min-h-full bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Back */}
          <button
            onClick={() => setLocation("/dashboard/billing")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a planes
          </button>

          {/* Plan summary card */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              {plan === "corporate" ? <Building2 className="w-6 h-6 text-primary" /> : <Zap className="w-6 h-6 text-primary" />}
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">{planInfo.name}</h2>
              <p className="text-muted-foreground text-sm">{planInfo.desc}</p>
              <p className="text-primary font-semibold mt-1">{planInfo.price}</p>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
            Pago seguro procesado por Tilopay · PCI-DSS · Acepta tarjetas y SINPE Móvil
          </div>

          {/* Payment form container */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="text-sm">Cargando formulario de pago…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="text-destructive text-sm font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Tilopay injects its UI into #tilopay-form */}
              <div id="tilopay-form" className="p-4 min-h-[400px]">
                <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Iniciando formulario de pago…</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
