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
          left: 18,
          right: 18,
          bottom: 12,
          height: 70,
          paddingTop: 7,
          paddingBottom: 8,
          borderTopWidth: 0,
          borderRadius: 32,
          overflow: "hidden",
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
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
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
        name="achievements"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
