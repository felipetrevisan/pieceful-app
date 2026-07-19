import { Ionicons } from "@expo/vector-icons";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
  const colors = mobileThemes[theme];
  const completed = puzzles.filter((puzzle) => puzzle.session.completedAt).length;
  const xp = completed * 500 + puzzles.reduce((sum, puzzle) => sum + puzzle.session.pieces.filter((piece) => piece.isPlaced).length, 0);
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const glass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const Surface = glass ? GlassView : View;

  function navigate(path: string) {
    setDrawerOpen(false);
    router.push(path as never);
  }

  return (
    <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
        <Surface
          {...(glass ? { glassEffectStyle: "regular" as const, colorScheme: theme === "candy" ? "light" as const : "dark" as const, tintColor: `${colors.panel}e8` } : {})}
          style={[styles.drawer, { backgroundColor: glass ? "transparent" : colors.panel, borderColor: `${colors.accent}30` }]}
        >
          <View style={styles.profileRow}>
            <LinearGradient colors={[colors.accent, colors.primary]} style={styles.avatar}>
              <Ionicons name="extension-puzzle" size={30} color="#08101c" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>{t("Jogador Um", "Player One")}</Text>
              <Text style={[styles.profileLevel, { color: colors.muted }]}>Level {level} · {t("Mestre Puzzler", "Master Puzzler")}</Text>
            </View>
          </View>
          <View style={styles.xpHeader}><Text style={[styles.xpText, { color: colors.muted }]}>XP</Text><Text style={[styles.xpText, { color: colors.accent }]}>{xp.toLocaleString()}</Text></View>
          <View style={[styles.track, { backgroundColor: colors.panelAlt }]}><LinearGradient colors={[colors.primary, colors.accent]} style={[styles.progress, { width: `${xp % 1000 / 10}%` }]} /></View>

          <View style={styles.menu}>
            {menu.map(([icon, pt, en, path], index) => (
              <Pressable key={pt} onPress={() => navigate(path)} style={({ pressed }) => [styles.menuItem, index === 0 ? { backgroundColor: colors.accent } : null, pressed ? { opacity: 0.72 } : null]}>
                <Ionicons name={icon} size={23} color={index === 0 ? "#00363a" : colors.muted} />
                <Text style={[styles.menuLabel, { color: index === 0 ? "#00363a" : colors.text }]}>{t(pt, en)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.themeLabel, { color: colors.muted }]}>{t("TEMA ATIVO", "ACTIVE THEME")}</Text>
          <View style={styles.themeRow}>
            {(["cosmic", "candy"] as const).map((item) => {
              const itemColors = mobileThemes[item];
              return (
                <Pressable key={item} onPress={() => setTheme(item)} style={[styles.themeCard, { borderColor: item === theme ? colors.accent : "transparent", backgroundColor: colors.panelAlt }]}>
                  <View style={[styles.themePreview, { backgroundColor: itemColors.background }]}><View style={[styles.themeDot, { backgroundColor: itemColors.accent }]} /></View>
                  <Text style={[styles.themeName, { color: colors.text }]}>{item === "cosmic" ? "Cosmic Night" : "Candy Pop"}</Text>
                </Pressable>
              );
            })}
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(2,6,16,0.58)" },
  drawer: { width: "86%", maxWidth: 390, flex: 1, borderRightWidth: StyleSheet.hairlineWidth, borderTopRightRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 22, paddingTop: 64, paddingBottom: 28 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  profileName: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 25 },
  profileLevel: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 3 },
  xpHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 24, marginBottom: 8 },
  xpText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  track: { height: 7, borderRadius: 99, overflow: "hidden" },
  progress: { height: "100%", borderRadius: 99 },
  menu: { gap: 5, marginTop: 26, flex: 1 },
  menuItem: { minHeight: 52, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16 },
  menuLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  themeLabel: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1.2, marginBottom: 10 },
  themeRow: { flexDirection: "row", gap: 10 },
  themeCard: { flex: 1, padding: 8, borderRadius: 16, borderWidth: 1.5 },
  themePreview: { height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  themeDot: { width: 18, height: 18, borderRadius: 9 },
  themeName: { fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 7 },
});
