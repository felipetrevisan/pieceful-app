import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { createAndShareTimelapse } from "@/lib/native-timelapse";
import { useApp } from "@/state/app-provider";
import PiecefulGameServices from "../../../modules/my-module/src/PiecefulGameServicesModule";

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { puzzles, t, theme, language } = useApp();
  const colors = mobileThemes[theme];
  const puzzle = puzzles.find((item) => item.id === id);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const subscription = PiecefulGameServices?.addListener("onTimelapseProgress", ({ progress: next }) => setProgress(next));
    return () => subscription?.remove();
  }, []);

  if (!puzzle) {
    return <SafeAreaView style={[styles.missing, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>{t("Quebra-cabeça não encontrado", "Puzzle not found")}</Text></SafeAreaView>;
  }

  const shareTimelapse = async () => {
    if (!puzzle.session.completedAt && !puzzle.session.pieces.every((piece) => piece.isPlaced)) {
      Alert.alert(t("Quebra-cabeça incompleto", "Incomplete puzzle"), t("Finalize o quebra-cabeça para gerar o timelapse.", "Finish the puzzle to create its timelapse."));
      return;
    }
    setCreating(true); setProgress(0);
    try {
      await createAndShareTimelapse(puzzle, language);
    } catch (error) {
      Alert.alert(t("Não foi possível criar o vídeo", "Couldn't create the video"), error instanceof Error ? error.message : t("Tente novamente.", "Try again."));
    } finally {
      setCreating(false);
    }
  };

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
    <LinearGradient colors={[`${colors.accent}18`, "transparent", `${colors.primary}12`]} style={StyleSheet.absoluteFill} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[`${colors.accent}45`, `${colors.primary}45`]} style={styles.achievement}>
        <View style={[styles.badge, { backgroundColor: colors.accent }]}><Ionicons name="ribbon-outline" size={22} color="#063238" /></View>
        <View><Text style={[styles.kicker, { color: colors.accent }]}>{t("CONQUISTA DESBLOQUEADA", "ACHIEVEMENT UNLOCKED")}</Text><Text style={[styles.achievementTitle, { color: colors.text }]}>{t("Olho de Águia", "Eagle Eye")}</Text></View>
      </LinearGradient>
      <Text style={[styles.title, { color: colors.accent }]}>{t("Memória\nReconstruída", "Memory\nReconstructed")}</Text>
      <View style={[styles.imageFrame, { borderColor: colors.accent }]}><Image source={{ uri: puzzle.imageUri }} style={[styles.image, { aspectRatio: puzzle.configuration.columns / puzzle.configuration.rows }]} contentFit="cover" transition={220} /></View>
      <View style={styles.stats}><Stat icon="extension-puzzle-outline" value={`${puzzle.configuration.totalPieces}`} label={t("Peças", "Pieces")} /><Stat icon="timer-outline" value={formatTime(puzzle.session.elapsedTime)} label={t("Tempo", "Time")} /><Stat icon="bulb-outline" value={`${puzzle.session.hintsUsed}`} label={t("Dicas", "Hints")} /><Stat icon="star-outline" value={`+${puzzle.configuration.totalPieces * 3}`} label="XP" accent /></View>
      <View style={[styles.replay, { backgroundColor: colors.panel, borderColor: `${colors.muted}38` }]}>
        <Text style={[styles.kicker, { color: colors.muted }]}>{t("TIMELAPSE DA MONTAGEM", "ASSEMBLY TIMELAPSE")}</Text>
        <View><Image source={{ uri: puzzle.imageUri }} style={[styles.videoImage, { aspectRatio: puzzle.configuration.columns / puzzle.configuration.rows }]} contentFit="cover" /><View style={[styles.play, { backgroundColor: `${colors.background}CC` }]}>{creating ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="videocam" size={24} color={colors.accent} />}</View></View>
        {creating && <View style={styles.generationStatus}><View style={[styles.generationTrack, { backgroundColor: `${colors.muted}25` }]}><View style={[styles.generationFill, { backgroundColor: colors.accent, width: `${progress}%` }]} /></View><Text style={[styles.generationText, { color: colors.muted }]}>{t(`Criando vídeo… ${progress}%`, `Creating video… ${progress}%`)}</Text></View>}
      </View>
      <PrimaryButton icon="add-circle-outline" onPress={() => router.replace("/(tabs)/create")}>{t("Criar novo quebra-cabeça", "Create new puzzle")}</PrimaryButton>
      <SecondaryButton icon="share-social-outline" disabled={creating} onPress={shareTimelapse}>{creating ? t("Criando vídeo…", "Creating video…") : t("Gerar e compartilhar vídeo", "Create and share video")}</SecondaryButton>
      <SecondaryButton icon="albums-outline" onPress={() => router.replace("/(tabs)/puzzles")}>{t("Voltar para coleção", "Back to collection")}</SecondaryButton>
    </ScrollView>
  </SafeAreaView>;
}

function Stat({ icon, value, label, accent }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; accent?: boolean }) {
  const { theme } = useApp(); const c = mobileThemes[theme];
  return <View style={[styles.stat, { backgroundColor: accent ? `${c.primary}25` : c.panel, borderColor: `${c.muted}32` }]}><Ionicons name={icon} size={21} color={accent ? c.primary : c.accent} /><Text style={[styles.statValue, { color: accent ? c.primary : c.text }]}>{value}</Text><Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text></View>;
}
function formatTime(seconds: number) { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${String(s).padStart(2, "0")}`; }
const styles = StyleSheet.create({ safe: { flex: 1 }, missing: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 20, paddingBottom: 50, gap: 15 }, achievement: { minHeight: 74, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16 }, badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.1 }, achievementTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 20 }, title: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 43, lineHeight: 47, textAlign: "center", textShadowColor: "rgba(0,242,255,.35)", textShadowRadius: 12, marginVertical: 10 }, imageFrame: { borderRadius: 23, borderWidth: 1.5, overflow: "hidden", padding: 3 }, image: { width: "100%", borderRadius: 19 }, stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, stat: { width: "48%", minHeight: 112, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 3 }, statValue: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 23 }, statLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11 }, replay: { borderRadius: 21, borderWidth: 1, padding: 14, gap: 9 }, videoImage: { width: "100%", maxHeight: 320, borderRadius: 14 }, play: { position: "absolute", alignSelf: "center", top: "42%", width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }, generationStatus: { gap: 7, paddingTop: 3 }, generationTrack: { height: 8, borderRadius: 4, overflow: "hidden" }, generationFill: { height: "100%", borderRadius: 4 }, generationText: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" } });
