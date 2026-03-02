import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FileText, FileCheck, FilePen, File } from "lucide-react-native";
import { api, type DocumentData } from "../../../lib/api";
import { colors, spacing, fontSize, borderRadius } from "../../../lib/theme";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";
import EmptyState from "../../../components/EmptyState";

const FILTERS = ["Todos", "Recursos", "Contratos", "Otro"] as const;
type FilterType = (typeof FILTERS)[number];

const filterMap: Record<FilterType, string | null> = {
  Todos: null,
  Recursos: "recurso",
  Contratos: "contrato",
  Otro: "otro",
};

function getStatusVariant(estado: string): "info" | "warning" | "success" | "default" {
  switch (estado) {
    case "borrador": return "info";
    case "pendiente_firma": return "warning";
    case "firmado": return "success";
    default: return "default";
  }
}

function getStatusLabel(estado: string): string {
  switch (estado) {
    case "borrador": return "Borrador";
    case "pendiente_firma": return "Pendiente Firma";
    case "firmado": return "Firmado";
    default: return estado;
  }
}

function getTypeConfig(tipo: string): { label: string; variant: "danger" | "info" | "default"; icon: any; color: string } {
  switch (tipo) {
    case "recurso": return { label: "Recurso", variant: "danger", icon: FilePen, color: colors.danger };
    case "contrato": return { label: "Contrato", variant: "info", icon: FileCheck, color: colors.info };
    default: return { label: "Otro", variant: "default", icon: File, color: colors.muted };
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function DocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterType>("Todos");

  const { data: documents, isLoading, refetch, isRefetching } = useQuery<DocumentData[]>({
    queryKey: ["documents"],
    queryFn: () => api.documents.list(),
  });

  const filteredDocs = documents?.filter((doc) => {
    const typeFilter = filterMap[activeFilter];
    return !typeFilter || doc.tipo === typeFilter;
  });

  const renderDocument = useCallback(({ item }: { item: DocumentData }) => {
    const typeConfig = getTypeConfig(item.tipo);
    const TypeIcon = typeConfig.icon;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push(`/documents/${item.id}` as any)}
        style={styles.docItem}
      >
        <Card style={styles.docCard}>
          <View style={styles.docRow}>
            <View style={[styles.docIcon, { backgroundColor: `${typeConfig.color}18` }]}>
              <TypeIcon size={18} color={typeConfig.color} strokeWidth={1.8} />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle} numberOfLines={2}>{item.titulo}</Text>
              <View style={styles.docBadges}>
                <Badge label={typeConfig.label} variant={typeConfig.variant} />
                <Badge label={getStatusLabel(item.estado)} variant={getStatusVariant(item.estado)} />
              </View>
              <Text style={styles.docDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [router]);

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.title}>Documentos</Text>
        {documents && (
          <Text style={styles.subtitle}>{documents.length} {documents.length === 1 ? "documento" : "documentos"}</Text>
        )}
      </View>

      {/* ── Filters ────────────────────────────── */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS as unknown as FilterType[]}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = activeFilter === item;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveFilter(item)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Content ────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          renderItem={renderDocument}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={FileText}
              title="Sin documentos"
              description="No se encontraron documentos en esta categoría."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: fontSize.sm, marginTop: 2 },

  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "500" },
  filterTextActive: { color: "#fff", fontWeight: "700" },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.xs },
  docItem: { marginBottom: spacing.sm },
  docCard: { padding: 14 },
  docRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  docInfo: { flex: 1, gap: 6 },
  docTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", lineHeight: 22 },
  docBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  docDate: { color: colors.muted, fontSize: fontSize.xs },
});
