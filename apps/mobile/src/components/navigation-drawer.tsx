import { Ionicons } from "@expo/vector-icons";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { isLightMobileTheme, mobileThemeCatalog, mobileThemes } from "@/constants/pieceful-theme";
import { FrostedBackdrop } from "@/components/frosted-surface";
import { useApp } from "@/state/app-provider";
import { useSocial } from "@/state/social-provider";

const menu = [
  ["home-outline", "Início", "Home", "/(tabs)"],
  ["add-circle-outline", "Criar", "Create", "/(tabs)/create"],
  ["albums-outline", "Coleção", "Collection", "/(tabs)/puzzles"],
  ["trophy-outline", "Conquistas", "Achievements", "/(tabs)/achievements"],
  ["people-outline", "Amigos", "Friends", "/(tabs)/friends"],
  ["person-outline", "Perfil", "Profile", "/(tabs)/profile"],
  ["game-controller-outline", "Controles", "Controllers", "/help/controller"],
  ["settings-outline", "Ajustes", "Settings", "/(tabs)/settings"],
] as const;

export function NavigationDrawer() {
  const { ageGroup, drawerOpen, puzzles, setDrawerOpen, t, theme } = useApp();
  const { profile, session } = useSocial();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const colors = mobileThemes[theme];
  const drawerWidth = Math.min(width * 0.88, 410);
  const translateX = useSharedValue(-drawerWidth);
  const completed = puzzles.filter((puzzle) => puzzle.session.completedAt).length;
  const xp = completed * 500 + puzzles.reduce((sum, puzzle) => sum + puzzle.session.pieces.filter((piece) => piece.isPlaced).length, 0);
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const activeTheme = mobileThemeCatalog.find((item) => item.id === theme) ?? mobileThemeCatalog[0];
  const glass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const Surface = glass ? GlassView : View;
  const childMode = ageGroup === "child";
  const visibleMenu = childMode ? menu.filter((item) => item[1] !== "Amigos" && item[1] !== "Perfil") : menu;
  const profileName = (childMode ? t("Pequeno Puzzler", "Little Puzzler") : profile.displayName.trim())
    || String(session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name ?? "").trim()
    || session?.user.email?.split("@")[0]
    || t("Jogador", "Player");

  useEffect(() => {
    if (drawerOpen) {
      translateX.set(withSpring(0, { damping: 20, stiffness: 210, mass: 0.8 }));
    } else {
      translateX.set(-drawerWidth);
    }
  }, [drawerOpen, drawerWidth, translateX]);

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, 1 + translateX.value / drawerWidth)),
  }));
  const edgePan = Gesture.Pan()
    .activeOffsetX(5)
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      translateX.set(Math.max(-drawerWidth, Math.min(0, -drawerWidth + event.translationX)));
    })
    .onEnd((event) => {
      const shouldOpen = event.translationX > drawerWidth * 0.34 || event.velocityX > 650;
      translateX.set(withSpring(shouldOpen ? 0 : -drawerWidth, { damping: 20, stiffness: 230 }));
      runOnJS(setDrawerOpen)(shouldOpen);
    });
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
    return pathname.includes(path.replace("/(tabs)/", "").replace("/(tabs)", ""));
  }

  return (
    <View pointerEvents={drawerOpen ? "auto" : "box-none"} style={styles.rootOverlay}>
      <Animated.View pointerEvents="none" style={[styles.overlay, backdropStyle]} />
      {drawerOpen ? <Pressable accessibilityLabel={t("Fechar menu", "Close menu")} style={StyleSheet.absoluteFill} onPress={closeDrawer} /> : null}
      {!drawerOpen ? (
        <GestureDetector gesture={edgePan}>
          <Animated.View accessibilityLabel={t("Deslize para abrir o menu", "Swipe to open menu")} style={styles.edgeZone} />
        </GestureDetector>
      ) : null}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.animatedDrawer, { width: drawerWidth }, drawerStyle]}>
            <Surface
              {...(glass ? { glassEffectStyle: "regular" as const, colorScheme: isLightMobileTheme(theme) ? "light" as const : "dark" as const, tintColor: `${colors.panel}ee` } : {})}
              style={[styles.drawer, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: glass ? "transparent" : colors.panel, borderColor: `${colors.accent}34` }]}
            >
              {!glass ? <FrostedBackdrop intensity={78} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Fechar menu", "Close menu")}
                hitSlop={10}
                onPress={closeDrawer}
                style={[styles.closeButton, { top: insets.top + 8, backgroundColor: colors.panelAlt, borderColor: `${colors.accent}55` }]}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
              <View style={styles.dragHint}>
                <View style={[styles.dragPill, { backgroundColor: `${colors.muted}66` }]} />
                <Text style={[styles.dragText, { color: colors.muted }]}>{t("Deslize para fechar", "Swipe left to close")}</Text>
              </View>

              <View style={styles.profileRow}>
                <Pressable onPress={() => navigate(childMode ? "/(tabs)/settings" : session ? "/(tabs)/profile" : "/(tabs)/account")} style={({ pressed }) => [styles.profileLink, pressed ? styles.pressed : null]}>
                  <LinearGradient colors={[colors.accent, colors.primary]} style={styles.avatar}>
                    {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} contentFit="cover" /> : <Ionicons name="extension-puzzle" size={29} color="#08101c" />}
                  </LinearGradient>
                  <View style={styles.profileCopy}>
                    <Text numberOfLines={1} style={[styles.profileName, { color: colors.text }]}>{profileName}</Text>
                    <Text style={[styles.profileLevel, { color: colors.muted }]}>{childMode ? t("Modo infantil", "Kids mode") : `Level ${level} · ${t("Mestre Puzzler", "Master Puzzler")}`}</Text>
                  </View>
                </Pressable>
              </View>

              <View style={styles.xpHeader}><Text style={[styles.xpText, { color: colors.muted }]}>XP</Text><Text style={[styles.xpText, { color: colors.accent }]}>{xp.toLocaleString()}</Text></View>
              <View style={[styles.track, { backgroundColor: colors.panelAlt }]}><LinearGradient colors={[colors.primary, colors.accent]} style={[styles.progress, { width: `${xp % 1000 / 10}%` }]} /></View>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                <Text style={[styles.menuKicker, { color: colors.muted }]}>{t("EXPLORAR", "EXPLORE")}</Text>
                <View style={styles.menuGrid}>
                  {visibleMenu.map(([icon, pt, en, path], index) => {
                    const active = isActive(path, index);
                    return (
                      <Animated.View key={pt} entering={FadeInDown.delay(70 + index * 35).duration(320)} style={styles.menuTileShell}>
                        <Pressable onPress={() => navigate(path)} style={({ pressed }) => pressed ? styles.pressed : null}>
                          <View style={[styles.menuTile, { backgroundColor: active ? colors.panelAlt : `${colors.panelAlt}66`, borderColor: active ? colors.accent : `${colors.muted}22`, borderRadius: Math.max(8, colors.radius - 4) }]}>
                            <LinearGradient colors={active ? [...colors.gradient] : [`${colors.accent}22`, `${colors.primary}1a`]} style={[styles.menuIcon, { borderRadius: Math.max(7, colors.radius - 8) }]}>
                              <Ionicons name={icon} size={23} color={active ? colors.background : colors.accent} />
                            </LinearGradient>
                            <Text numberOfLines={1} style={[styles.menuLabel, { color: colors.text }]}>{t(pt, en)}</Text>
                            {active ? <View style={[styles.activeDot, { backgroundColor: colors.accent }]} /> : null}
                          </View>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>

                <Text style={[styles.themeLabel, { color: colors.muted }]}>{t("TEMA ATIVO", "ACTIVE THEME")}</Text>
                <Pressable onPress={() => navigate("/(tabs)/settings")} style={({ pressed }) => pressed ? styles.pressed : null}>
                  <View style={[styles.activeThemeCard, { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}40`, borderRadius: Math.max(8, colors.radius) }]}>
                    <LinearGradient colors={[...colors.gradient]} style={[styles.activeThemeIcon, { borderRadius: Math.max(7, colors.radius - 6) }]}><Ionicons name={activeTheme.icon} size={23} color={colors.background} /></LinearGradient>
                    <View style={{ flex: 1 }}><Text style={[styles.themeName, { color: colors.text }]}>{activeTheme.name}</Text><Text style={[styles.themeDescription, { color: colors.muted }]}>{t("Ver todos os 11 estilos", "View all 11 styles")}</Text></View>
                    <Ionicons name="chevron-forward" size={18} color={colors.accent} />
                  </View>
                </Pressable>
              </ScrollView>
            </Surface>
          </Animated.View>
        </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  rootOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 200 },
  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(2,6,16,0.64)" },
  edgeZone: { position: "absolute", left: 0, top: 0, bottom: 0, width: 24, zIndex: 202 },
  animatedDrawer: { position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 201 },
  drawer: { flex: 1, borderRightWidth: StyleSheet.hairlineWidth, borderTopRightRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20, overflow: "hidden" },
  dragHint: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 50 },
  dragPill: { width: 28, height: 4, borderRadius: 99 },
  dragText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.3 },
  profileRow: { width: "100%", height: 76, marginTop: 10 },
  profileLink: { width: "100%", height: 76, position: "relative" },
  profileCopy: { position: "absolute", left: 74, right: 0, top: 13, minWidth: 0 },
  avatar: { position: "absolute", left: 0, top: 8, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 30 },
  profileName: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 20, lineHeight: 25 },
  profileLevel: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 3 },
  closeButton: { position: "absolute", right: 14, zIndex: 20, width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center", elevation: 12 },
  xpHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, marginBottom: 7 },
  xpText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  track: { height: 7, borderRadius: 99, overflow: "hidden" },
  progress: { height: "100%", borderRadius: 99 },
  scrollContent: { paddingTop: 16, paddingBottom: 24 },
  menuKicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.4, marginBottom: 10 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  menuTileShell: { width: "48%" },
  menuTile: { minHeight: 92, borderWidth: 1, padding: 11, justifyContent: "space-between" },
  menuIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 8 },
  activeDot: { position: "absolute", width: 7, height: 7, borderRadius: 4, top: 12, right: 12 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  themeLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2, marginTop: 22, marginBottom: 10 },
  activeThemeCard: { minHeight: 72, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
  activeThemeIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  themeName: { fontFamily: "Inter_700Bold", fontSize: 13 },
  themeDescription: { fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 3 },
});
