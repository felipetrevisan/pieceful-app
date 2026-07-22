import { Ionicons } from "@expo/vector-icons";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, type ColorValue } from "react-native";
import { isLightMobileTheme, mobileThemes } from "@/constants/pieceful-theme";
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
          borderRadius: Math.max(10, colors.radius + 7),
          overflow: "hidden",
          backgroundColor: glass ? "transparent" : `${colors.panel}f2`,
        },
        tabBarBackground: glass
          ? () => (
              <GlassView
                glassEffectStyle="regular"
                colorScheme={isLightMobileTheme(theme) ? "light" : "dark"}
                tintColor={`${colors.panel}72`}
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
        tabBarAllowFontScaling: false,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("Início", "Home"),
          tabBarLabel: ({ color }) => <TabLabel color={color} label={t("Início", "Home")} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t("Criar", "Create"),
          tabBarLabel: ({ color }) => <TabLabel color={color} label={t("Criar", "Create")} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="puzzles"
        options={{
          title: t("Coleção", "Collection"),
          tabBarLabel: ({ color }) => <TabLabel color={color} label={t("Coleção", "Collection")} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="friends" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

function TabLabel({ color, label }: { color: ColorValue; label: string }) {
  return (
    <Text
      adjustsFontSizeToFit
      allowFontScaling={false}
      minimumFontScale={0.82}
      numberOfLines={1}
      style={[styles.tabLabel, { color }]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  tabBarItem: { flex: 1, minWidth: 0, paddingHorizontal: 2 },
  tabLabel: {
    alignSelf: "stretch",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 2,
    textAlign: "center",
    width: "100%",
  },
});
