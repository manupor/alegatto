import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, Lock, Eye, EyeOff, ChevronRight } from "lucide-react-native";
import { useAuthStore } from "../lib/store";
import { colors, spacing, fontSize, borderRadius, shadows } from "../lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Ingresá tu correo y contraseña");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      setError(err.message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand ─────────────────────────────── */}
        <View style={styles.brandSection}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoEmoji}>⚖️</Text>
            </View>
          </View>
          <Text style={styles.brandName}>LexAI CR</Text>
          <Text style={styles.brandTagline}>Tu asistente legal con inteligencia artificial</Text>
        </View>

        {/* ── Form ──────────────────────────────── */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Iniciar Sesión</Text>

          {/* Email field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Correo electrónico</Text>
            <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
              <Mail size={18} color={emailFocused ? colors.accent : colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                testID="input-email"
              />
            </View>
          </View>

          {/* Password field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Contraseña</Text>
            <View style={[styles.inputRow, passFocused && styles.inputRowFocused]}>
              <Lock size={18} color={passFocused ? colors.accent : colors.muted} strokeWidth={1.8} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                testID="input-password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword
                  ? <EyeOff size={18} color={colors.muted} strokeWidth={1.8} />
                  : <Eye size={18} color={colors.muted} strokeWidth={1.8} />
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText} testID="text-error">{error}</Text>
            </View>
          )}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            testID="button-login"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
                <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register link */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push("/register-firm")}
            activeOpacity={0.7}
            testID="link-register-firm"
          >
            <Text style={styles.registerText}>
              ¿Sos nuevo?{" "}
              <Text style={styles.registerAccent}>Registrar firma →</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          LexAI CR · 4,482 artículos legales · CR
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },

  // Brand
  brandSection: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: "rgba(16,185,129,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(16,185,129,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoEmoji: {
    fontSize: 36,
  },
  brandName: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  brandTagline: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: "center",
    letterSpacing: 0.2,
    maxWidth: 260,
    lineHeight: 20,
  },

  // Form
  form: {
    gap: spacing.lg,
  },
  formTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  inputRowFocused: {
    borderColor: colors.accent,
    backgroundColor: "rgba(16,185,129,0.04)",
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    padding: 0,
    margin: 0,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  loginBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: fontSize.lg,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  registerBtn: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  registerText: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  registerAccent: {
    color: colors.accent,
    fontWeight: "700",
  },

  // Footer
  footer: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.xxxl,
    letterSpacing: 0.3,
  },
});
