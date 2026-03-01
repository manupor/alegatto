import { useState, useMemo } from 'react';
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
import { api } from '../lib/api';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 'Gratis',
    features: ['1 usuario', '10 consultas/mes', 'Funciones basicas'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49/mes',
    features: ['5 usuarios', 'Consultas ilimitadas', 'Generacion de recursos', 'Firma digital'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$149/mes',
    features: ['Usuarios ilimitados', 'Todo en Pro', 'Soporte prioritario', 'API acceso'],
  },
];

export default function RegisterFirmScreen() {
  const router = useRouter();
  const [firmName, setFirmName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const slug = useMemo(() => {
    return firmName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }, [firmName]);

  const handleRegister = async () => {
    if (!firmName.trim()) {
      setError('Por favor ingrese el nombre de la firma');
      return;
    }
    if (!slug) {
      setError('El nombre genera un slug invalido');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.org.register(firmName.trim(), slug, selectedPlan);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrar la firma');
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
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: spacing.lg }}
          testID="button-back"
        >
          <Text style={{ color: colors.accent, fontSize: fontSize.md }}>Volver</Text>
        </TouchableOpacity>

        <Text
          style={{
            color: colors.text,
            fontSize: fontSize.xxl,
            fontWeight: '700',
            marginBottom: spacing.xs,
          }}
        >
          Registrar Firma
        </Text>
        <Text style={{ color: colors.muted, fontSize: fontSize.md, marginBottom: spacing.xxl }}>
          Crea tu firma legal para comenzar
        </Text>

        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              marginBottom: spacing.xs,
            }}
          >
            Nombre de la firma
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
            placeholder="Ej: Bufete Gonzalez & Asociados"
            placeholderTextColor={colors.muted}
            value={firmName}
            onChangeText={setFirmName}
            autoCapitalize="words"
            testID="input-firm-name"
          />
        </View>

        {slug ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.xxl,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: fontSize.xs }}>URL de la firma</Text>
            <Text
              style={{ color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.xs }}
              testID="text-slug-preview"
            >
              lexai.cr/
              <Text style={{ color: colors.accent, fontWeight: '600' }}>{slug}</Text>
            </Text>
          </View>
        ) : null}

        <Text
          style={{
            color: colors.text,
            fontSize: fontSize.lg,
            fontWeight: '600',
            marginBottom: spacing.lg,
          }}
        >
          Seleccionar plan
        </Text>

        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={{
                backgroundColor: colors.card,
                borderWidth: 2,
                borderColor: isSelected ? colors.accent : colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing.lg,
                marginBottom: spacing.md,
              }}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.7}
              testID={`button-plan-${plan.id}`}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '600' }}>
                  {plan.name}
                </Text>
                <Text
                  style={{
                    color: isSelected ? colors.accent : colors.textSecondary,
                    fontSize: fontSize.lg,
                    fontWeight: '700',
                  }}
                >
                  {plan.price}
                </Text>
              </View>
              {plan.features.map((feature) => (
                <Text
                  key={feature}
                  style={{
                    color: colors.muted,
                    fontSize: fontSize.sm,
                    marginTop: spacing.xs,
                  }}
                >
                  {feature}
                </Text>
              ))}
              {isSelected && (
                <View
                  style={{
                    position: 'absolute',
                    top: spacing.md,
                    right: spacing.md,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {error && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 1,
              borderColor: colors.danger,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
              marginTop: spacing.sm,
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
            marginTop: spacing.lg,
          }}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.7}
          testID="button-register-firm"
        >
          {loading && <ActivityIndicator size="small" color="#fff" />}
          <Text style={{ color: '#fff', fontSize: fontSize.lg, fontWeight: '600' }}>
            Crear Firma
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
