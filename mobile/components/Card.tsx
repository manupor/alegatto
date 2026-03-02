import { View, ViewProps, StyleSheet, Platform } from "react-native";
import { colors, borderRadius } from "../lib/theme";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "accent";
  noPadding?: boolean;
}

export default function Card({ children, style, variant = "default", noPadding = false, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        !noPadding && styles.padding,
        variant === "elevated" && styles.elevated,
        variant === "accent" && styles.accent,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  padding: {
    padding: 16,
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
    }),
  },
  accent: {
    borderColor: 'rgba(16,185,129,0.3)',
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
});
