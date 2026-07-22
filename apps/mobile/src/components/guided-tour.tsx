import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

const steps = [
  {
    icon: "sparkles-outline",
    eyebrow: ["BEM-VINDO", "WELCOME"],
    title: ["Seu espaço para montar memórias", "Your place to piece memories together"],
    description: ["Transforme qualquer foto em um puzzle, acompanhe seu progresso e continue quando quiser.", "Turn any photo into a puzzle, track your progress, and continue whenever you like."],
    tips: [["image-outline", "Escolha sua foto", "Choose your photo"], ["color-palette-outline", "Use o tema que combina com você", "Pick a theme that feels like you"]],
  },
  {
    icon: "add-circle-outline",
    eyebrow: ["CRIE EM SEGUNDOS", "CREATE IN SECONDS"],
    title: ["A foto define o formato", "Your photo defines the shape"],
    description: ["Escolha uma imagem e ajuste a dificuldade. O app detecta automaticamente se o puzzle é vertical, horizontal ou quadrado.", "Choose an image and set the difficulty. The app automatically detects portrait, landscape, or square format."],
    tips: [["sync-outline", "Rotação: as peças começam giradas e exigem dois toques para alinhar", "Rotation: pieces start turned and need a double tap to align"], ["bulb-outline", "Dicas: encaixam automaticamente uma peça quando você precisar", "Hints: automatically place one piece when you need help"], ["timer-outline", "Cronômetro: registra quanto tempo você levou para concluir", "Timer: records how long you take to finish"]],
  },
  {
    icon: "file-tray-full-outline",
    eyebrow: ["BANDEJA DE PEÇAS", "PIECE TRAY"],
    title: ["Leve só as peças que quiser", "Bring out only the pieces you want"],
    description: ["Deslize a bandeja inferior para cima. Arraste peças para o tabuleiro e leve-as até a caixa para guardá-las novamente.", "Swipe the bottom tray up. Drag pieces onto the board and move them to the box to store them again."],
    tips: [["hand-left-outline", "Arraste livremente pelo tabuleiro", "Drag freely around the board"], ["magnet-outline", "Peças corretas grudam quando estão próximas", "Correct pieces snap when they are close"]],
  },
  {
    icon: "hand-right-outline",
    eyebrow: ["GESTOS NATURAIS", "NATURAL GESTURES"],
    title: ["Use os dedos como numa mesa", "Use your fingers like a tabletop"],
    description: ["Dê zoom com dois dedos, arraste uma área vazia para mover o tabuleiro e toque duas vezes numa peça para girá-la.", "Pinch with two fingers, drag an empty area to pan, and double-tap a piece to rotate it."],
    tips: [["resize-outline", "Pinça: zoom", "Pinch: zoom"], ["sync-outline", "Dois toques: girar 90°", "Double tap: rotate 90°"]],
  },
  {
    icon: "trophy-outline",
    eyebrow: ["SUA EVOLUÇÃO", "YOUR PROGRESS"],
    title: ["XP mostra sua experiência", "XP shows your experience"],
    description: ["Você ganha XP ao encaixar peças e concluir puzzles. A cada 1.000 XP seu nível aumenta e você pode comparar sua evolução com amigos.", "You earn XP by placing pieces and completing puzzles. Every 1,000 XP raises your level, and you can compare progress with friends."],
    tips: [["star-outline", "XP mede sua progressão no Pieceful", "XP tracks your Pieceful progression"], ["ribbon-outline", "Conquistas celebram marcos e desafios especiais", "Achievements celebrate milestones and special challenges"]],
  },
  {
    icon: "albums-outline",
    eyebrow: ["TUDO ORGANIZADO", "EVERYTHING ORGANIZED"],
    title: ["Seu progresso fica salvo", "Your progress stays saved"],
    description: ["Encontre puzzles em andamento e concluídos na Coleção. Ao terminar, gere o timelapse e compartilhe sua conquista.", "Find active and completed puzzles in Collection. When finished, create a timelapse and share your achievement."],
    tips: [["trophy-outline", "Ganhe conquistas e XP", "Earn achievements and XP"], ["videocam-outline", "Gere o vídeo após concluir", "Create a video after completing"]],
  },
] as const;

export function GuidedTour() {
  const { completeTour, preferences, t, theme, tourOpen } = useApp();
  const colors = mobileThemes[theme];
  const [index, setIndex] = useState(0);
  const iconLift = useSharedValue(0);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    if (preferences.reducedMotion) return;
    iconLift.set(withRepeat(withSequence(withTiming(-7, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1, true));
  }, [iconLift, preferences.reducedMotion]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: iconLift.value }] }));

  function next() {
    if (preferences.haptics) void Haptics.selectionAsync();
    if (last) {
      finish();
      return;
    }
    setIndex((current) => current + 1);
  }

  function previous() {
    if (preferences.haptics) void Haptics.selectionAsync();
    setIndex((current) => Math.max(0, current - 1));
  }

  function finish() {
    setIndex(0);
    completeTour();
  }

  return (
    <Modal animationType="fade" onRequestClose={finish} statusBarTranslucent transparent visible={tourOpen}>
      <View accessibilityViewIsModal style={styles.overlay}>
        <LinearGradient colors={[`${colors.background}d9`, "rgba(2,5,16,.97)"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: `${colors.accent}55`, borderRadius: Math.max(24, colors.radius) }]}>
          <LinearGradient colors={[`${colors.accent}20`, `${colors.primary}08`, "transparent"]} style={StyleSheet.absoluteFill} />
          <View style={styles.topRow}>
            <View style={styles.dots}>
              {steps.map((item, dotIndex) => <View key={item.eyebrow[0]} style={[styles.dot, { backgroundColor: dotIndex === index ? colors.accent : `${colors.muted}55` }, dotIndex === index ? styles.activeDot : null]} />)}
            </View>
            <Pressable accessibilityLabel={t("Pular tutorial", "Skip tutorial")} accessibilityRole="button" hitSlop={12} onPress={finish} style={({ pressed }) => [styles.skip, { opacity: pressed ? .55 : 1 }]}>
              <Text maxFontSizeMultiplier={1.15} style={[styles.skipText, { color: colors.muted }]}>{t("PULAR", "SKIP")}</Text>
            </Pressable>
          </View>

          <Animated.View style={[styles.heroIcon, { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}55` }, iconStyle]}>
            <Ionicons name={step.icon} size={48} color={colors.accent} />
            <View style={[styles.iconOrb, { backgroundColor: `${colors.primary}45` }]} />
          </Animated.View>

          <Animated.View key={`copy-${index}`} entering={preferences.reducedMotion ? undefined : FadeInDown.duration(360)} style={styles.copy}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.eyebrow, { color: colors.primary }]}>{t(step.eyebrow[0], step.eyebrow[1])}</Text>
            <Text maxFontSizeMultiplier={1.15} style={[styles.title, { color: colors.text }]}>{t(step.title[0], step.title[1])}</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.description, { color: colors.muted }]}>{t(step.description[0], step.description[1])}</Text>
          </Animated.View>

          <Animated.View key={`tips-${index}`} entering={preferences.reducedMotion ? undefined : FadeInDown.delay(80).duration(340)} style={styles.tips}>
            {step.tips.map(([icon, portuguese, english]) => (
              <View key={portuguese} style={[styles.tip, { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}28` }]}>
                <View style={[styles.tipIcon, { backgroundColor: `${colors.accent}16` }]}><Ionicons name={icon} size={21} color={colors.accent} /></View>
                <Text maxFontSizeMultiplier={1.15} style={[styles.tipText, { color: colors.text }]}>{t(portuguese, english)}</Text>
              </View>
            ))}
          </Animated.View>

          <View style={[styles.actions, index === 0 ? styles.actionsSolo : null]}>
            {index > 0 ? (
              <Pressable accessibilityLabel={t("Voltar", "Back")} accessibilityRole="button" onPress={previous} style={({ pressed }) => [styles.backButton, { opacity: pressed ? .65 : 1 }]}>
                <LinearGradient colors={[...colors.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.backButtonFill}>
                  <Ionicons name="chevron-back" size={25} color="#17102d" />
                </LinearGradient>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => [styles.nextShell, index === 0 ? styles.nextShellSolo : styles.nextShellWithBack, { opacity: pressed ? .75 : 1 }]}>
              <LinearGradient colors={[...colors.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextButton}>
                <Text maxFontSizeMultiplier={1.15} style={styles.nextText}>{last ? t("COMEÇAR", "GET STARTED") : t("PRÓXIMO", "NEXT")}</Text>
                <Ionicons name={last ? "checkmark" : "arrow-forward"} size={20} color="#17102d" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 24, paddingTop: 56 },
  card: { width: "100%", maxWidth: 460, alignSelf: "center", borderWidth: 1, overflow: "hidden", padding: 22, shadowColor: "#000", shadowOpacity: .48, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 24 },
  topRow: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  activeDot: { width: 24 },
  skip: { minHeight: 36, justifyContent: "center", paddingLeft: 16 },
  skipText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2 },
  heroIcon: { width: 104, height: 104, borderRadius: 34, borderWidth: 1, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 18, marginBottom: 20, overflow: "hidden" },
  iconOrb: { position: "absolute", width: 48, height: 48, right: -12, top: -10, borderRadius: 24 },
  copy: { alignItems: "center" },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.7, textAlign: "center" },
  title: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 28, lineHeight: 33, marginTop: 9, textAlign: "center" },
  description: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: "center" },
  tips: { alignSelf: "center", gap: 9, marginTop: 20, width: "100%" },
  tip: { alignSelf: "center", width: "100%", minHeight: 54, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 8 },
  tipIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tipText: { flex: 1, minWidth: 0, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  actions: { alignSelf: "stretch", width: "100%", flexDirection: "row", alignItems: "stretch", gap: 10, marginTop: 20 },
  actionsSolo: { flexDirection: "column" },
  backButton: { width: 56, height: 56, borderRadius: 28, overflow: "hidden" },
  backButtonFill: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  nextShell: { minHeight: 56, borderRadius: 20, overflow: "hidden" },
  nextShellSolo: { alignSelf: "stretch", width: "100%" },
  nextShellWithBack: { flex: 1, minWidth: 0 },
  nextButton: { width: "100%", minHeight: 56, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  nextText: { color: "#17102d", fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: .6 },
});
