import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLocation } from "wouter";
import { Check, Loader2, CreditCard, Zap, Building2, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";

const PLANS = [
  {
    key: "free",
    name: "Gratuito",
    price: "$0",
    period: "/mes",
    description: "Para explorar Alegatto",
    icon: Shield,
    color: "border-border",
    badgeColor: "bg-secondary text-secondary-foreground",
    features: [
      "5 consultas al asistente IA/mes",
      "2 análisis de documentos/mes",
      "1 recurso generado/mes",
      "Acceso básico al editor",
      "1 usuario (solo)",
    ],
    cta: "Plan actual",
    planKey: null,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$20",
    period: "/mes",
    description: "Para abogados independientes",
    icon: Zap,
    color: "border-primary",
    badgeColor: "bg-primary text-primary-foreground",
    features: [
      "Consultas ilimitadas al asistente IA",
      "Análisis ilimitados de documentos",
      "Recursos ilimitados con IA",
      "Editor avanzado con firma electrónica",
      "Gestión de expedientes y alertas",
      "Hasta 3 usuarios en el equipo",
      "Soporte prioritario",
    ],
    cta: "Mejorar a Pro",
    planKey: "pro",
  },
  {
    key: "enterprise",
    name: "Corporativo",
    price: "$50",
    period: "/mes",
    description: "Para firmas legales y equipos",
    icon: Building2,
    color: "border-amber-500 dark:border-amber-400",
    badgeColor: "bg-amber-500 text-white",
    features: [
      "Todo lo del plan Pro",
      "Usuarios ilimitados en el equipo",
      "Panel de analíticas avanzadas",
      "Gestión completa del equipo con RBAC",
      "Roles personalizados (Admin, Senior, Asociado, Pasante)",
      "SLA y soporte dedicado",
    ],
    cta: "Mejorar a Corporativo",
    planKey: "corporate",
  },
];

export default function BillingPage() {
  const [, setLocation] = useLocation();
  const [verifying, setVerifying] = useState(false);

  const { data: billing, isLoading } = useQuery<{ plan: string; subscription: any }>({
    queryKey: ["/api/billing/status"],
  });

  const currentPlan = billing?.plan ?? "free";

  // ── Handle Tilopay redirect back ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tiloOrder = params.get("tilo_order");
    const tiloPlan = params.get("tilo_plan");
    const tiloOrg = params.get("tilo_org");

    if (tiloOrder && tiloPlan && tiloOrg) {
      setVerifying(true);
      fetch("/api/billing/tilopay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: tiloOrder, plan: tiloPlan, orgId: tiloOrg }),
        credentials: "include",
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.plan) {
            queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            queryClient.invalidateQueries({ queryKey: ["/api/org/context"] });
            toast.success("¡Suscripción activada! Bienvenido al plan " + (data.plan === "pro" ? "Pro" : "Corporativo"));
          } else {
            toast.error(data.message || "No se pudo verificar el pago");
          }
        })
        .catch(() => toast.error("Error verificando el pago"))
        .finally(() => {
          setVerifying(false);
          window.history.replaceState({}, "", "/dashboard/billing");
        });
    }
  }, []);

  const handleUpgrade = (planKey: string) => {
    window.location.href = `/checkout/tilopay?plan=${planKey}`;
  };

  const planLabel = (plan: string) => {
    if (plan === "pro") return "Pro";
    if (plan === "enterprise") return "Corporativo";
    return "Gratuito";
  };

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-y-auto h-full">
        <div className="p-5 md:p-10 max-w-5xl mx-auto pb-24 md:pb-10">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Planes y Facturación</h1>
            <p className="text-muted-foreground mt-1">
              {isLoading ? "Cargando..." : (
                <>Plan actual: <span className="font-semibold text-foreground">{planLabel(currentPlan)}</span></>
              )}
            </p>
          </div>

          {/* Verifying overlay */}
          {verifying && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/30 rounded-xl text-primary text-sm">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Verificando tu pago…
            </div>
          )}

          {/* Plan cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando planes…
            </div>
          ) : (
            <div className="flex flex-col md:grid md:grid-cols-3 gap-5">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isCurrentPlan = currentPlan === plan.key;
                const isPro = plan.key === "pro";

                return (
                  <div
                    key={plan.key}
                    data-testid={`card-plan-${plan.key}`}
                    className={`relative flex flex-col rounded-2xl border-2 bg-card p-5 md:p-6 transition-all
                      ${plan.color}
                      ${isPro ? "shadow-lg ring-1 ring-primary/20" : ""}`}
                  >
                    {/* Popular badge */}
                    {isPro && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                          Más popular
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${plan.badgeColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>

                    <div className="mb-5">
                      <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>

                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrentPlan ? (
                      <div className="flex flex-col gap-2">
                        <div
                          className="w-full text-center py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium"
                          data-testid={`status-current-plan-${plan.key}`}
                        >
                          ✓ Plan actual
                        </div>
                        {currentPlan !== "free" && (
                          <button
                            onClick={() => setLocation("/dashboard/profile")}
                            data-testid="button-manage-subscription"
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                            Administrar suscripción
                          </button>
                        )}
                      </div>
                    ) : (
                      plan.planKey && (
                        <button
                          onClick={() => handleUpgrade(plan.planKey!)}
                          data-testid={`button-upgrade-${plan.key}`}
                          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2
                            ${isPro
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "bg-amber-500 text-white hover:bg-amber-600"
                            }`}
                        >
                          {plan.cta}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Security note */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
            Pago seguro · Acepta tarjetas y SINPE Móvil · Cancela cuando quieras
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
