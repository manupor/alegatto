import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../lib/store";
import LoadingScreen from "../components/LoadingScreen";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace("/(tabs)/dashboard");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading]);

  return <LoadingScreen />;
}
