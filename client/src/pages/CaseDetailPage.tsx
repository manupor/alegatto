import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, Plus, Calendar, FileText, MessageSquare,
  StickyNote, Loader2, Gavel, Clock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    appeal: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    closed: "bg-secondary/50 text-muted-foreground border-border",
    archived: "bg-secondary/30 text-muted-foreground border-border",
  };
  const labels: Record<string, string> = { active: "Activo", appeal: "En recurso", closed: "Cerrado", archived: "Archivado" };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${map[status] || map.closed}`}>{labels[status] || status}</span>;
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newEvent, setNewEvent] = useState({ description: "", eventDate: "" });
  const [newNote, setNewNote] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);

  const { data: caseData, isLoading } = useQuery<any>({
    queryKey: ["/api/cases", id],
    queryFn: () => fetch(`/api/cases/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  const { mutate: addEvent, isPending: addingEvent } = useMutation({
    mutationFn: (data: any) => fetch(`/api/cases/${id}/events`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      setNewEvent({ description: "", eventDate: "" });
      setShowEventForm(false);
      toast.success("Evento agregado");
    },
  });

  const { mutate: addNote, isPending: addingNote } = useMutation({
    mutationFn: (data: any) => fetch(`/api/cases/${id}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      setNewNote("");
      toast.success("Nota guardada");
    },
  });

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!caseData) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-full text-muted-foreground">Expediente no encontrado</div>
    </DashboardLayout>
  );

  const events: any[] = caseData.events || [];
  const notes: any[] = caseData.notes || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background overflow-auto">
        <header className="flex-none px-8 py-5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center gap-4">
          <Link href="/dashboard/cases" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{caseData.name}</h1>
              <StatusBadge status={caseData.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {caseData.client} • {caseData.legalArea}
              {caseData.caseNumber && ` • Exp. ${caseData.caseNumber}`}
            </p>
          </div>
          <Link href={`/dashboard/appeals/new`}>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
              <Gavel className="w-4 h-4" /> Generar recurso
            </button>
          </Link>
        </header>

        <div className="flex-1 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto w-full">
          {/* Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Línea de tiempo
              </h2>
              <button onClick={() => setShowEventForm(v => !v)}
                data-testid="button-add-event"
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
                <Plus className="w-4 h-4" /> Evento
              </button>
            </div>

            <AnimatePresence>
              {showEventForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                  onSubmit={e => { e.preventDefault(); if (newEvent.description && newEvent.eventDate) addEvent(newEvent); }}
                >
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <input value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                      placeholder="Descripción del evento" required
                      data-testid="input-event-description"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <input type="date" value={newEvent.eventDate} onChange={e => setNewEvent(p => ({ ...p, eventDate: e.target.value }))}
                      required data-testid="input-event-date"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowEventForm(false)}
                        className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                      <button type="submit" disabled={addingEvent}
                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                        {addingEvent ? "Guardando…" : "Agregar"}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {events.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay eventos en la línea de tiempo</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" />
                <div className="space-y-4">
                  {events.map((e: any, i: number) => (
                    <div key={e.id} className="flex gap-4 items-start" data-testid={`event-item-${i}`}>
                      <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center z-10">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 rounded-xl border border-border bg-card p-3">
                        <p className="text-sm text-foreground">{e.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(e.eventDate), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <StickyNote className="w-4 h-4 text-primary" /> Notas internas
            </h2>
            <form onSubmit={e => { e.preventDefault(); if (newNote.trim()) addNote({ content: newNote }); }}
              className="mb-4">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                placeholder="Escribe una nota privada sobre este expediente…"
                rows={3} data-testid="textarea-new-note"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2" />
              <button type="submit" disabled={!newNote.trim() || addingNote}
                data-testid="button-save-note"
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
                {addingNote ? "Guardando…" : "Guardar nota"}
              </button>
            </form>

            {notes.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
                <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No hay notas aún
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((n: any, i: number) => (
                  <div key={n.id} className="rounded-xl border border-border bg-card p-4" data-testid={`note-item-${i}`}>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(n.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
