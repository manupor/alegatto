import { View, Text, ViewStyle } from "react-native";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default"
  | "penal"
  | "civil"
  | "laboral"
  | "comercial"
  | "constitucional"
  | "administrativo"
  | "transito";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "#065f46", text: "#6ee7b7" },
  warning: { bg: "#78350f", text: "#fcd34d" },
  danger: { bg: "#7f1d1d", text: "#fca5a5" },
  info: { bg: "#1e3a5f", text: "#93c5fd" },
  default: { bg: "#334155", text: "#cbd5e1" },
  penal: { bg: "#7f1d1d", text: "#fca5a5" },
  civil: { bg: "#1e3a5f", text: "#93c5fd" },
  laboral: { bg: "#065f46", text: "#6ee7b7" },
  comercial: { bg: "#78350f", text: "#fcd34d" },
  constitucional: { bg: "#4c1d95", text: "#c4b5fd" },
  administrativo: { bg: "#164e63", text: "#67e8f9" },
  transito: { bg: "#713f12", text: "#fde68a" },
};

export default function Badge({ label, variant = "default", style }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
          borderRadius: 9999,
          paddingHorizontal: 10,
          paddingVertical: 3,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 12,
          fontWeight: "600",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
