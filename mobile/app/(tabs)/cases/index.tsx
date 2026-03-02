import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Search, ChevronRight, Briefcase, Plus } from "lucide-react-native";
import { api, CaseData } from "../../../lib/api";
import { colors, spacing, fontSize, borderRadius } from "../../../lib/theme";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";
import EmptyState from "../../../components/EmptyState";
import FAB from "../../../components/FAB";

type FilterStatus = "all" | "active" | "appeal" | "closed";

const filterOptions: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Activo" },
  { key: "appeal", label: "Apelación" },
  { key: "closed", label: "Cerrado" },
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
    case "active": return "Activo";
    case "appeal": return "En Apelación";
    case "closed": return "Cerrado";
    default: return status;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CasesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const { data: cases, isLoading, refetch, isRefetching } = useQuery<CaseData[]>({
    queryKey: ["/api/cases"],
    queryFn: () => api.cases.list(),
  });

  const filteredCases = (cases || []).filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.client.toLowerCase().includes(search.toLowerCase());
    if (filter === "active") return matchesSearch && ["active", "activo"].includes(c.status.toLowerCase());
    if (filter === "appeal") return matchesSearch && ["appeal", "apelacion", "en apelación"].includes(c.status.toLowerCase());
    if (filter === "closed") return matchesSearch && ["closed", "cerrado"].includes(c.status.toLowerCase());
    return matchesSearch;
  });

  const renderCaseItem = useCallback(({ item }: { item: CaseData }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push(`/cases/${item.id}` as any)}
      style={styles.caseItem}
    >
      <Card style={styles.caseCard}>
        <View style={styles.caseRow}>
          <View style={styles.caseIcon}>
            <Briefcase size={16} color={colors.accent} strokeWidth={1.8} />
          </View>
          <View style={styles.caseInfo}>
            <Text style={styles.caseName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.caseClient} numberOfLines={1}>{item.client}</Text>
            <View style={styles.caseMeta}>
              <Badge label={getStatusLabel(item.status)} variant={getStatusVariant(item.status)} />
              <Text style={styles.caseDate}>{formatDate(item.updatedAt || item.createdAt)}</Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.muted} strokeWidth={1.8} />
        </View>
      </Card>
    </TouchableOpacity>
  ), [router]);

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.title}>Casos</Text>
        <Text style={styles.subtitle}>
          {filteredCases.length} {filteredCases.length === 1 ? "caso" : "casos"}
        </Text>
      </View>

      {/* ── Search ─────────────────────────────── */}
      <View style={styles.searchWrap}>
        <Search size={16} color={colors.muted} strokeWidth={1.8} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o cliente..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      {/* ── Filters ────────────────────────────── */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filterOptions}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              activeOpacity={0.7}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── List ───────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : filteredCases.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No hay casos"
          description={search || filter !== "all" ? "No se encontraron casos con los filtros aplicados" : "Creá tu primer caso para comenzar"}
        />
      ) : (
        <FlatList
          data={filteredCases}
          keyExtractor={(item) => item.id}
          renderItem={renderCaseItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} colors={[colors.accent]} />
          }
        />
      )}

      <FAB icon={Plus} onPress={() => router.push("/cases/new" as any)} />
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

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },

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

  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: spacing.sm },
  caseItem: { marginBottom: spacing.sm },
  caseCard: { padding: 14 },
  caseRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  caseIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  caseInfo: { flex: 1, gap: 3 },
  caseName: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  caseClient: { color: colors.muted, fontSize: fontSize.sm },
  caseMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
  caseDate: { color: colors.muted, fontSize: fontSize.xs },
});
