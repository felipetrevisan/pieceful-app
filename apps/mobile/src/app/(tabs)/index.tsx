import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { FrostedBackdrop } from "@/components/frosted-surface";
import { AppHeader, Card, ProgressBar, Screen, SectionHeader } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

const SCREEN_HORIZONTAL_PADDING = 20;

export default function HomeScreen() {
  const { ageGroup, puzzles, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const { width } = useWindowDimensions();
  const pageWidth = width - SCREEN_HORIZONTAL_PADDING * 2;
  const [heroPage, setHeroPage] = useState(0);
  const active = puzzles.find((puzzle) => !puzzle.session.completedAt);
  const completed = puzzles.filter((puzzle) => puzzle.session.completedAt).slice(0, 5);

  return (
    <Screen parallax>
      <AppHeader />
      <SectionHeader title={ageGroup === "child" ? t("Vamos brincar?", "Ready to play?") : t("Continue", "Continue")} />
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SCREEN_HORIZONTAL_PADDING }}
        onMomentumScrollEnd={(event) => {
          setHeroPage(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
        }}
      >
        <View style={{ width: pageWidth, paddingHorizontal: SCREEN_HORIZONTAL_PADDING }}>
          {active ? <ContinueCard puzzle={active} /> : (
            <LinearGradient colors={[`${colors.accent}22`, `${colors.primary}24`]} style={[styles.emptyHero, { borderColor: `${colors.accent}42`, borderRadius: Math.max(24, colors.radius) }]}>
              <Ionicons name="sparkles" size={28} color={colors.accent} />
              <Text maxFontSizeMultiplier={1.2} style={[styles.emptyTitle, { color: colors.text }]}>{ageGroup === "child" ? t("Escolha uma aventura bem colorida!", "Choose a colorful adventure!") : t("Sua próxima memória começa aqui", "Your next memory starts here")}</Text>
              <Pressable onPress={() => router.push("/(tabs)/create")} style={[styles.compactCta, { backgroundColor: colors.accent }]}><Text adjustsFontSizeToFit maxFontSizeMultiplier={1.2} minimumFontScale={0.86} numberOfLines={1} style={styles.compactCtaText}>{t("Criar quebra-cabeça", "Create puzzle")}</Text></Pressable>
            </LinearGradient>
          )}
        </View>

        <View style={{ width: pageWidth, paddingHorizontal: SCREEN_HORIZONTAL_PADDING }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Começar desafio diário", "Start daily challenge")}
            onPress={() => router.push("/(tabs)/create")}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
          >
            <LinearGradient colors={[`${colors.accent}0d`, `${colors.primary}18`]} style={[styles.challenge, { borderColor: `${colors.accent}42`, borderRadius: Math.max(24, colors.radius) }]}>
              <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.kicker, { color: colors.primary }]}>{ageGroup === "child" ? t("MISSÃO DE HOJE", "TODAY'S MISSION") : t("DESAFIO DIÁRIO", "DAILY CHALLENGE")}</Text><Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.challengeTitle, { color: colors.text }]}>{ageGroup === "child" ? t("Mundo Arco-Íris", "Rainbow World") : t("Nebulosa Neon", "Neon Nebula")}</Text><Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.body, { color: colors.muted }]}>{t("Toque para começar · vale 500 XP", "Tap to start · earn 500 XP")}</Text></View>
              <View style={[styles.challengeIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name="arrow-forward" size={30} color={colors.accent} /></View>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.heroPagination}>
        {[0, 1].map((index) => (
          <View
            key={index}
            style={[
              styles.heroDot,
              {
                width: index === heroPage ? 22 : 7,
                backgroundColor: index === heroPage ? colors.accent : `${colors.muted}55`,
              },
            ]}
          />
        ))}
      </View>

      <SectionHeader title={t("Concluídos recentemente", "Recently completed")} action={completed.length ? t("VER TODOS", "VIEW ALL") : undefined} onAction={() => router.push("/(tabs)/puzzles")} />
      {completed.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
          {completed.map((puzzle) => <CompletedCard key={puzzle.id} puzzle={puzzle} />)}
        </ScrollView>
      ) : (
        <Card style={styles.emptyGalleryCard}>
          <Ionicons name="images-outline" size={29} color={colors.accent} />
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.cardTitle, styles.emptyGalleryTitle, { color: colors.text }]}
          >
            {t("Nenhum quebra-cabeça concluído", "No completed puzzles")}
          </Text>
        </Card>
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
    <Pressable onPress={() => router.push(`/puzzle/${puzzle.id}`)} style={({ pressed }) => [styles.continueCard, { borderColor: `${colors.accent}40`, borderRadius: Math.max(24, colors.radius), opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.continueImageWrap}>
        <Image source={{ uri: puzzle.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["transparent", "rgba(5,9,20,.5)"]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.continueContent}>
        <FrostedBackdrop intensity={55} />
        <View style={styles.continueCopy}>
          <Text numberOfLines={1} style={[styles.heroTitle, { color: colors.text }]}>{puzzle.name}</Text>
          <Text style={[styles.heroMeta, { color: colors.muted }]}>{puzzle.configuration.totalPieces} {t("peças", "pieces")} · {progress}%</Text>
        </View>
        <View style={[styles.playCircle, { backgroundColor: colors.accent }]}><Ionicons name="play" size={23} color={colors.background} /></View>
        <View style={styles.continueProgress}><ProgressBar value={progress} /></View>
      </View>
    </Pressable>
  );
}

function CompletedCard({ puzzle }: { puzzle: ReturnType<typeof useApp>["puzzles"][number] }) {
  const { t, theme } = useApp(); const colors = mobileThemes[theme];
  return <Pressable onPress={() => router.push(`/result/${puzzle.id}` as never)} style={[styles.completedCard, { backgroundColor: colors.panel, borderRadius: colors.radius }]}><Image source={{ uri: puzzle.imageUri }} style={styles.completedImage} contentFit="cover" /><Text numberOfLines={1} style={[styles.completedName, { color: colors.text }]}>{puzzle.name}</Text><Text style={[styles.completedMeta, { color: colors.muted }]}>{puzzle.configuration.totalPieces} {t("peças", "pieces")} · 100%</Text></Pressable>;
}

const styles = StyleSheet.create({
  heroPagination: {
    height: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 22,
  },
  heroDot: { height: 7, borderRadius: 99 },
  continueCard: { width: "100%", minHeight: 248, borderRadius: 28, overflow: "hidden", borderWidth: 1 },
  continueImageWrap: { width: "100%", height: 128, overflow: "hidden" },
  continueContent: { minHeight: 120, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 15, overflow: "hidden" },
  continueCopy: { minHeight: 50, paddingRight: 46 },
  playCircle: { position: "absolute", right: 12, top: 13, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  continueProgress: { marginTop: 9 },
  heroTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 },
  heroMeta: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 3 },
  emptyHero: { width: "100%", minHeight: 248, borderRadius: 28, borderWidth: 1, padding: 18, justifyContent: "center", gap: 10 },
  emptyTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 19, maxWidth: 280 },
  compactCta: { alignSelf: "stretch", minHeight: 44, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  compactCtaText: { color: "#00363a", fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "center" },
  challenge: { width: "100%", flexDirection: "row", minHeight: 248, borderRadius: 23, borderWidth: 1, padding: 20, alignItems: "center", overflow: "hidden" },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2 },
  challengeTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 22, marginTop: 6 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginTop: 5 },
  challengeIcon: { width: 60, height: 60, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  completedCard: { width: 230, borderRadius: 22, overflow: "hidden", paddingBottom: 14 },
  completedImage: { width: "100%", height: 145 },
  completedName: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 17, marginHorizontal: 14, marginTop: 11 },
  completedMeta: { fontFamily: "Inter_400Regular", fontSize: 12, marginHorizontal: 14, marginTop: 3 },
  cardTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 17 },
  emptyGalleryCard: { alignItems: "center", justifyContent: "center", gap: 10 },
  emptyGalleryTitle: { width: "100%", textAlign: "center" },
});
