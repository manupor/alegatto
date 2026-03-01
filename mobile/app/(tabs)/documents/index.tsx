import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
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
    case "borrador":
      return "info";
    case "pendiente_firma":
      return "warning";
    case "firmado":
      return "success";
    default:
      return "default";
  }
}

function getStatusLabel(estado: string): string {
  switch (estado) {
    case "borrador":
      return "Borrador";
    case "pendiente_firma":
      return "Pendiente Firma";
    case "firmado":
      return "Firmado";
    default:
      return estado;
  }
}

function getTypeLabel(tipo: string): string {
  switch (tipo) {
    case "recurso":
      return "Recurso";
    case "contrato":
      return "Contrato";
    case "otro":
      return "Otro";
    default:
      return tipo;
  }
}

function getTypeVariant(tipo: string): "danger" | "info" | "default" {
  switch (tipo) {
    case "recurso":
      return "danger";
    case "contrato":
      return "info";
    default:
      return "default";
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function DocumentsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>("Todos");

  const {
    data: documents,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<DocumentData[]>({
    queryKey: ["documents"],
    queryFn: () => api.documents.list(),
  });

  const filteredDocs = documents?.filter((doc) => {
    const typeFilter = filterMap[activeFilter];
    if (!typeFilter) return true;
    return doc.tipo === typeFilter;
  });

  const renderDocument = useCallback(
    ({ item }: { item: DocumentData }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/documents/${item.id}` as any)}
      >
        <Card style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.lg,
              fontWeight: "600",
              marginBottom: spacing.sm,
            }}
            numberOfLines={2}
          >
            {item.titulo}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.sm,
              marginBottom: spacing.sm,
            }}
          >
            <Badge label={getTypeLabel(item.tipo)} variant={getTypeVariant(item.tipo)} />
            <Badge label={getStatusLabel(item.estado)} variant={getStatusVariant(item.estado)} />
          </View>
          <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
            {formatDate(item.createdAt)}
          </Text>
        </Card>
      </TouchableOpacity>
    ),
    [router]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: fontSize.xxl,
            fontWeight: "700",
          }}
        >
          Documentos
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          paddingBottom: spacing.md,
        }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            activeOpacity={0.7}
            onPress={() => setActiveFilter(f)}
            style={{
              backgroundColor: activeFilter === f ? colors.accent : colors.card,
              borderRadius: borderRadius.full,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
            }}
          >
            <Text
              style={{
                color: activeFilter === f ? "#ffffff" : colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: "600",
              }}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          renderItem={renderDocument}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={FileText}
              title="Sin documentos"
              description="No se encontraron documentos en esta categoria."
            />
          }
        />
      )}
    </View>
  );
}
