import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2, ShieldCheck, ArrowLeft, Zap, Building2, CreditCard } from "lucide-react";

declare global {
  interface Window {
    Tilopay: any;
    jQuery: any;
    $: any;
    chargeMethods: (methods: any[]) => void;
    chargeCards: (cards: any[]) => void;
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

  const [configLoading, setConfigLoading] = useState(true);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const initDoneRef = useRef(false);

  // Fetch backend config
  useEffect(() => {
    fetch(`/api/billing/tilopay/config?plan=${plan}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.message) throw new Error(data.message);
        setConfig(data);
      })
      .catch((e) => setError(e.message || "Error cargando configuración"))
      .finally(() => setConfigLoading(false));
  }, [plan]);

  // Load scripts and init SDK once config is ready
  useEffect(() => {
    if (!config || initDoneRef.current) return;
    initDoneRef.current = true;
    setSdkLoading(true);

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement("script");
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
        document.head.appendChild(s);
      });

    const waitForTilopay = (tries = 0): Promise<void> =>
      new Promise((resolve, reject) => {
        const check = () => {
          if (window.Tilopay) { resolve(); return; }
          if (tries > 30) { reject(new Error("Tilopay SDK no respondió")); return; }
          tries++;
          setTimeout(check, 200);
        };
        check();
      });

    const run = async () => {
      try {
        // 1) Load jQuery then Tilopay SDK
        await loadScript("https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js");
        await loadScript("https://app.tilopay.com/sdk/v1/sdk.min.js");

        // 2) Wait until Tilopay global is set (SDK is async)
        await waitForTilopay();

        // 3) Define DOM helpers the SDK calls back
        window.chargeMethods = (methods: any[]) => {
          const sel = document.getElementById("tilopay-method") as HTMLSelectElement | null;
          if (!sel) return;
          sel.innerHTML = "";
          methods.forEach((m: any) => {
            const opt = document.createElement("option");
            opt.value = m.id ?? m.value ?? m;
            opt.textContent = m.name ?? m.label ?? m;
            sel.appendChild(opt);
          });
        };

        window.chargeCards = (cards: any[]) => {
          const sel = document.getElementById("tilopay-cards") as HTMLSelectElement | null;
          if (!sel || !cards?.length) return;
          sel.innerHTML = "";
          const blank = document.createElement("option");
          blank.value = "";
          blank.textContent = "Nueva tarjeta";
          sel.appendChild(blank);
          cards.forEach((c: any) => {
            const opt = document.createElement("option");
            opt.value = c.id ?? c.value ?? c;
            opt.textContent = c.name ?? c.label ?? c;
            sel.appendChild(opt);
          });
        };

        // 4) Init SDK — jQuery's document.ready already fired, call directly
        const init = window.Tilopay.Init({
          token: config.apiKey,
          currency: config.currency,
          language: "es",
          amount: config.amount,
          orderNumber: config.orderNumber,
          capture: 1,
          subscription: 1,
          redirect: config.callbackUrl,
          billToEmail: config.email ?? "",
          billToFirstName: config.firstName ?? "Cliente",
          billToLastName: config.lastName ?? "Alegatto",
          billToCountry: "CR",
          billToCity: "San José",
          billToState: "SJ",
          billToAddress: "Costa Rica",
          billToAddress2: "",
          billToZipPostCode: "10101",
          billToTelephone: "00000000",
          shipToFirstName: config.firstName ?? "Cliente",
          shipToLastName: config.lastName ?? "Alegatto",
          shipToCountry: "CR",
          shipToCity: "San José",
          shipToState: "SJ",
          shipToAddress: "Costa Rica",
          shipToAddress2: "",
          shipToZipPostCode: "10101",
          shipToTelephone: "00000000",
        });

        // 5) Populate selects if the SDK returns data
        if (init?.methods) window.chargeMethods(init.methods);
        if (init?.cards) window.chargeCards(init.cards);

        setSdkReady(true);
      } catch (e: any) {
        console.error("[tilopay-init]", e.message);
        setError(e.message || "No se pudo cargar el formulario de pago.");
      } finally {
        setSdkLoading(false);
      }
    };

    run();
  }, [config]);

  const handlePay = () => {
    if (window.Tilopay?.startPayment) {
      window.Tilopay.startPayment();
    }
  };

  const isLoading = configLoading || sdkLoading;

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full bg-background p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-2xl mx-auto">

            {/* Back */}
            <button
              onClick={() => setLocation("/dashboard/billing")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a planes
            </button>

            {/* Plan summary */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                {plan === "corporate" ? <Building2 className="w-6 h-6 text-primary" /> : <Zap className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg">{planInfo.name}</h2>
                <p className="text-muted-foreground text-sm">{planInfo.desc}</p>
                <p className="text-primary font-semibold mt-0.5">{planInfo.price}</p>
              </div>
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
              <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
              Pago seguro · PCI-DSS · Acepta tarjetas y SINPE Móvil
            </div>

            {/* States */}
            {isLoading && !error && (
              <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">
                  {configLoading ? "Preparando el pago…" : "Cargando formulario de Tilopay…"}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
                <p className="text-destructive text-sm font-medium">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Si el problema persiste, escríbenos a{" "}
                  <a href="mailto:soporte@alegatto.com" className="underline">soporte@alegatto.com</a>
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Tilopay form — always rendered so SDK can inject into it */}
            <div className={`rounded-2xl border border-border bg-card overflow-hidden transition-all ${isLoading || error ? "hidden" : "block"}`}>
              {/* Required DOM elements that Tilopay SDK uses */}
              <div id="tilopay-checkout" className="p-5 space-y-4">

                {/* Method selector — SDK populates this via chargeMethods() */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Método de pago
                  </label>
                  <select
                    id="tilopay-method"
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Cargando métodos…</option>
                  </select>
                </div>

                {/* Saved cards — SDK populates via chargeCards() */}
                <div id="tilopay-cards-container">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Tarjeta guardada (opcional)
                  </label>
                  <select
                    id="tilopay-cards"
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Nueva tarjeta</option>
                  </select>
                </div>

                {/* SDK injects card fields here */}
                <div id="tilopay-form" className="min-h-[200px]" />

                {/* Pay button */}
                {sdkReady && (
                  <button
                    onClick={handlePay}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pagar {planInfo.price}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
