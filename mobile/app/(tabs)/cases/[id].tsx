import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  User,
  Scale,
  Hash,
  Clock,
  FileText,
  StickyNote,
  PlusCircle,
} from "lucide-react-native";
import { api, CaseData } from "../../../lib/api";
import { colors, spacing, fontSize, borderRadius } from "../../../lib/theme";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";

type TabKey = "timeline" | "documents" | "notes";

const tabs: { key: TabKey; label: string }[] = [
  { key: "timeline", label: "Línea de Tiempo" },
  { key: "documents", label: "Documentos" },
  { key: "notes", label: "Notas" },
];

function getStatusVariant(status: string): "success" | "warning" | "default" {
  switch (status.toLowerCase()) {
    case "active":
    case "activo":
      return "success";
    case "appeal":
    case "apelacion":
    case "en apelación":
      return "warning";
    default:
      return "default";
  }
}

function getStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "Activo";
    case "appeal":
      return "En Apelación";
    case "closed":
      return "Cerrado";
    default:
      return status;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("timeline");
  const [newNote, setNewNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const {
    data: caseData,
    isLoading,
  } = useQuery<CaseData>({
    queryKey: ["/api/cases", id],
    queryFn: () => api.cases.get(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CaseData>) => api.cases.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim() || !caseData) return;
    const existingNotes = caseData.notes || "";
    const timestamp = new Date().toISOString();
    const noteEntry = `[${timestamp}] ${newNote.trim()}`;
    const updatedNotes = existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry;

    updateMutation.mutate(
      { notes: updatedNotes },
      {
        onSuccess: () => {
          setNewNote("");
          setShowNoteInput(false);
        },
        onError: () => {
          Alert.alert("Error", "No se pudo agregar la nota");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!caseData) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.muted, fontSize: fontSize.lg }}>Caso no encontrado</Text>
      </View>
    );
  }

  const noteLines = (caseData.notes || "")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  const timelineEntries = [
    { date: caseData.createdAt, description: "Caso creado" },
    ...(caseData.updatedAt && caseData.updatedAt !== caseData.createdAt
      ? [{ date: caseData.updatedAt, description: "Última actualización" }]
      : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          gap: spacing.md,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}
            numberOfLines={1}
          >
            {caseData.name}
          </Text>
        </View>
        <Badge label={getStatusLabel(caseData.status)} variant={getStatusVariant(caseData.status)} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <User size={16} color={colors.muted} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Cliente</Text>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "500", marginLeft: "auto" }}>
                {caseData.client}
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Scale size={16} color={colors.muted} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Área</Text>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "500", marginLeft: "auto" }}>
                {caseData.legalArea}
              </Text>
            </View>
            {caseData.caseNumber ? (
              <>
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Hash size={16} color={colors.muted} />
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Expediente</Text>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "500", marginLeft: "auto" }}>
                    {caseData.caseNumber}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </Card>

        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.card,
            borderRadius: borderRadius.md,
            padding: 3,
            marginBottom: spacing.lg,
            gap: 3,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.sm,
                  backgroundColor: isActive ? colors.accent : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: isActive ? colors.text : colors.muted,
                    fontSize: fontSize.sm,
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "timeline" && (
          <View style={{ gap: 0 }}>
            {timelineEntries.map((entry, idx) => (
              <View key={idx} style={{ flexDirection: "row", gap: spacing.md, minHeight: 60 }}>
                <View style={{ alignItems: "center", width: 20 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: idx === 0 ? colors.accent : colors.muted,
                      marginTop: 4,
                    }}
                  />
                  {idx < timelineEntries.length - 1 && (
                    <View
                      style={{
                        width: 2,
                        flex: 1,
                        backgroundColor: colors.border,
                        marginTop: 4,
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1, paddingBottom: spacing.lg }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "500" }}>
                    {entry.description}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: fontSize.xs, marginTop: 2 }}>
                    {formatDate(entry.date)} - {formatTime(entry.date)}
                  </Text>
                </View>
              </View>
            ))}
            {timelineEntries.length === 0 && (
              <Text style={{ color: colors.muted, fontSize: fontSize.md, textAlign: "center", paddingVertical: spacing.xl }}>
                No hay eventos en la línea de tiempo
              </Text>
            )}
          </View>
        )}

        {activeTab === "documents" && (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxl }}>
            <FileText size={40} color={colors.muted} strokeWidth={1.5} />
            <Text style={{ color: colors.muted, fontSize: fontSize.md, marginTop: spacing.md }}>
              Documentos asociados al caso
            </Text>
            <Text style={{ color: colors.muted, fontSize: fontSize.sm, marginTop: spacing.xs }}>
              Próximamente
            </Text>
          </View>
        )}

        {activeTab === "notes" && (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
                Notas
              </Text>
              <TouchableOpacity
                onPress={() => setShowNoteInput(!showNoteInput)}
                activeOpacity={0.7}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}
              >
                <PlusCircle size={18} color={colors.accent} />
                <Text style={{ color: colors.accent, fontSize: fontSize.sm, fontWeight: "500" }}>
                  Agregar
                </Text>
              </TouchableOpacity>
            </View>

            {showNoteInput && (
              <Card>
                <TextInput
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Escribe una nota..."
                  placeholderTextColor={colors.muted}
                  multiline
                  style={{
                    color: colors.text,
                    fontSize: fontSize.md,
                    minHeight: 80,
                    textAlignVertical: "top",
                    marginBottom: spacing.md,
                  }}
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowNoteInput(false);
                      setNewNote("");
                    }}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.sm,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddNote}
                    activeOpacity={0.7}
                    disabled={updateMutation.isPending || !newNote.trim()}
                    style={{
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.sm,
                      borderRadius: borderRadius.md,
                      backgroundColor: newNote.trim() ? colors.accent : colors.border,
                    }}
                  >
                    {updateMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: "600" }}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {noteLines.length > 0 ? (
              noteLines.map((line, idx) => {
                const timestampMatch = line.match(/^\[(.+?)\]\s*(.+)$/);
                const noteText = timestampMatch ? timestampMatch[2] : line;
                const noteDate = timestampMatch ? timestampMatch[1] : null;

                return (
                  <Card key={idx}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
                      <StickyNote size={16} color={colors.muted} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: fontSize.md }}>{noteText}</Text>
                        {noteDate && (
                          <Text style={{ color: colors.muted, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                            {formatDate(noteDate)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })
            ) : (
              <Text style={{ color: colors.muted, fontSize: fontSize.md, textAlign: "center", paddingVertical: spacing.xl }}>
                No hay notas aún
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push("/cases/new" as any)}
          activeOpacity={0.7}
          style={{
            backgroundColor: colors.accent,
            borderRadius: borderRadius.md,
            paddingVertical: spacing.md,
            alignItems: "center",
            marginTop: spacing.xl,
          }}
        >
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
            Generar Recurso
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
