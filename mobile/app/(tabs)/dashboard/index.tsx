import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api, type CaseData, type DeadlineData, type DocumentData } from "../../lib/api";
import { useAuthStore } from "../../lib/store";
import { colors, spacing, fontSize, borderRadius } from "../../lib/theme";
import Card from "../../components/Card";
import Badge from "../../components/Badge";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getStatusVariant(status: string): "success" | "warning" | "default" {
  if (status === "active" || status === "activo") return "success";
  if (status === "appeal" || status === "apelacion" || status === "en_apelacion") return "warning";
  return "default";
}

function getUrgencyColor(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return colors.danger;
  if (diffDays <= 3) return colors.warning;
  return colors.accent;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: () => api.cases.list(),
  });

  const deadlinesQuery = useQuery({
    queryKey: ["deadlines"],
    queryFn: () => api.deadlines.list(),
  });

  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.documents.list(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      casesQuery.refetch(),
      deadlinesQuery.refetch(),
      documentsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, []);

  const cases = casesQuery.data || [];
  const deadlines = deadlinesQuery.data || [];
  const documents = documentsQuery.data || [];

  const activeCases = cases.filter(
    (c) => c.status === "active" || c.status === "activo"
  ).length;

  const now = new Date();
  const docsThisMonth = documents.filter((d) => {
    const created = new Date(d.createdAt);
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;

  const pendingSignatures = documents.filter(
    (d) => d.estado === "pendiente_firma"
  ).length;

  const urgentDeadlines = deadlines.filter((d) => {
    const due = new Date(d.dueDate);
    const diffDays = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 3 && d.status !== "completed";
  }).length;

  const recentCases = cases.slice(0, 5);

  const upcomingDeadlines = deadlines
    .filter((d) => new Date(d.dueDate) >= now && d.status !== "completed")
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
    .slice(0, 3);

  const isLoading =
    casesQuery.isLoading || deadlinesQuery.isLoading || documentsQuery.isLoading;

  if (isLoading && !refreshing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.title,
          fontWeight: "700",
          marginBottom: spacing.xs,
        }}
      >
        {getGreeting()}, {user?.name?.split(" ")[0] || "Usuario"}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: fontSize.sm,
          marginBottom: spacing.xl,
        }}
      >
        {new Date().toLocaleDateString("es-CR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.xl }}
        contentContainerStyle={{ gap: spacing.md }}
      >
        <MetricCard
          icon="briefcase-outline"
          label="Casos Activos"
          value={activeCases}
          color={colors.accent}
        />
        <MetricCard
          icon="document-text-outline"
          label="Docs este mes"
          value={docsThisMonth}
          color={colors.info}
        />
        <MetricCard
          icon="pencil-outline"
          label="Firmas Pend."
          value={pendingSignatures}
          color={colors.warning}
        />
        <MetricCard
          icon="alert-circle-outline"
          label="Alertas"
          value={urgentDeadlines}
          color={colors.danger}
          showBadge={urgentDeadlines > 0}
        />
      </ScrollView>

      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.lg,
          fontWeight: "600",
          marginBottom: spacing.md,
        }}
      >
        Casos Recientes
      </Text>
      {recentCases.length === 0 ? (
        <Card style={{ marginBottom: spacing.xl }}>
          <Text style={{ color: colors.muted, fontSize: fontSize.sm, textAlign: "center" }}>
            No hay casos registrados
          </Text>
        </Card>
      ) : (
        <View style={{ marginBottom: spacing.xl, gap: spacing.sm }}>
          {recentCases.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => router.push(`/cases/${c.id}`)}
              activeOpacity={0.7}
            >
              <Card>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: fontSize.md,
                        fontWeight: "600",
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: fontSize.sm,
                      }}
                      numberOfLines={1}
                    >
                      {c.client}
                    </Text>
                  </View>
                  <Badge label={c.status} variant={getStatusVariant(c.status)} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.lg,
          fontWeight: "600",
          marginBottom: spacing.md,
        }}
      >
        Acciones Rápidas
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacing.xl,
          gap: spacing.sm,
        }}
      >
        <QuickAction
          icon="add-circle-outline"
          label="Nuevo Caso"
          onPress={() => router.push("/cases/new")}
        />
        <QuickAction
          icon="document-outline"
          label="Recurso"
          onPress={() => router.push("/cases/new")}
        />
        <QuickAction
          icon="cloud-upload-outline"
          label="Subir Doc"
          onPress={() => router.push("/documents")}
        />
        <QuickAction
          icon="chatbubble-outline"
          label="Chat"
          onPress={() => router.push("/chat")}
        />
      </View>

      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.lg,
          fontWeight: "600",
          marginBottom: spacing.md,
        }}
      >
        Plazos Próximos
      </Text>
      {upcomingDeadlines.length === 0 ? (
        <Card style={{ marginBottom: spacing.xl }}>
          <Text style={{ color: colors.muted, fontSize: fontSize.sm, textAlign: "center" }}>
            No hay plazos próximos
          </Text>
        </Card>
      ) : (
        <View style={{ marginBottom: spacing.xl, gap: spacing.sm }}>
          {upcomingDeadlines.map((d) => {
            const urgencyColor = getUrgencyColor(d.dueDate);
            return (
              <Card key={d.id}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 4,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: urgencyColor,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: fontSize.md,
                        fontWeight: "600",
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {d.description}
                    </Text>
                    <Text
                      style={{ color: colors.muted, fontSize: fontSize.sm }}
                    >
                      Vence: {formatDate(d.dueDate)}
                    </Text>
                  </View>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={urgencyColor}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  showBadge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  showBadge?: boolean;
}) {
  return (
    <Card style={{ width: 140, position: "relative" }}>
      {showBadge && (
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.danger,
          }}
        />
      )}
      <Ionicons
        name={icon}
        size={24}
        color={color}
        style={{ marginBottom: spacing.sm }}
      />
      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.xxl,
          fontWeight: "700",
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: fontSize.xs,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        alignItems: "center",
        gap: spacing.xs,
      }}
    >
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: fontSize.xs,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
