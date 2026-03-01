import { Tabs } from "expo-router";
import { Home, MessageCircle, Briefcase, FileText, Settings } from "lucide-react-native";
import { colors } from "../../lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          tabBarTestID: "tab-dashboard",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          tabBarTestID: "tab-chat",
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: "Casos",
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
          tabBarTestID: "tab-cases",
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documentos",
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
          tabBarTestID: "tab-documents",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          tabBarTestID: "tab-settings",
        }}
      />
    </Tabs>
  );
}
