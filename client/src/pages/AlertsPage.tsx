import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Plus, Check, Loader2, AlertTriangle, Clock, X,
  Calendar, Smartphone, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function getDaysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function DaysBadge({ days }: { days: number }) {
  if (days < 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">Vencido</span>;
  if (days === 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">Hoy</span>;
  if (days < 7) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">{days}d</span>;
  if (days < 15) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">{days}d</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">{days}d</span>;
}

function AddDeadlineModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ description: "", dueDate: "" });
  const [saved, setSaved] = useState(false);
  const [calendarEventLink, setCalendarEventLink] = useState<string | null>(null);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  const { data: calStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
  });
  const calendarConnected = calStatus?.connected ?? false;

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/deadlines"] });
      setSaved(true);
      toast.success("Alerta guardada en LexAI CR");
    },
  });

  const syncGoogleCalendar = async () => {
    setSyncingCalendar(true);
    try {
      const res = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `Plazo – ${form.description}`,
          description: form.description,
          date: form.dueDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al sincronizar");
      }
      const data = await res.json();
      setCalendarEventLink(data.eventLink);
      toast.success("Evento creado en Google Calendar con recordatorios");
    } catch (err: any) {
      toast.error(err.message || "Error al sincronizar con Google Calendar");
    } finally {
      setSyncingCalendar(false);
    }
  };

  const downloadICS = () => {
    const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dateStr = form.dueDate.replace(/-/g, "");
    const nextDay = (() => {
      const d = new Date(form.dueDate + "T12:00:00");
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0].replace(/-/g, "");
    })();
    const sevenDaysBefore = (() => {
      const d = new Date(form.dueDate + "T12:00:00");
      d.setDate(d.getDate() - 7);
      return "-P7D";
    })();
    const desc = form.description.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LexAI CR//ES",
      "BEGIN:VEVENT",
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${nextDay}`,
      `SUMMARY:Plazo – ${form.description}`,
      `DESCRIPTION:${desc}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Recordatorio LexAI CR – mañana vence el plazo",
      "END:VALARM",
      "BEGIN:VALARM",
      `TRIGGER:${sevenDaysBefore}`,
      "ACTION:DISPLAY",
      "DESCRIPTION:Recordatorio LexAI CR – faltan 7 días para el plazo",
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Recordatorio LexAI CR – el plazo vence hoy en 2 horas",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plazo-lexai.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo .ics descargado — abrilo en tu app de calendario");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl z-50 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">
            {saved ? "Alerta creada" : "Nueva Alerta"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-deadline-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!saved ? (
            <motion.form
              key="form"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onSubmit={e => { e.preventDefault(); mutate(form); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Descripción *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  required
                  placeholder="Ej. Vencimiento plazo para apelar sentencia"
                  data-testid="input-deadline-description"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Fecha límite *</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  required
                  data-testid="input-deadline-date"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={isPending}
                  data-testid="button-create-deadline"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Crear alerta"}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Alerta guardada en LexAI CR</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(form.dueDate + "T12:00:00"), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Agregar recordatorio externo
              </p>

              {calendarConnected ? (
                calendarEventLink ? (
                  <a
                    href={calendarEventLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-calendar-event"
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    Ver en Google Calendar
                  </a>
                ) : (
                  <button
                    onClick={syncGoogleCalendar}
                    disabled={syncingCalendar}
                    data-testid="button-sync-google-calendar"
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/40 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {syncingCalendar
                      ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      : <Calendar className="w-4 h-4 text-primary" />}
                    Sincronizar con Google Calendar
                    {!syncingCalendar && (
                      <span className="ml-auto text-xs text-muted-foreground">email + popup</span>
                    )}
                  </button>
                )
              ) : (
                <a
                  href="/api/auth/google"
                  data-testid="link-connect-google"
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/40 text-foreground text-sm font-medium transition-colors"
                >
                  <Calendar className="w-4 h-4 text-primary" />
                  Conectar Google Calendar
                  <span className="ml-auto text-xs text-muted-foreground">requiere login</span>
                </a>
              )}

              <button
                onClick={downloadICS}
                data-testid="button-download-ics"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/40 text-foreground text-sm font-medium transition-colors"
              >
                <Smartphone className="w-4 h-4 text-primary" />
                Agregar al calendario del teléfono (.ics)
                <span className="ml-auto text-xs text-muted-foreground">3 alarmas</span>
              </button>

              <button
                onClick={onClose}
                data-testid="button-done-deadline"
                className="w-full py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                Listo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: deadlines = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/deadlines"] });

  const { mutate: markHandled } = useMutation({
    mutationFn: (id: string) => fetch(`/api/deadlines/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "handled" }),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
      toast.success("Alerta marcada como atendida");
    },
  });

  const pending = (deadlines as any[]).filter(d => d.status === "pending").sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const handled = (deadlines as any[]).filter(d => d.status === "handled");

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background overflow-auto">
        <header className="flex-none px-8 py-5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" /> Alertas y Plazos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Vencimientos y fechas límite procesales</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            data-testid="button-add-deadline"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Agregar plazo
          </button>
        </header>

        <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full space-y-8">
          <section>
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Pendientes ({pending.length})
            </h2>
            {isLoading ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              </div>
            ) : pending.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                <p className="font-medium text-foreground">Sin alertas pendientes</p>
                <p className="text-sm mt-1">Todos los plazos están atendidos</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {pending.map((d: any, i: number) => {
                  const days = getDaysUntil(d.dueDate);
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-4 px-5 py-4 ${i < pending.length - 1 ? "border-b border-border" : ""}`}
                      data-testid={`deadline-item-${i}`}
                    >
                      <Clock className={`w-5 h-5 shrink-0 ${days < 7 ? "text-red-400" : days < 15 ? "text-yellow-400" : "text-emerald-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{d.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(d.dueDate), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                      <DaysBadge days={days} />
                      <button
                        onClick={() => markHandled(d.id)}
                        data-testid={`button-mark-handled-${i}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Atender
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {handled.length > 0 && (
            <section>
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Atendidos ({handled.length})
              </h2>
              <div className="rounded-2xl border border-border bg-card overflow-hidden opacity-60">
                {handled.slice(0, 5).map((d: any, i: number) => (
                  <div key={d.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < Math.min(handled.length, 5) - 1 ? "border-b border-border" : ""}`}>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground line-through">{d.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(d.dueDate), "d MMM", { locale: es })}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && <AddDeadlineModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </DashboardLayout>
  );
}
