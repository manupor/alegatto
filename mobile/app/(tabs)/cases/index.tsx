import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
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
  { key: "appeal", label: "En Apelación" },
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

function getLegalAreaVariant(area: string): string {
  const map: Record<string, string> = {
    penal: "penal",
    civil: "civil",
    laboral: "laboral",
    comercial: "comercial",
    constitucional: "constitucional",
    administrativo: "administrativo",
    transito: "transito",
    tránsito: "transito",
  };
  return map[area.toLowerCase()] || "info";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CasesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const {
    data: cases,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<CaseData[]>({
    queryKey: ["/api/cases"],
    queryFn: () => api.cases.list(),
  });

  const filteredCases = (cases || []).filter((c) => {
    const matchesSearch =
      search.length === 0 ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.client.toLowerCase().includes(search.toLowerCase());

    let matchesFilter = true;
    if (filter === "active") {
      matchesFilter = c.status.toLowerCase() === "active" || c.status.toLowerCase() === "activo";
    } else if (filter === "appeal") {
      matchesFilter =
        c.status.toLowerCase() === "appeal" ||
        c.status.toLowerCase() === "apelacion" ||
        c.status.toLowerCase() === "en apelación";
    } else if (filter === "closed") {
      matchesFilter = c.status.toLowerCase() === "closed" || c.status.toLowerCase() === "cerrado";
    }

    return matchesSearch && matchesFilter;
  });

  const renderCaseItem = useCallback(
    ({ item }: { item: CaseData }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/cases/${item.id}` as any)}
        style={{ marginBottom: spacing.md }}
      >
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
                <Text
                  style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600", flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Badge label={item.legalArea} variant={getLegalAreaVariant(item.legalArea) as any} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                {item.client}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }}>
                <Badge label={getStatusLabel(item.status)} variant={getStatusVariant(item.status)} />
                <Text style={{ color: colors.muted, fontSize: fontSize.xs }}>
                  {formatDate(item.updatedAt || item.createdAt)}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.muted} style={{ marginTop: 4 }} />
          </View>
        </Card>
      </TouchableOpacity>
    ),
    [router]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: "700" }}>
          Casos
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBg,
          borderRadius: borderRadius.md,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Search size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar casos..."
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.md,
            paddingVertical: spacing.md,
          }}
        />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => {
            const isActive = filter === item.key;
            return (
              <TouchableOpacity
                onPress={() => setFilter(item.key)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.full,
                  backgroundColor: isActive ? colors.accent : colors.card,
                }}
              >
                <Text
                  style={{
                    color: isActive ? colors.text : colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : filteredCases.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No hay casos"
          description={search || filter !== "all" ? "No se encontraron casos con los filtros aplicados" : "Crea tu primer caso para comenzar"}
        />
      ) : (
        <FlatList
          data={filteredCases}
          keyExtractor={(item) => item.id}
          renderItem={renderCaseItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      <FAB icon={Plus} onPress={() => router.push("/cases/new" as any)} />
    </View>
  );
}
