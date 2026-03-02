import { TouchableOpacity, StyleSheet, Platform } from "react-native";
import { type LucideIcon } from "lucide-react-native";
import { colors } from "../lib/theme";

interface FABProps {
  icon: LucideIcon;
  onPress: () => void;
}

export default function FAB({ icon: Icon, onPress }: FABProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.fab}
    >
      <Icon size={24} color="#fff" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
});
