import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { PrimaryButton, SecondaryButton } from "@/components/pieceful-ui";
import { ThemeParallaxBackground } from "@/components/theme-parallax-background";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getPuzzleXp } from "@/lib/progression";
import { requestStoreReviewIfEligible } from "@/lib/store-review";
import {
  createTimelapseInBackground,
  getTimelapseJob,
  saveTimelapse,
  shareTimelapse,
} from "@/lib/native-timelapse";
import { useApp } from "@/state/app-provider";
import PiecefulGameServices, {
  type TimelapseJob,
} from "../../../modules/my-module/src/PiecefulGameServicesModule";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { puzzles, t, theme, language } = useApp();
  const colors = mobileThemes[theme];
  const { showAlert } = usePiecefulAlert();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const puzzle = puzzles.find((item) => item.id === id);
  const completedPuzzleCount = puzzles.reduce(
    (total, item) => total + (item.session.completedAt ? 1 : 0),
    0,
  );
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [backgroundJob, setBackgroundJob] = useState<TimelapseJob | null>(null);
  const reportedJobError = useRef<string | null>(null);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  useEffect(() => {
    const subscription = PiecefulGameServices?.addListener(
      "onTimelapseProgress",
      ({ progress: next }) => setProgress(next),
    );
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (!puzzle?.id || !puzzle.session.completedAt) return;

    const timer = setTimeout(() => {
      void requestStoreReviewIfEligible({
        completedPuzzles: completedPuzzleCount,
        puzzleId: puzzle.id,
      });
    }, 2_500);

    return () => clearTimeout(timer);
  }, [completedPuzzleCount, puzzle?.id, puzzle?.session.completedAt]);

  useEffect(() => {
    if (!puzzle?.id) return;
    let mounted = true;
    const refresh = async () => {
      const job = await getTimelapseJob(puzzle.id).catch(() => null);
      if (!mounted || !job) return;
      setBackgroundJob(job);
      setProgress(job.progress);
      if (job.status === "completed" && job.fileUri) setVideoUri(job.fileUri);
      if (job.status === "failed" && reportedJobError.current !== job.jobId) {
        reportedJobError.current = job.jobId;
        showAlert(
          t("Não foi possível criar o vídeo", "Couldn't create the video"),
          job.error ?? t("Tente novamente.", "Try again."),
        );
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1200);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [puzzle?.id, showAlert, t]);

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

  const prepareTimelapse = async (action: "save" | "share") => {
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
    const result = await createTimelapseInBackground(puzzle, language);
    if (result.uri) {
      setVideoUri(result.uri);
      return result.uri;
    }
    setBackgroundJob({
      jobId: result.jobId ?? puzzle.id,
      puzzleId: puzzle.id,
      status: "queued",
      progress: 0,
    });
    showAlert(
      t("Vídeo sendo criado", "Video creation started"),
      action === "share"
        ? t(
            "Você pode continuar usando o Pieceful ou fechar o app. Avisaremos quando o vídeo estiver salvo; depois, volte aqui para compartilhar.",
            "You can keep using Pieceful or close the app. We'll notify you when the video is saved; then return here to share it.",
          )
        : t(
            "Você pode continuar usando o Pieceful ou fechar o app. O vídeo será salvo na galeria e enviaremos uma notificação quando terminar.",
            "You can keep using Pieceful or close the app. The video will be saved to your gallery and we'll notify you when it's ready.",
          ),
    );
    return null;
  };

  const runVideoAction = async (action: "save" | "share") => {
    setCreating(true);
    try {
      const uri = await prepareTimelapse(action);
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

  const backgroundActive =
    backgroundJob?.status === "queued" || backgroundJob?.status === "running";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ThemeParallaxBackground celebratory scrollY={scrollY} />
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
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
            value={formatTime(puzzle.session.elapsedTime, language)}
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
        {creating || backgroundActive ? (
          <View
            style={[
              styles.generationStatus,
              { backgroundColor: colors.panel, borderColor: `${colors.accent}45` },
            ]}
          >
            <View style={styles.generationHeader}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.generationText, { color: colors.text }]}>
                {backgroundActive
                  ? t(
                      `Criando em segundo plano… ${progress}%`,
                      `Creating in background… ${progress}%`,
                    )
                  : t(`Preparando vídeo… ${progress}%`, `Preparing video… ${progress}%`)}
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
          disabled={creating || backgroundActive}
          onPress={() => void runVideoAction("save")}
        >
          {creating
            ? t("Preparando vídeo…", "Preparing video…")
            : backgroundActive
              ? t("Gerando em segundo plano…", "Creating in background…")
            : videoUri
              ? t("Salvar vídeo novamente", "Save video again")
              : t("Gerar vídeo em segundo plano", "Create video in background")}
        </SecondaryButton>
        <SecondaryButton
          icon="share-social-outline"
          disabled={creating || backgroundActive}
          onPress={() => void runVideoAction("share")}
        >
          {videoUri
            ? t("Compartilhar vídeo", "Share video")
            : t("Gerar e compartilhar vídeo", "Create and share video")}
        </SecondaryButton>
        <SecondaryButton icon="albums-outline" onPress={() => router.replace("/(tabs)/puzzles")}>
          {t("Voltar para coleção", "Back to collection")}
        </SecondaryButton>
      </Animated.ScrollView>
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
function formatTime(seconds: number, language: "pt-BR" | "en") {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  if (hours > 0) {
    return language === "en"
      ? `${hours} hr ${minutes} min`
      : `${hours} h ${minutes} min`;
  }
  if (minutes > 0) {
    return language === "en"
      ? `${minutes} min ${remaining} sec`
      : `${minutes} min ${remaining} s`;
  }
  return language === "en" ? `${remaining} sec` : `${remaining} s`;
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
