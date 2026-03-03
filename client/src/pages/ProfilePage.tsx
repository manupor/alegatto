import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useOrgContext } from "@/hooks/use-org";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "sonner";
import {
  User, Mail, Building2, Shield, Zap, CreditCard,
  Edit2, Check, X, Crown, BadgeCheck, Loader2,
  FileText, Upload, Trash2, FileCheck2
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

          {/* Writing Template */}
          <WritingTemplateCard isAdmin={isAdmin} />

        </div>
      </div>
    </DashboardLayout>
  );
}

function WritingTemplateCard({ isAdmin }: { isAdmin: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ template: { name: string; excerpt: string; length: number } | null }>({
    queryKey: ["/api/org/writing-template"],
    queryFn: () => fetch("/api/org/writing-template", { credentials: "include" }).then(r => r.ok ? r.json() : { template: null }),
  });

  const template = data?.template ?? null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/org/writing-template", { method: "POST", body: form, credentials: "include" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.message);
      toast.success(`Plantilla "${file.name}" guardada — ${json.length} caracteres extraídos`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/org/writing-template"] });
    } catch (err: any) {
      toast.error(err.message || "Error al subir plantilla");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch("/api/org/writing-template", { method: "DELETE", credentials: "include" });
      toast.success("Plantilla eliminada");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/org/writing-template"] });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" /> Plantilla de escritura del despacho
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Sube un escrito real de tu despacho (PDF o DOCX). La IA lo usará como referencia de estilo, formato y tono al generar recursos y documentos.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
        </div>
      ) : template ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileCheck2 className="w-5 h-5 text-green-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate" data-testid="text-template-name">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{template.length.toLocaleString()} caracteres extraídos</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={handleDelete} disabled={deleting}
                  data-testid="button-delete-template"
                  className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
            <div className="mt-3 rounded-lg bg-background/60 border border-border p-3">
              <p className="text-xs text-muted-foreground font-mono leading-relaxed line-clamp-3">{template.excerpt}</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              data-testid="button-replace-template"
              className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all flex items-center justify-center gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Reemplazar plantilla
            </button>
          )}
        </div>
      ) : (
        isAdmin ? (
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            data-testid="button-upload-template"
            className="w-full py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground">
            {uploading
              ? <><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="text-sm">Procesando…</span></>
              : <><Upload className="w-6 h-6" /><span className="text-sm font-medium">Subir borrador del despacho</span><span className="text-xs">PDF o DOCX · máx. 20 MB</span></>
            }
          </button>
        ) : (
          <div className="py-4 text-sm text-muted-foreground text-center">
            No hay plantilla configurada. Contacta al administrador del despacho.
          </div>
        )
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        data-testid="input-template-file"
        onChange={handleUpload}
      />
    </div>
  );
}
