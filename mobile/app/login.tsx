import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../lib/store';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingrese correo y contrasena');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: borderRadius.lg,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>L</Text>
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.title,
              fontWeight: '700',
              marginBottom: spacing.xs,
            }}
          >
            LexAI CR
          </Text>
          <Text style={{ color: colors.muted, fontSize: fontSize.md }}>
            Asistente Legal Inteligente
          </Text>
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              marginBottom: spacing.xs,
            }}
          >
            Correo electronico
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              color: colors.text,
              fontSize: fontSize.md,
            }}
            placeholder="usuario@ejemplo.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            testID="input-email"
          />
        </View>

        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              marginBottom: spacing.xs,
            }}
          >
            Contrasena
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              color: colors.text,
              fontSize: fontSize.md,
            }}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="input-password"
          />
        </View>

        {error && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 1,
              borderColor: colors.danger,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{ color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' }}
              testID="text-error"
            >
              {error}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{
            backgroundColor: loading ? colors.accentDark : colors.accent,
            borderRadius: borderRadius.md,
            paddingVertical: spacing.md + 2,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            opacity: loading ? 0.8 : 1,
          }}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.7}
          testID="button-login"
        >
          {loading && <ActivityIndicator size="small" color="#fff" />}
          <Text style={{ color: '#fff', fontSize: fontSize.lg, fontWeight: '600' }}>
            Iniciar Sesion
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: spacing.xl, alignItems: 'center' }}
          onPress={() => router.push('/register-firm')}
          testID="link-register-firm"
        >
          <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
            No tienes una firma?{' '}
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Registrar firma</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
