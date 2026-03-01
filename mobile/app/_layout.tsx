import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "../lib/queryClient";
import { useAuthStore } from "../lib/store";
import { colors } from "../lib/theme";
import LoadingScreen from "../components/LoadingScreen";
import { useRouter, useSegments } from "expo-router";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login" || segments[0] === "register-firm";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)/dashboard");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return <LoadingScreen message="Cargando sesión..." />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register-firm" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGate>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
