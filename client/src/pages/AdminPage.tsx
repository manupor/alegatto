import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Plus, Trash2, Copy, Check, Mail, Shield, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

type BetaInvite = {
  id: string;
  email: string;
  code: string;
  note: string | null;
  used: boolean;
  usedAt: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
  const isSuperAdmin = user?.email === superAdminEmail || !superAdminEmail;

  if (user && !isSuperAdmin) return <Redirect to="/dashboard" />;

  const { data: invites = [], isLoading } = useQuery<BetaInvite[]>({
    queryKey: ["/api/admin/beta-invites"],
    queryFn: () => fetch("/api/admin/beta-invites", { credentials: "include" }).then(r => r.json()),
    enabled: !!user,
  });

  const { mutate: createInvite, isPending: isCreating } = useMutation({
    mutationFn: (data: { email: string; note?: string }) =>
      apiRequest("POST", "/api/admin/beta-invites", data).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beta-invites"] });
      toast.success(`Invitación creada para ${data.invite.email}`);
      setEmail("");
      setNote("");
      setShowForm(false);
      copyToClipboard(data.betaLink, data.invite.id);
    },
    onError: (err: any) => toast.error(err.message || "Error al crear invitación"),
  });

  const { mutate: deleteInvite } = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/beta-invites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beta-invites"] });
      toast.success("Invitación eliminada");
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Enlace copiado");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBetaLink = (invite: BetaInvite) => {
    const base = window.location.origin;
    return `${base}/auth?betaCode=${invite.code}&email=${encodeURIComponent(invite.email)}`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel Admin</h1>
            <p className="text-sm text-muted-foreground">Gestión de accesos beta</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Invitaciones Beta</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              data-testid="button-new-beta-invite"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancelar" : "Nueva invitación"}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={e => { e.preventDefault(); createInvite({ email, note: note || undefined }); }}
              className="border border-border rounded-xl p-4 mb-4 bg-background space-y-3"
            >
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Correo electrónico *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="abogado@ejemplo.com"
                  data-testid="input-beta-email"
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ej: Contacto de LinkedIn"
                  data-testid="input-beta-note"
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                data-testid="button-create-beta-invite"
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {isCreating ? "Creando..." : "Crear y enviar por correo"}
              </button>
            </form>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay invitaciones beta aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  data-testid={`beta-invite-${inv.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{inv.email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.used ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                        {inv.used ? "Usado" : "Activo"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">{inv.code}</span>
                      {inv.note && <span className="text-xs text-muted-foreground">· {inv.note}</span>}
                      <span className="text-xs text-muted-foreground">
                        · {format(new Date(inv.createdAt), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!inv.used && (
                      <button
                        onClick={() => copyToClipboard(getBetaLink(inv), inv.id)}
                        data-testid={`button-copy-link-${inv.id}`}
                        title="Copiar enlace beta"
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === inv.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => deleteInvite(inv.id)}
                      data-testid={`button-delete-invite-${inv.id}`}
                      title="Eliminar invitación"
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-sm text-amber-400 font-medium mb-1">¿Cómo funciona?</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ingresá el correo de quien querés invitar a probar la app</li>
            <li>El sistema genera un código y envía el enlace por correo automáticamente</li>
            <li>Cuando esa persona se registra y crea su despacho, obtiene plan <strong>Pro gratis</strong></li>
            <li>El código se marca como "Usado" una vez que crean su cuenta</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
