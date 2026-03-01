import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrgContext } from "@/hooks/use-org";
import {
  Users, Plus, Trash2, Shield, Mail, Copy, Check,
  ChevronDown, Loader2, X, UserMinus, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";

const ROLES = ["admin", "senior", "assistant", "intern"] as const;
type Role = typeof ROLES[number];

const ROLE_CONFIG: Record<Role, { label: string; color: string }> = {
  admin: { label: "Administrador", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  senior: { label: "Senior", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  assistant: { label: "Asociado", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  intern: { label: "Pasante", color: "bg-secondary/50 text-muted-foreground border-border" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as Role] ?? ROLE_CONFIG.intern;
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${cfg.color}`}>{cfg.label}</span>;
}

function InviteModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("assistant");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const { mutate: invite, isPending } = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      fetch("/api/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/invites"] });
      setInviteLink(data.inviteLink);
      toast.success("Invitación creada");
    },
    onError: () => toast.error("Error al crear invitación"),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Enlace copiado");
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl z-50 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Invitar miembro</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {!inviteLink ? (
          <form onSubmit={e => { e.preventDefault(); invite({ email, role }); }} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Correo electrónico *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                placeholder="abogado@despacho.cr" data-testid="input-invite-email"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Rol</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)}
                data-testid="select-invite-role"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                {ROLES.map(r => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
              <button type="submit" disabled={isPending}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Crear invitación"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-medium text-foreground text-sm">Invitación creada</p>
              <p className="text-xs text-muted-foreground mt-1">Comparte este enlace con <strong>{email}</strong></p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 flex items-center gap-2">
              <p className="flex-1 text-xs text-muted-foreground truncate font-mono">{inviteLink}</p>
              <button onClick={copyLink}
                className="shrink-0 p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Cerrar
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

function ConfirmRemoveModal({ memberName, onConfirm, onClose }: { memberName: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl z-50 p-6 text-center">
        <UserMinus className="w-10 h-10 text-destructive mx-auto mb-3" />
        <h2 className="font-semibold text-foreground mb-1">¿Eliminar miembro?</h2>
        <p className="text-sm text-muted-foreground mb-5">Se eliminará a <strong>{memberName}</strong> del despacho. Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <button onClick={onConfirm} data-testid="button-confirm-remove"
            className="flex-1 py-2.5 rounded-lg bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 transition-colors">Eliminar</button>
        </div>
      </motion.div>
    </>
  );
}

export default function TeamPage() {
  const { isAdmin, org, isLoading: orgLoading } = useOrgContext();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  const { data: members = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ["/api/org/members"],
    queryFn: () => fetch("/api/org/members", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: isAdmin,
  });

  const { data: invites = [] } = useQuery<any[]>({
    queryKey: ["/api/org/invites"],
    queryFn: () => fetch("/api/org/invites", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: isAdmin,
  });

  const { mutate: changeRole } = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      fetch(`/api/org/members/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/members"] });
      toast.success("Rol actualizado");
    },
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/org/members/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/members"] });
      toast.success("Miembro eliminado");
      setConfirmRemove(null);
    },
  });

  const { mutate: deleteInvite } = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/org/invites/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/invites"] });
      toast.success("Invitación cancelada");
    },
  });

  if (!orgLoading && !isAdmin) {
    toast.error("Acceso denegado");
    setLocation("/dashboard");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background overflow-auto">
        <header className="flex-none px-8 py-5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Gestión de Equipo
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {org?.name} — Miembros y permisos
            </p>
          </div>
          <button onClick={() => setShowInviteModal(true)} data-testid="button-invite-member"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <Plus className="w-4 h-4" /> Invitar miembro
          </button>
        </header>

        <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">
          {/* Members */}
          <section>
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Miembros activos ({(members as any[]).length})
            </h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {membersLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                </div>
              ) : (members as any[]).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No hay miembros todavía</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {(members as any[]).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-4 px-5 py-4" data-testid={`member-row-${m.id}`}>
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {m.user?.name?.charAt(0)?.toUpperCase() || m.user?.email?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{m.user?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {m.user?.email}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(m.createdAt), "d MMM yyyy", { locale: es })}
                      </p>
                      <select
                        value={m.role}
                        onChange={e => changeRole({ id: m.id, role: e.target.value })}
                        data-testid={`select-role-${m.id}`}
                        className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
                      </select>
                      <button
                        onClick={() => setConfirmRemove({ id: m.id, name: m.user?.name || m.user?.email || "miembro" })}
                        data-testid={`button-remove-member-${m.id}`}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Role permissions reference */}
          <section>
            <h2 className="font-semibold text-foreground mb-4">Permisos por rol</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ROLES.map(r => {
                const perms: Record<Role, string[]> = {
                  admin: ["Todo incluido", "Analíticas", "Gestión de equipo", "Facturación"],
                  senior: ["Expedientes", "Documentos", "Recursos IA", "Chat IA"],
                  assistant: ["Propios expedientes", "Propios documentos", "Chat IA"],
                  intern: ["Vista de expedientes asignados"],
                };
                return (
                  <div key={r} className="rounded-xl border border-border bg-card p-4">
                    <RoleBadge role={r} />
                    <ul className="mt-3 space-y-1.5">
                      {perms[r].map(p => (
                        <li key={p} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-primary shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pending invites */}
          {(invites as any[]).length > 0 && (
            <section>
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Invitaciones pendientes ({(invites as any[]).length})
              </h2>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {(invites as any[]).map((inv: any, i: number) => (
                  <div key={inv.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < (invites as any[]).length - 1 ? "border-b border-border" : ""}`}>
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{inv.email}</p>
                    </div>
                    <RoleBadge role={inv.role} />
                    <button onClick={() => deleteInvite(inv.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showInviteModal && org && <InviteModal orgId={org.id} onClose={() => setShowInviteModal(false)} />}
        {confirmRemove && (
          <ConfirmRemoveModal
            memberName={confirmRemove.name}
            onConfirm={() => removeMember(confirmRemove.id)}
            onClose={() => setConfirmRemove(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
