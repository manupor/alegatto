import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors, fontSize } from "../lib/theme";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Text style={styles.logoEmoji}>⚖️</Text>
      </View>
      <Text style={styles.brand}>LexAI CR</Text>
      <Text style={styles.tagline}>Asistente Legal con IA</Text>
      <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  logoEmoji: {
    fontSize: 38,
  },
  brand: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.muted,
    fontSize: fontSize.sm,
    letterSpacing: 0.3,
  },
  spinner: {
    marginTop: 24,
  },
  message: {
    color: colors.muted,
    fontSize: fontSize.sm,
    marginTop: 4,
  },
});
