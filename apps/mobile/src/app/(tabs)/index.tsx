import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { AppHeader, Card, ProgressBar, Screen, SectionHeader } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function HomeScreen() {
  const { puzzles, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const active = puzzles.find((puzzle) => !puzzle.session.completedAt);
  const completed = puzzles.filter((puzzle) => puzzle.session.completedAt).slice(0, 5);

  return (
    <Screen>
      <AppHeader />
      <SectionHeader title={t("Continue", "Continue")} />
      {active ? <ContinueCard puzzle={active} /> : (
        <LinearGradient colors={[`${colors.accent}22`, `${colors.primary}24`]} style={[styles.emptyHero, { borderColor: `${colors.accent}42`, borderRadius: colors.radius }]}>
          <Ionicons name="sparkles" size={28} color={colors.accent} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("Sua próxima memória começa aqui", "Your next memory starts here")}</Text>
          <Pressable onPress={() => router.push("/(tabs)/create")} style={[styles.compactCta, { backgroundColor: colors.accent }]}><Text style={styles.compactCtaText}>{t("Criar puzzle", "Create puzzle")}</Text></Pressable>
        </LinearGradient>
      )}

      <LinearGradient colors={[`${colors.accent}0d`, `${colors.primary}18`]} style={[styles.challenge, { borderColor: `${colors.accent}42`, borderRadius: colors.radius }]}>
        <View style={{ flex: 1 }}><Text style={[styles.kicker, { color: colors.primary }]}>{t("DESAFIO DIÁRIO", "DAILY CHALLENGE")}</Text><Text style={[styles.challengeTitle, { color: colors.text }]}>{t("Nebulosa Neon", "Neon Nebula")}</Text><Text style={[styles.body, { color: colors.muted }]}>{t("Complete para ganhar 500 XP", "Complete for a 500 XP bonus")}</Text></View>
        <View style={[styles.challengeIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name="extension-puzzle" size={30} color={colors.accent} /></View>
      </LinearGradient>

      <View style={styles.quickRow}>
        <QuickAction icon="add-outline" label={t("Novo puzzle", "New puzzle")} onPress={() => router.push("/(tabs)/create")} />
        <QuickAction icon="search-outline" label={t("Explorar", "Browse")} onPress={() => router.push("/(tabs)/puzzles")} />
      </View>

      <SectionHeader title={t("Concluídos recentemente", "Recently completed")} action={completed.length ? t("VER TODOS", "VIEW ALL") : undefined} onAction={() => router.push("/(tabs)/puzzles")} />
      {completed.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
          {completed.map((puzzle) => <CompletedCard key={puzzle.id} puzzle={puzzle} />)}
        </ScrollView>
      ) : (
        <Card style={{ alignItems: "center", gap: 8 }}><Ionicons name="images-outline" size={29} color={colors.accent} /><Text style={[styles.cardTitle, { color: colors.text }]}>{t("Nenhum puzzle concluído ainda", "No completed puzzles yet")}</Text><Text style={[styles.body, { color: colors.muted, textAlign: "center" }]}>{t("Sua galeria aparecerá aqui.", "Your gallery will appear here.")}</Text></Card>
      )}
    </Screen>
  );
}

function ContinueCard({ puzzle }: { puzzle: ReturnType<typeof useApp>["puzzles"][number] }) {
  const { t, theme } = useApp();
  const colors = mobileThemes[theme];
  const placed = puzzle.session.pieces.filter((piece) => piece.isPlaced).length;
  const progress = Math.round((placed / puzzle.session.pieces.length) * 100);
  return (
    <Pressable onPress={() => router.push(`/puzzle/${puzzle.id}`)} style={({ pressed }) => [styles.continueCard, { borderColor: `${colors.accent}40`, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 }]}>
      <Image source={{ uri: puzzle.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={["transparent", "rgba(5,9,20,.94)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.continueBottom}>
        <View style={styles.playCircle}><Ionicons name="play" size={25} color="#063238" /></View>
        <Text numberOfLines={1} style={styles.heroTitle}>{puzzle.name}</Text>
        <Text style={styles.heroMeta}>{puzzle.configuration.totalPieces} {t("peças", "pieces")} · {progress}%</Text>
        <ProgressBar value={progress} />
      </View>
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { theme } = useApp(); const colors = mobileThemes[theme];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.quick, animatedStyle]}><Pressable onPress={onPress} onPressIn={() => { scale.set(withSpring(.9, { damping: 13, stiffness: 280 })); }} onPressOut={() => { scale.set(withSpring(1, { damping: 11, stiffness: 230 })); }} style={styles.quickPressable}><View style={[styles.quickIcon, { backgroundColor: colors.panel, borderColor: `${colors.accent}40`, borderRadius: Math.max(7, colors.radius) }]}><Ionicons name={icon} size={28} color={colors.accent} /></View><Text style={[styles.quickLabel, { color: colors.text }]}>{label}</Text></Pressable></Animated.View>;
}

function CompletedCard({ puzzle }: { puzzle: ReturnType<typeof useApp>["puzzles"][number] }) {
  const { theme } = useApp(); const colors = mobileThemes[theme];
  return <Pressable onPress={() => router.push(`/result/${puzzle.id}` as never)} style={[styles.completedCard, { backgroundColor: colors.panel, borderRadius: colors.radius }]}><Image source={{ uri: puzzle.imageUri }} style={styles.completedImage} contentFit="cover" /><Text numberOfLines={1} style={[styles.completedName, { color: colors.text }]}>{puzzle.name}</Text><Text style={[styles.completedMeta, { color: colors.muted }]}>{puzzle.configuration.totalPieces} pieces · 100%</Text></Pressable>;
}

const styles = StyleSheet.create({
  continueCard: { height: 230, borderRadius: 28, overflow: "hidden", borderWidth: 1, marginBottom: 18 },
  continueBottom: { position: "absolute", left: 18, right: 18, bottom: 17 },
  playCircle: { position: "absolute", right: 0, bottom: 33, width: 56, height: 56, borderRadius: 28, backgroundColor: "#8cebf1", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "white", fontFamily: "BricolageGrotesque_700Bold", fontSize: 23, maxWidth: "72%" },
  heroMeta: { color: "#d6dbea", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 3, marginBottom: 12 },
  emptyHero: { minHeight: 190, borderRadius: 28, borderWidth: 1, padding: 22, justifyContent: "center", gap: 12, marginBottom: 18 },
  emptyTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 23, maxWidth: 280 },
  compactCta: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 18, paddingVertical: 11 },
  compactCtaText: { color: "#00363a", fontFamily: "Inter_700Bold" },
  challenge: { flexDirection: "row", minHeight: 116, borderRadius: 23, borderWidth: 1, padding: 18, alignItems: "center", marginBottom: 22 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2 },
  challengeTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 20, marginTop: 5 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  challengeIcon: { width: 60, height: 60, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  quickRow: { flexDirection: "row", justifyContent: "center", gap: 20, marginBottom: 30 },
  quick: { flex: 1, maxWidth: 154 },
  quickPressable: { width: "100%", alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 6, paddingVertical: 4 },
  quickIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quickLabel: { width: "100%", fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 19, marginTop: 13, textAlign: "center" },
  completedCard: { width: 230, borderRadius: 22, overflow: "hidden", paddingBottom: 14 },
  completedImage: { width: "100%", height: 145 },
  completedName: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 17, marginHorizontal: 14, marginTop: 11 },
  completedMeta: { fontFamily: "Inter_400Regular", fontSize: 12, marginHorizontal: 14, marginTop: 3 },
  cardTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 17 },
});
