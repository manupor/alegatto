import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { User, Building2, Bell, Info, LogOut } from "lucide-react-native";
import { api, type OrgContext } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import { colors, spacing, fontSize, borderRadius } from "../../../lib/theme";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: orgContext } = useQuery<OrgContext>({
    queryKey: ["org-context"],
    queryFn: () => api.org.getContext(),
  });

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesion",
      "Esta seguro que desea cerrar sesion?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesion",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace("/login");
            } catch {
              Alert.alert("Error", "No se pudo cerrar la sesion.");
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "?";

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
          Configuracion
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        <Card style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.lg,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.accent,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: fontSize.xl,
                  fontWeight: "700",
                }}
              >
                {initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.lg,
                  fontWeight: "600",
                }}
              >
                {user?.name || "Usuario"}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: fontSize.sm,
                  marginTop: 2,
                }}
              >
                {user?.email || ""}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <Building2 size={18} color={colors.accent} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Organizacion
            </Text>
          </View>

          {orgContext?.org ? (
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: spacing.sm,
                }}
              >
                <Text style={{ color: colors.text, fontSize: fontSize.md }}>
                  {orgContext.org.name}
                </Text>
                <Badge
                  label={orgContext.org.plan.toUpperCase()}
                  variant={
                    orgContext.org.plan === "enterprise"
                      ? "success"
                      : orgContext.org.plan === "pro"
                      ? "info"
                      : "default"
                  }
                />
              </View>
              {orgContext.role && (
                <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
                  Rol: {orgContext.role}
                </Text>
              )}
            </View>
          ) : (
            <Text style={{ color: colors.muted, fontSize: fontSize.md }}>
              Sin organizacion asignada
            </Text>
          )}
        </Card>

        <Card style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <Bell size={18} color={colors.accent} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Notificaciones
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSize.md }}>
              Alertas push
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.accentDark }}
              thumbColor={notificationsEnabled ? colors.accent : colors.muted}
            />
          </View>
        </Card>

        <Card style={{ marginBottom: spacing.xl }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <Info size={18} color={colors.accent} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Informacion
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>
                Version
              </Text>
              <Text style={{ color: colors.muted, fontSize: fontSize.md }}>
                1.0.0
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>
                Plataforma
              </Text>
              <Text style={{ color: colors.muted, fontSize: fontSize.md }}>
                LexAI CR
              </Text>
            </View>
          </View>
        </Card>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLogout}
          disabled={loggingOut}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.sm,
            backgroundColor: "#7f1d1d",
            borderRadius: borderRadius.md,
            paddingVertical: spacing.md,
          }}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#fca5a5" />
          ) : (
            <LogOut size={18} color="#fca5a5" />
          )}
          <Text
            style={{
              color: "#fca5a5",
              fontSize: fontSize.md,
              fontWeight: "600",
            }}
          >
            Cerrar Sesion
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
