import { Ionicons } from "@expo/vector-icons";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import { useEffect } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeInLeft, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

const menu = [
  ["person-outline", "Perfil", "Profile", "/(tabs)"],
  ["trophy-outline", "Conquistas", "Achievements", "/(tabs)/achievements"],
  ["stats-chart-outline", "Estatísticas", "Statistics", "/(tabs)/achievements"],
  ["color-palette-outline", "Temas", "Themes", "/(tabs)/settings"],
  ["language-outline", "Idioma", "Language", "/(tabs)/settings"],
  ["game-controller-outline", "Ajuda", "Help", "/(tabs)/settings"],
  ["settings-outline", "Configurações", "Settings", "/(tabs)/settings"],
  ["information-circle-outline", "Sobre", "About", "/(tabs)/settings"],
] as const;

export function NavigationDrawer() {
  const { drawerOpen, puzzles, setDrawerOpen, setTheme, t, theme } = useApp();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const colors = mobileThemes[theme];
  const drawerWidth = Math.min(width * 0.88, 410);
  const translateX = useSharedValue(-drawerWidth);
  const completed = puzzles.filter((puzzle) => puzzle.session.completedAt).length;
  const xp = completed * 500 + puzzles.reduce((sum, puzzle) => sum + puzzle.session.pieces.filter((piece) => piece.isPlaced).length, 0);
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const glass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const Surface = glass ? GlassView : View;

  useEffect(() => {
    if (drawerOpen) {
      translateX.set(withSpring(0, { damping: 20, stiffness: 210, mass: 0.8 }));
    } else {
      translateX.set(-drawerWidth);
    }
  }, [drawerOpen, drawerWidth, translateX]);

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      if (event.translationX < 0) translateX.set(event.translationX);
    })
    .onEnd((event) => {
      if (event.translationX < -72 || event.velocityX < -650) {
        translateX.set(withTiming(-drawerWidth, { duration: 170 }, (finished) => {
          if (finished) runOnJS(setDrawerOpen)(false);
        }));
      } else {
        translateX.set(withSpring(0, { damping: 18, stiffness: 230 }));
      }
    });

  function navigate(path: string) {
    setDrawerOpen(false);
    router.push(path as never);
  }

  function closeDrawer() {
    translateX.set(withTiming(-drawerWidth, { duration: 190 }, (finished) => {
      if (finished) runOnJS(setDrawerOpen)(false);
    }));
  }

  function isActive(path: string, index: number) {
    if (index === 0) return pathname === "/" || pathname === "/index";
    if (path.includes("achievements")) return pathname.includes("achievements");
    if (path.includes("settings")) return pathname.includes("settings");
    return false;
  }

  return (
    <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={closeDrawer}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel={t("Fechar menu", "Close menu")} style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.animatedDrawer, { width: drawerWidth }, drawerStyle]}>
            <Surface
              {...(glass ? { glassEffectStyle: "regular" as const, colorScheme: theme === "candy" ? "light" as const : "dark" as const, tintColor: `${colors.panel}ee` } : {})}
              style={[styles.drawer, { backgroundColor: glass ? "transparent" : colors.panel, borderColor: `${colors.accent}34` }]}
            >
              <View style={styles.dragHint}>
                <View style={[styles.dragPill, { backgroundColor: `${colors.muted}66` }]} />
                <Text style={[styles.dragText, { color: colors.muted }]}>{t("Deslize para fechar", "Swipe left to close")}</Text>
              </View>

              <View style={styles.profileRow}>
                <LinearGradient colors={[colors.accent, colors.primary]} style={styles.avatar}>
                  <Ionicons name="extension-puzzle" size={29} color="#08101c" />
                </LinearGradient>
                <View style={styles.profileCopy}>
                  <Text style={[styles.profileName, { color: colors.text }]}>{t("Jogador Um", "Player One")}</Text>
                  <Text style={[styles.profileLevel, { color: colors.muted }]}>Level {level} · {t("Mestre Puzzler", "Master Puzzler")}</Text>
                </View>
                <Pressable onPress={closeDrawer} style={[styles.closeButton, { backgroundColor: colors.panelAlt }]}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.xpHeader}><Text style={[styles.xpText, { color: colors.muted }]}>XP</Text><Text style={[styles.xpText, { color: colors.accent }]}>{xp.toLocaleString()}</Text></View>
              <View style={[styles.track, { backgroundColor: colors.panelAlt }]}><LinearGradient colors={[colors.primary, colors.accent]} style={[styles.progress, { width: `${xp % 1000 / 10}%` }]} /></View>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.menu}>
                  {menu.map(([icon, pt, en, path], index) => {
                    const active = isActive(path, index);
                    return (
                      <Animated.View key={pt} entering={FadeInLeft.delay(70 + index * 35).duration(320)}>
                        <Pressable onPress={() => navigate(path)} style={({ pressed }) => [styles.menuItem, { backgroundColor: active ? colors.panelAlt : "transparent" }, pressed ? styles.pressed : null]}>
                          {active ? <LinearGradient colors={[colors.accent, colors.primary]} style={styles.activeRail} /> : null}
                          <View style={[styles.menuIcon, { backgroundColor: active ? `${colors.accent}22` : `${colors.muted}0d` }]}>
                            <Ionicons name={icon} size={21} color={active ? colors.accent : colors.muted} />
                          </View>
                          <Text style={[styles.menuLabel, { color: active ? colors.accent : colors.text }]}>{t(pt, en)}</Text>
                          <Ionicons name="chevron-forward" size={15} color={`${colors.muted}99`} />
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>

                <Text style={[styles.themeLabel, { color: colors.muted }]}>{t("TEMA ATIVO", "ACTIVE THEME")}</Text>
                <View style={styles.themeRow}>
                  {(["cosmic", "candy"] as const).map((item) => {
                    const itemColors = mobileThemes[item];
                    return (
                      <Pressable key={item} onPress={() => setTheme(item)} style={({ pressed }) => [styles.themeCard, { borderColor: item === theme ? colors.accent : "transparent", backgroundColor: colors.panelAlt }, pressed ? styles.pressed : null]}>
                        <View style={[styles.themePreview, { backgroundColor: itemColors.background }]}><View style={[styles.themeDot, { backgroundColor: itemColors.accent }]} /></View>
                        <Text style={[styles.themeName, { color: colors.text }]}>{item === "cosmic" ? "Cosmic Night" : "Candy Pop"}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </Surface>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(2,6,16,0.64)" },
  animatedDrawer: { flex: 1 },
  drawer: { flex: 1, borderRightWidth: StyleSheet.hairlineWidth, borderTopRightRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20, paddingTop: 14, overflow: "hidden" },
  dragHint: { minHeight: 30, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  dragPill: { width: 28, height: 4, borderRadius: 99 },
  dragText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.3 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  profileCopy: { flex: 1, minWidth: 0 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  profileName: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 22 },
  profileLevel: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  xpHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, marginBottom: 7 },
  xpText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  track: { height: 7, borderRadius: 99, overflow: "hidden" },
  progress: { height: "100%", borderRadius: 99 },
  scrollContent: { paddingTop: 16, paddingBottom: 24 },
  menu: { gap: 3 },
  menuItem: { minHeight: 47, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, overflow: "hidden" },
  menuIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  activeRail: { position: "absolute", left: 0, top: 10, bottom: 10, width: 3, borderRadius: 99 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  themeLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2, marginTop: 22, marginBottom: 10 },
  themeRow: { flexDirection: "row", gap: 10 },
  themeCard: { flex: 1, padding: 8, borderRadius: 16, borderWidth: 1.5 },
  themePreview: { height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  themeDot: { width: 18, height: 18, borderRadius: 9 },
  themeName: { fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 7 },
});
