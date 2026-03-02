import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, FileText, PenLine, AlertCircle,
  Plus, MessageSquare, Upload, Scale,
  ChevronRight, Clock, Bell,
} from "lucide-react-native";
import { api, type CaseData, type DeadlineData, type DocumentData } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import { colors, spacing, fontSize, borderRadius, shadows } from "../../../lib/theme";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
}

function getStatusVariant(status: string): "success" | "warning" | "default" {
  if (status === "active" || status === "activo") return "success";
  if (status === "appeal" || status === "apelacion" || status === "en_apelacion") return "warning";
  return "default";
}

function getUrgencyColor(dueDate: string): string {
  const diffDays = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return colors.danger;
  if (diffDays <= 3) return colors.warning;
  return colors.accent;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const casesQ = useQuery({ queryKey: ["cases"], queryFn: () => api.cases.list() });
  const deadlinesQ = useQuery({ queryKey: ["deadlines"], queryFn: () => api.deadlines.list() });
  const documentsQ = useQuery({ queryKey: ["documents"], queryFn: () => api.documents.list() });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([casesQ.refetch(), deadlinesQ.refetch(), documentsQ.refetch()]);
    setRefreshing(false);
  }, []);

  const cases = casesQ.data || [];
  const deadlines = deadlinesQ.data || [];
  const documents = documentsQ.data || [];
  const now = new Date();

  const activeCases = cases.filter((c) => ["active", "activo"].includes(c.status)).length;
  const docsThisMonth = documents.filter((d) => {
    const cr = new Date(d.createdAt);
    return cr.getMonth() === now.getMonth() && cr.getFullYear() === now.getFullYear();
  }).length;
  const pendingSignatures = documents.filter((d) => d.estado === "pendiente_firma").length;
  const urgentDeadlines = deadlines.filter((d) => {
    const diff = Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / 86400000);
    return diff <= 3 && d.status !== "completed";
  }).length;

  const recentCases = cases.slice(0, 4);
  const upcomingDeadlines = deadlines
    .filter((d) => new Date(d.dueDate) >= now && d.status !== "completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  const isLoading = casesQ.isLoading && deadlinesQ.isLoading && documentsQ.isLoading;

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Header ───────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name?.split(" ")[0] || "Usuario"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Bell size={20} color={colors.textSecondary} strokeWidth={1.8} />
          {urgentDeadlines > 0 && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Date strip ───────────────────────────── */}
        <Text style={styles.dateText}>
          {now.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}
        </Text>

        {/* ── Metrics 2x2 grid ─────────────────────── */}
        <View style={styles.metricsGrid}>
          <MetricCard icon={Briefcase} label="Casos Activos" value={activeCases} color={colors.accent} bg={colors.accentSoft} />
          <MetricCard icon={FileText} label="Docs del mes" value={docsThisMonth} color={colors.info} bg={colors.infoSoft} />
          <MetricCard icon={PenLine} label="Firmas Pend." value={pendingSignatures} color={colors.warning} bg={colors.warningSoft} badge={pendingSignatures > 0} />
          <MetricCard icon={AlertCircle} label="Alertas" value={urgentDeadlines} color={colors.danger} bg={colors.dangerSoft} badge={urgentDeadlines > 0} />
        </View>

        {/* ── Quick Actions ─────────────────────────── */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction icon={Plus} label="Nuevo Caso" color={colors.accent} bg={colors.accentSoft} onPress={() => router.push("/cases/new")} />
          <QuickAction icon={Scale} label="Recurso" color="#a855f7" bg="rgba(168,85,247,0.1)" onPress={() => router.push("/chat")} />
          <QuickAction icon={MessageSquare} label="Chat IA" color={colors.info} bg={colors.infoSoft} onPress={() => router.push("/chat")} />
          <QuickAction icon={Upload} label="Subir Doc" color={colors.warning} bg={colors.warningSoft} onPress={() => router.push("/documents")} />
        </View>

        {/* ── Recent Cases ─────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Casos Recientes</Text>
          <TouchableOpacity onPress={() => router.push("/cases")} activeOpacity={0.7}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {recentCases.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay casos registrados aún</Text>
          </Card>
        ) : (
          <View style={styles.listGap}>
            {recentCases.map((c) => (
              <TouchableOpacity key={c.id} activeOpacity={0.7} onPress={() => router.push(`/cases/${c.id}` as any)}>
                <Card style={styles.caseCard}>
                  <View style={styles.caseRow}>
                    <View style={styles.caseIconWrap}>
                      <Briefcase size={16} color={colors.accent} strokeWidth={1.8} />
                    </View>
                    <View style={styles.caseInfo}>
                      <Text style={styles.caseName} numberOfLines={1}>{c.name}</Text>
                      <Text style={styles.caseClient} numberOfLines={1}>{c.client}</Text>
                    </View>
                    <View style={styles.caseMeta}>
                      <Badge label={c.status} variant={getStatusVariant(c.status)} />
                      <ChevronRight size={14} color={colors.muted} style={{ marginTop: 4 }} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Upcoming Deadlines ───────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Plazos Próximos</Text>
        </View>

        {upcomingDeadlines.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay plazos próximos</Text>
          </Card>
        ) : (
          <View style={styles.listGap}>
            {upcomingDeadlines.map((d) => {
              const color = getUrgencyColor(d.dueDate);
              return (
                <Card key={d.id} style={styles.deadlineCard}>
                  <View style={[styles.deadlineBar, { backgroundColor: color }]} />
                  <View style={styles.deadlineContent}>
                    <Clock size={14} color={color} strokeWidth={1.8} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deadlineName} numberOfLines={1}>{d.description}</Text>
                      <Text style={[styles.deadlineDate, { color }]}>Vence {formatDate(d.dueDate)}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg, badge }: {
  icon: any; label: string; value: number; color: string; bg: string; badge?: boolean;
}) {
  return (
    <Card style={[styles.metricCard, { position: "relative" }]}>
      {badge && <View style={styles.metricBadgeDot} />}
      <View style={[styles.metricIconBg, { backgroundColor: bg }]}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

function QuickAction({ icon: Icon, label, color, bg, onPress }: {
  icon: any; label: string; color: string; bg: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qaIconBg, { backgroundColor: bg }]}>
        <Icon size={22} color={color} strokeWidth={1.8} />
      </View>
      <Text style={[styles.qaLabel, { color }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: "rgba(16,185,129,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: colors.accent, fontSize: fontSize.md, fontWeight: "700" },
  greeting: { color: colors.muted, fontSize: fontSize.xs, letterSpacing: 0.2 },
  userName: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },

  scroll: { flex: 1 },
  dateText: {
    color: colors.muted,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    textTransform: "capitalize",
    letterSpacing: 0.2,
  },

  // Metrics
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metricCard: {
    width: "48%",
    gap: spacing.xs,
    flexShrink: 1,
    flexGrow: 1,
  },
  metricBadgeDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  metricIconBg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.xxl,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
    letterSpacing: 0.2,
  },

  // Quick actions
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionLink: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickAction: {
    width: "48%",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 1,
    flexGrow: 1,
    minHeight: 80,
    justifyContent: "center",
  },
  qaIconBg: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  qaLabel: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  listGap: { gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },

  // Cases
  caseCard: { padding: 14 },
  caseRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  caseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  caseInfo: { flex: 1 },
  caseName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600", marginBottom: 2 },
  caseClient: { color: colors.muted, fontSize: fontSize.sm },
  caseMeta: { alignItems: "flex-end", gap: 4 },

  // Deadlines
  deadlineCard: { padding: 0, overflow: "hidden", flexDirection: "row" },
  deadlineBar: { width: 4, borderRadius: 0 },
  deadlineContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: 14 },
  deadlineName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600", marginBottom: 2 },
  deadlineDate: { fontSize: fontSize.sm, fontWeight: "600" },

  // Empty
  emptyCard: { marginHorizontal: spacing.lg, marginBottom: spacing.xl },
  emptyText: { color: colors.muted, fontSize: fontSize.sm, textAlign: "center" },
});
