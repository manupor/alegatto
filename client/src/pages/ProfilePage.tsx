import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useOrgContext } from "@/hooks/use-org";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "sonner";
import {
  User, Mail, Building2, Shield, Zap, CreditCard,
  Edit2, Check, X, Crown, BadgeCheck, Loader2
} from "lucide-react";

const PLAN_CONFIG: Record<string, {
  label: string; color: string; badge: string;
  features: string[]; icon: any;
}> = {
  free: {
    label: "Gratuito",
    color: "text-muted-foreground",
    badge: "bg-secondary text-secondary-foreground",
    icon: Shield,
    features: [
      "5 consultas IA / mes",
      "2 análisis de documentos / mes",
      "1 recurso generado / mes",
      "Acceso básico al editor",
    ],
  },
  pro: {
    label: "Pro",
    color: "text-primary",
    badge: "bg-primary/10 text-primary border border-primary/30",
    icon: Zap,
    features: [
      "Consultas IA ilimitadas",
      "Análisis de documentos ilimitados",
      "Recursos ilimitados",
      "Editor completo con historial",
      "Firma electrónica",
      "Google Calendar sync",
    ],
  },
  enterprise: {
    label: "Corporativo",
    color: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-500 border border-amber-500/30",
    icon: Crown,
    features: [
      "Todo del plan Pro",
      "Multi-tenant avanzado",
      "Equipo ilimitado",
      "Analíticas avanzadas",
      "Soporte prioritario",
      "SLA garantizado",
    ],
  },
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  senior: "Senior",
  assistant: "Asociado",
  intern: "Pasante",
};

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { org, role } = useOrgContext();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || "");

  const plan = org?.plan ?? "free";
  const planCfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
  const PlanIcon = planCfg.icon;

  const updateNameMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("PUT", "/api/user/profile", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast.success("Nombre actualizado");
      setEditingName(false);
    },
    onError: () => toast.error("Error actualizando nombre"),
  });

  const handleSaveName = () => {
    if (!nameValue.trim()) return;
    updateNameMutation.mutate(nameValue.trim());
  };

  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Información de tu cuenta y suscripción
            </p>
          </div>

          {/* Avatar + name card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                {/* Name */}
                <div className="flex items-center gap-2 mb-1">
                  {editingName ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        data-testid="input-profile-name"
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                        className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        autoFocus
                      />
                      <button
                        data-testid="button-save-name"
                        onClick={handleSaveName}
                        disabled={updateNameMutation.isPending}
                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {updateNameMutation.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        data-testid="button-cancel-name"
                        onClick={() => { setEditingName(false); setNameValue(user?.name || ""); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary/60 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-foreground truncate">
                        {user?.name || "Sin nombre"}
                      </p>
                      <button
                        data-testid="button-edit-name"
                        onClick={() => setEditingName(true)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span data-testid="text-profile-email">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Organization info */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Organización
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/40 border border-border flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground" data-testid="text-org-name">
                  {org?.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground" data-testid="text-user-role">
                    {ROLE_LABELS[role ?? ""] || role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Suscripción
            </h2>

            {/* Current plan badge */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  plan === "free" ? "bg-secondary/40 border border-border" :
                  plan === "enterprise" ? "bg-amber-500/10 border border-amber-500/20" :
                  "bg-primary/10 border border-primary/20"
                }`}>
                  <PlanIcon className={`w-5 h-5 ${planCfg.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      Plan {planCfg.label}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${planCfg.badge}`}
                      data-testid="badge-plan">
                      {planCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan === "free" ? "Acceso básico a Alegatto" :
                     plan === "enterprise" ? "$50 USD / mes" : "$20 USD / mes"}
                  </p>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-2 mb-5">
              {planCfg.features.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              data-testid="button-change-plan"
              onClick={() => setLocation("/dashboard/billing")}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                plan === "free"
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border border-border text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              {plan === "free" ? "Mejorar suscripción" : "Gestionar suscripción"}
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
