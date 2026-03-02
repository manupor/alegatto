import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Building2, Bell, Info, LogOut, ChevronRight,
  Shield, Star, HelpCircle,
} from "lucide-react-native";
import { api, type OrgContext } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import { colors, spacing, fontSize, borderRadius } from "../../../lib/theme";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: orgContext } = useQuery<OrgContext>({
    queryKey: ["org-context"],
    queryFn: () => api.org.getContext(),
  });

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2)
    : "?";

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Seguro que querés cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace("/login");
            } catch {
              Alert.alert("Error", "No se pudo cerrar la sesión.");
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root]}>
      {/* ── Header ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ─────────────────────── */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name || "Usuario"}</Text>
              <Text style={styles.profileEmail}>{user?.email || ""}</Text>
              {orgContext?.role && (
                <View style={styles.roleBadge}>
                  <Shield size={11} color={colors.accent} strokeWidth={1.8} />
                  <Text style={styles.roleText}>
                    {orgContext.role.charAt(0).toUpperCase() + orgContext.role.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* ── Org section ──────────────────────── */}
        {orgContext?.org && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Organización</Text>
            <Card>
              <View style={styles.orgRow}>
                <Building2 size={20} color={colors.accent} strokeWidth={1.8} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgName}>{orgContext.org.name}</Text>
                  <Text style={styles.orgSlug}>/{orgContext.org.slug}</Text>
                </View>
                <Badge
                  label={orgContext.org.plan.toUpperCase()}
                  variant={orgContext.org.plan === "enterprise" ? "success" : orgContext.org.plan === "pro" ? "info" : "default"}
                />
              </View>
            </Card>
          </View>
        )}

        {/* ── Preferences ──────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferencias</Text>
          <Card>
            <View style={styles.prefRow}>
              <Bell size={20} color={colors.info} strokeWidth={1.8} />
              <Text style={styles.prefLabel}>Notificaciones push</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.muted, true: colors.accentDark }}
                thumbColor={notificationsEnabled ? colors.accent : "#666"}
              />
            </View>
          </Card>
        </View>

        {/* ── App info ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Acerca de</Text>
          <Card>
            <InfoRow label="Versión de la app" value="1.0.0" />
            <View style={styles.divider} />
            <InfoRow label="Base legal" value="4,482 artículos" />
            <View style={styles.divider} />
            <InfoRow label="Códigos cubiertos" value="8 códigos CR" />
          </Card>
        </View>

        {/* ── Support links ────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Soporte</Text>
          <Card noPadding>
            <LinkRow icon={Star} label="Calificar LexAI CR" color={colors.warning} />
            <View style={styles.divider} />
            <LinkRow icon={HelpCircle} label="Centro de ayuda" color={colors.info} />
            <View style={styles.divider} />
            <LinkRow icon={Info} label="Términos y privacidad" color={colors.muted} />
          </Card>
        </View>

        {/* ── Logout ───────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          disabled={loggingOut}
          style={styles.logoutBtn}
        >
          {loggingOut
            ? <ActivityIndicator size="small" color="#fca5a5" />
            : <LogOut size={18} color="#fca5a5" strokeWidth={2} />
          }
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LinkRow({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
      <Icon size={18} color={color} strokeWidth={1.8} />
      <Text style={styles.linkLabel}>{label}</Text>
      <ChevronRight size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "800" },

  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  profileCard: { marginBottom: spacing.xl },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: "rgba(16,185,129,0.3)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { color: colors.accent, fontSize: fontSize.xl, fontWeight: "800" },
  profileName: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", marginBottom: 2 },
  profileEmail: { color: colors.muted, fontSize: fontSize.sm, marginBottom: spacing.sm },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  roleText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: "700" },

  section: { marginBottom: spacing.lg },
  sectionLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginLeft: 2,
  },

  orgRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  orgName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  orgSlug: { color: colors.muted, fontSize: fontSize.sm },

  prefRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  prefLabel: { flex: 1, color: colors.text, fontSize: fontSize.md },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 2 },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  infoLabel: { color: colors.textSecondary, fontSize: fontSize.md },
  infoValue: { color: colors.muted, fontSize: fontSize.md },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  linkLabel: { flex: 1, color: colors.text, fontSize: fontSize.md },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(127,29,29,0.4)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  logoutText: { color: "#fca5a5", fontSize: fontSize.md, fontWeight: "700" },
});
