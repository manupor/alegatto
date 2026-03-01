import { View, Text } from "react-native";
import { type LucideIcon } from "lucide-react-native";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
        paddingVertical: 48,
        gap: 12,
      }}
    >
      <Icon size={48} color="#64748b" strokeWidth={1.5} />
      <Text
        style={{
          color: "#f8fafc",
          fontSize: 18,
          fontWeight: "600",
          textAlign: "center",
          marginTop: 4,
        }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={{
            color: "#64748b",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}
