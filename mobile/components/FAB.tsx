import { TouchableOpacity, ViewStyle } from "react-native";
import { type LucideIcon } from "lucide-react-native";

interface FABProps {
  icon: LucideIcon;
  onPress: () => void;
  style?: ViewStyle;
}

export default function FAB({ icon: Icon, onPress, style }: FABProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#10B981",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        },
        style,
      ]}
    >
      <Icon size={24} color="#f8fafc" />
    </TouchableOpacity>
  );
}
