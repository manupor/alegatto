import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2, Users, CheckCircle, XCircle, LogIn } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface InviteData {
  invite: {
    id: string;
    email: string;
    role: string;
    token: string;
    createdAt: string;
  };
  orgName: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  senior: "Abogado Senior",
  junior: "Abogado Junior",
  assistant: "Asociado",
  intern: "Pasante",
  readonly: "Solo lectura",
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.message && !data.invite) {
          setError(data.message);
        } else {
          setInviteData(data);
        }
      })
      .catch(() => setError("No se pudo cargar la invitación"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (!res.ok) {
        setError(data.message || "Error al aceptar la invitación");
        return;
      }
      setSuccess(true);
      // Invalidate org context + auth so dashboard loads the new org
      await queryClient.invalidateQueries({ queryKey: ["/api/org/context"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.refetchQueries({ queryKey: ["/api/org/context"] });
      setTimeout(() => setLocation("/dashboard"), 1500);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setAccepting(false);
    }
  };

  const goToLogin = () => {
    setLocation(`/auth?redirect=/invite/${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Alegatto</h1>
          <p className="text-muted-foreground text-sm mt-1">Plataforma Legal con IA</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {error ? (
            <div className="text-center">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Invitación no válida</h2>
              <p className="text-muted-foreground text-sm mb-6">{error}</p>
              <button
                onClick={() => setLocation("/auth")}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : success ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">¡Bienvenido al equipo!</h2>
              <p className="text-muted-foreground text-sm">
                Te has unido a <strong>{inviteData?.orgName}</strong> correctamente.
                <br />Redirigiendo al dashboard…
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-4" />
            </div>
          ) : authRequired ? (
            <div className="text-center">
              <LogIn className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Inicia sesión primero</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Debes iniciar sesión o crear una cuenta para unirte a <strong>{inviteData?.orgName}</strong>.
              </p>
              <button
                onClick={goToLogin}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Iniciar sesión / Registrarse
              </button>
            </div>
          ) : inviteData ? (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Invitación al equipo</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Has sido invitado a unirte al despacho en Alegatto.
              </p>

              <div className="bg-background rounded-xl border border-border p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Despacho</span>
                  <span className="text-sm font-semibold text-foreground">{inviteData.orgName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rol asignado</span>
                  <span className="text-sm font-medium text-primary">
                    {ROLE_LABELS[inviteData.invite.role] ?? inviteData.invite.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Para</span>
                  <span className="text-sm text-foreground">{inviteData.invite.email}</span>
                </div>
              </div>

              <button
                onClick={handleAccept}
                disabled={accepting}
                data-testid="button-accept-invite"
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
              >
                {accepting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</>
                ) : (
                  "Aceptar invitación"
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Solo el administrador del despacho puede modificar roles y perfiles de los miembros.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
