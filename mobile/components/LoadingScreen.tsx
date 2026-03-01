import { View, Text, ActivityIndicator } from "react-native";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
      }}
    >
      <Text
        style={{
          color: "#10B981",
          fontSize: 28,
          fontWeight: "700",
          letterSpacing: 1,
        }}
      >
        LexAI CR
      </Text>
      <ActivityIndicator size="large" color="#10B981" />
      {message ? (
        <Text
          style={{
            color: "#64748b",
            fontSize: 14,
            marginTop: 4,
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
