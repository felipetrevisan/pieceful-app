import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { PrimaryButton, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getPuzzleXp } from "@/lib/progression";
import { createTimelapse, saveTimelapse, shareTimelapse } from "@/lib/native-timelapse";
import { useApp } from "@/state/app-provider";
import PiecefulGameServices from "../../../modules/my-module/src/PiecefulGameServicesModule";

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { puzzles, t, theme, language } = useApp();
  const colors = mobileThemes[theme];
  const { showAlert } = usePiecefulAlert();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const puzzle = puzzles.find((item) => item.id === id);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  useEffect(() => {
    const subscription = PiecefulGameServices?.addListener(
      "onTimelapseProgress",
      ({ progress: next }) => setProgress(next),
    );
    return () => subscription?.remove();
  }, []);

  if (!puzzle) {
    return (
      <SafeAreaView style={[styles.missing, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>
          {t("Quebra-cabeça não encontrado", "Puzzle not found")}
        </Text>
      </SafeAreaView>
    );
  }

  const imageAspect = puzzle.configuration.columns / puzzle.configuration.rows;
  const resultMaxWidth = Math.min(600, viewportWidth - 40);
  const resultMaxHeight = Math.min(420, viewportHeight * 0.46);
  const resultImageWidth = Math.min(resultMaxWidth, resultMaxHeight * imageAspect);
  const resultImageHeight = resultImageWidth / imageAspect;

  const prepareTimelapse = async () => {
    if (!puzzle.session.completedAt && !puzzle.session.pieces.every((piece) => piece.isPlaced)) {
      showAlert(
        t("Quebra-cabeça incompleto", "Incomplete puzzle"),
        t(
          "Finalize o quebra-cabeça para gerar o timelapse.",
          "Finish the puzzle to create its timelapse.",
        ),
      );
      return null;
    }
    if (videoUri) return videoUri;
    setProgress(0);
    const uri = await createTimelapse(puzzle, language);
    setVideoUri(uri);
    return uri;
  };

  const runVideoAction = async (action: "save" | "share") => {
    setCreating(true);
    try {
      const uri = await prepareTimelapse();
      if (!uri) return;
      if (action === "save") {
        await saveTimelapse(uri, language);
        showAlert(
          t("Vídeo salvo!", "Video saved!"),
          t(
            "O timelapse foi adicionado à galeria, na pasta Movies/Pieceful.",
            "The timelapse was added to your gallery in Movies/Pieceful.",
          ),
        );
      } else {
        await shareTimelapse(uri, language);
      }
    } catch (error) {
      showAlert(
        action === "save"
          ? t("Não foi possível salvar o vídeo", "Couldn't save the video")
          : t("Não foi possível compartilhar o vídeo", "Couldn't share the video"),
        error instanceof Error ? error.message : t("Tente novamente.", "Try again."),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.accent}18`, "transparent", `${colors.primary}12`]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[`${colors.accent}45`, `${colors.primary}45`]}
          style={styles.achievement}
        >
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Ionicons name="ribbon-outline" size={22} color="#063238" />
          </View>
          <View>
            <Text style={[styles.kicker, { color: colors.accent }]}>
              {t("CONQUISTA DESBLOQUEADA", "ACHIEVEMENT UNLOCKED")}
            </Text>
            <Text style={[styles.achievementTitle, { color: colors.text }]}>
              {t("Olho de Águia", "Eagle Eye")}
            </Text>
          </View>
        </LinearGradient>
        <Text style={[styles.title, { color: colors.accent }]}>
          {t("Memória\nReconstruída", "Memory\nReconstructed")}
        </Text>
        <View style={styles.imageStage}>
          <View
            style={[
              styles.imageFrame,
              {
                borderColor: colors.accent,
                width: resultImageWidth,
                height: resultImageHeight,
              },
            ]}
          >
            <Image
              source={{ uri: puzzle.imageUri }}
              style={styles.image}
              contentFit="contain"
              transition={220}
            />
          </View>
        </View>
        <View style={styles.stats}>
          <Stat
            icon="extension-puzzle-outline"
            value={`${puzzle.configuration.totalPieces}`}
            label={t("Peças", "Pieces")}
          />
          <Stat
            icon="timer-outline"
            value={formatTime(puzzle.session.elapsedTime)}
            label={t("Tempo", "Time")}
          />
          <Stat
            icon="bulb-outline"
            value={`${puzzle.session.hintsUsed}`}
            label={t("Dicas", "Hints")}
          />
          <Stat
            icon="star-outline"
            value={`+${getPuzzleXp(puzzle)}`}
            label="XP"
            accent
          />
        </View>
        {creating ? (
          <View
            style={[
              styles.generationStatus,
              { backgroundColor: colors.panel, borderColor: `${colors.accent}45` },
            ]}
          >
            <View style={styles.generationHeader}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.generationText, { color: colors.text }]}>
                {t(`Criando vídeo… ${progress}%`, `Creating video… ${progress}%`)}
              </Text>
            </View>
            <View style={[styles.generationTrack, { backgroundColor: `${colors.muted}25` }]}>
              <View
                style={[
                  styles.generationFill,
                  { backgroundColor: colors.accent, width: `${progress}%` },
                ]}
              />
            </View>
          </View>
        ) : null}
        <PrimaryButton icon="add-circle-outline" onPress={() => router.replace("/(tabs)/create")}>
          {t("Criar novo quebra-cabeça", "Create new puzzle")}
        </PrimaryButton>
        <SecondaryButton
          icon="download-outline"
          disabled={creating}
          onPress={() => void runVideoAction("save")}
        >
          {creating
            ? t("Preparando vídeo…", "Preparing video…")
            : videoUri
              ? t("Salvar vídeo no dispositivo", "Save video to device")
              : t("Gerar e salvar vídeo", "Create and save video")}
        </SecondaryButton>
        <SecondaryButton
          icon="share-social-outline"
          disabled={creating}
          onPress={() => void runVideoAction("share")}
        >
          {videoUri
            ? t("Compartilhar vídeo", "Share video")
            : t("Gerar e compartilhar vídeo", "Create and share video")}
        </SecondaryButton>
        <SecondaryButton icon="albums-outline" onPress={() => router.replace("/(tabs)/puzzles")}>
          {t("Voltar para coleção", "Back to collection")}
        </SecondaryButton>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  icon,
  value,
  label,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  accent?: boolean;
}) {
  const { theme } = useApp();
  const c = mobileThemes[theme];
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: accent ? `${c.primary}25` : c.panel, borderColor: `${c.muted}32` },
      ]}
    >
      <Ionicons name={icon} size={21} color={accent ? c.primary : c.accent} />
      <Text style={[styles.statValue, { color: accent ? c.primary : c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
    </View>
  );
}
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 50, gap: 15 },
  achievement: {
    minHeight: 74,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.1 },
  achievementTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 20 },
  title: {
    fontFamily: "BricolageGrotesque_800ExtraBold",
    fontSize: 43,
    lineHeight: 47,
    textAlign: "center",
    textShadowColor: "rgba(0,242,255,.35)",
    textShadowRadius: 12,
    marginVertical: 10,
  },
  imageStage: { width: "100%", alignItems: "center", justifyContent: "center" },
  imageFrame: { borderRadius: 23, borderWidth: 1.5, overflow: "hidden", padding: 3 },
  image: { width: "100%", height: "100%", borderRadius: 19 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    width: "48%",
    minHeight: 112,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  statValue: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 23 },
  statLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  generationStatus: { gap: 10, padding: 14, borderRadius: 18, borderWidth: 1 },
  generationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  generationTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  generationFill: { height: "100%", borderRadius: 4 },
  generationText: { fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "center" },
});
