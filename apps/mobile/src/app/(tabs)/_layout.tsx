import { Ionicons } from "@expo/vector-icons";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function TabsLayout() {
  const { t, theme } = useApp();
  const colors = mobileThemes[theme];
  const glass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          position: "absolute",
          height: 78,
          paddingTop: 8,
          paddingBottom: 12,
          borderTopColor: `${colors.accent}24`,
          backgroundColor: glass ? "transparent" : `${colors.panel}f2`,
        },
        tabBarBackground: glass
          ? () => (
              <GlassView
                glassEffectStyle="regular"
                colorScheme={theme === "candy" ? "light" : "dark"}
                tintColor={`${colors.panel}72`}
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("Início", "Home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t("Criar", "Create"),
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="puzzles"
        options={{
          title: t("Coleção", "Collection"),
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("Ajustes", "Settings"),
          tabBarIcon: ({ color, size }) => <Ionicons name="options" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
