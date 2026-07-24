import { Ionicons } from "@expo/vector-icons";
import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativePuzzleBoard } from "@/components/native-puzzle-board";
import { PuzzlePieceDrawer, type ScreenFrame } from "@/components/puzzle-piece-drawer";
import { IconButton, PrimaryButton, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";
import { useMonetization } from "@/state/monetization-provider";

export default function PuzzleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { incrementPuzzleHints, puzzles, setDrawerOpen, t, theme, updatePuzzleCamera, updatePuzzleElapsedTime, updatePuzzlePieces } = useApp();
  const { premium, showRewardedHint } = useMonetization();
  const colors = mobileThemes[theme];
  const puzzle = puzzles.find((item) => item.id === id);
  const [pieces, setPieces] = useState<PuzzlePiece[]>(puzzle?.session.pieces ?? []);
  const [showReference, setShowReference] = useState(false);
  const [boardFrame, setBoardFrame] = useState<ScreenFrame | null>(null);
  const [storageFrame, setStorageFrame] = useState<ScreenFrame | null>(null);
  const [boardZoom, setBoardZoom] = useState(puzzle?.session.camera.zoom ?? 1);
  const [boardPan, setBoardPan] = useState({ x: puzzle?.session.camera.x ?? 0, y: puzzle?.session.camera.y ?? 0 });
  const [elapsedTime, setElapsedTime] = useState(puzzle?.session.elapsedTime ?? 0);
  const scrollOffset = useRef(0);

  const placed = useMemo(() => pieces.filter((piece) => piece.isPlaced).length, [pieces]);
  const progress = pieces.length ? Math.round((placed / pieces.length) * 100) : 0;
  const completed = pieces.length > 0 && placed === pieces.length;

  useEffect(() => {
    if (!puzzle?.configuration.timerEnabled || completed) return;
    const timer = setInterval(() => {
      setElapsedTime((current) => {
        const next = current + 1;
        updatePuzzleElapsedTime(id, next);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [completed, id, puzzle?.configuration.timerEnabled, updatePuzzleElapsedTime]);

  function savePieces(next: PuzzlePiece[]) {
    setPieces(next);
    updatePuzzlePieces(id, next);
    if (next.length > 0 && next.every((piece) => piece.isPlaced)) {
      setTimeout(() => router.replace(`/result/${id}` as never), 500);
    }
  }

  function placeHint() {
    const candidate = pieces.find((piece) => !piece.isPlaced);
    if (!candidate) return;
    incrementPuzzleHints(id);
    savePieces(
      pieces.map((piece) =>
        piece.id === candidate.id
          ? { ...piece, isPlaced: true, currentPosition: { ...piece.correctPosition } }
          : piece,
      ),
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function useHint() {
    if (premium) {
      placeHint();
      return;
    }
    Alert.alert(
      t("Ganhar uma dica", "Get a hint"),
      t("Assista a um anúncio recompensado para encaixar uma peça. O anúncio só abre se você confirmar.", "Watch a rewarded ad to place one piece. The ad only opens after you confirm."),
      [
        { text: t("Agora não", "Not now"), style: "cancel" },
        { text: t("Assistir anúncio", "Watch ad"), onPress: () => void showRewardedHint().then((earned) => {
          if (earned) placeHint();
          else Alert.alert(t("Anúncio indisponível", "Ad unavailable"), t("Não foi possível carregar o anúncio. Tente novamente mais tarde.", "The ad couldn't be loaded. Try again later."));
        }) },
      ],
    );
  }

  function releasePieces(ids: string[], x: number, y: number) {
    if (!puzzle) return;
    const released = pieces.filter((piece) => ids.includes(piece.id));
    if (!released.length) return;

    const gridColumns = Math.ceil(Math.sqrt(released.length));
    const gridRows = Math.ceil(released.length / gridColumns);
    const horizontalRange = Math.max(0, puzzle.configuration.columns - 0.7);
    const verticalRange = Math.max(0, puzzle.configuration.rows - 0.7);
    const horizontalStep = gridColumns > 1 ? Math.min(0.72, horizontalRange / (gridColumns - 1)) : 0;
    const verticalStep = gridRows > 1 ? Math.min(0.72, verticalRange / (gridRows - 1)) : 0;
    const groupWidth = horizontalStep * (gridColumns - 1);
    const groupHeight = verticalStep * (gridRows - 1);
    const minimumX = -0.15;
    const minimumY = -0.15;
    const maximumX = puzzle.configuration.columns - 0.85;
    const maximumY = puzzle.configuration.rows - 0.85;
    const startX = Math.max(minimumX, Math.min(maximumX - groupWidth, x - groupWidth / 2));
    const startY = Math.max(minimumY, Math.min(maximumY - groupHeight, y - groupHeight / 2));
    const releasedIds = new Set(ids);

    savePieces(
      pieces.map((piece) => {
        if (!releasedIds.has(piece.id)) return piece;
        const index = released.findIndex((candidate) => candidate.id === piece.id);
        return {
          ...piece,
          isPlaced: false,
          trayId: null,
          groupId: null,
          currentPosition: {
            x: startX + (index % gridColumns) * horizontalStep,
            y: startY + Math.floor(index / gridColumns) * verticalStep,
            rotation: piece.currentPosition.rotation,
          },
        };
      }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  }

  if (!puzzle) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 px-6" style={{ backgroundColor: colors.background }}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.accent} />
        <Text className="text-center text-xl font-black" style={{ color: colors.text }}>{t("Quebra-cabeça não encontrado", "Puzzle not found")}</Text>
        <PrimaryButton className="w-full" onPress={() => router.replace("/(tabs)/puzzles")}>{t("Voltar para a coleção", "Back to collection")}</PrimaryButton>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom"]} style={{ backgroundColor: colors.background }}>
      <View style={[styles.toolbar, { borderColor: `${colors.accent}35`, backgroundColor: colors.panel }]}>
        <LinearGradient colors={[`${colors.accent}35`, "transparent"]} style={[StyleSheet.absoluteFill, { width: `${progress}%` }]} />
        <View className="flex-row items-center gap-3">
          <IconButton round icon="home-outline" label={t("Ir para início", "Go home")} onPress={() => router.replace("/(tabs)" as never)} />
          <IconButton round icon="menu-outline" label={t("Abrir menu", "Open menu")} onPress={() => setDrawerOpen(true)} />
          <View className="flex-1">
            <Text className="text-lg font-black" numberOfLines={1} style={{ color: colors.text }}>{puzzle.name}</Text>
            <Text className="text-base font-extrabold" style={{ color: colors.accent }}>{progress}% · {placed} {t("de", "of")} {pieces.length}</Text>
            {puzzle.configuration.timerEnabled ? (
              <View style={styles.timerRow}><Ionicons name="timer-outline" size={15} color={colors.muted} /><Text style={[styles.timerText, { color: colors.muted }]}>{formatElapsed(elapsedTime)}</Text></View>
            ) : null}
          </View>
          <IconButton round icon="image-outline" label={t("Ver imagem original", "View original image")} onPress={() => setShowReference(true)} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 104, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const nextOffset = event.nativeEvent.contentOffset.y;
          const delta = nextOffset - scrollOffset.current;
          scrollOffset.current = nextOffset;
          if (delta !== 0) setBoardFrame((current) => current ? { ...current, y: current.y - delta } : current);
        }}
      >
        <NativePuzzleBoard
          imageUri={puzzle.imageUri}
          rows={puzzle.configuration.rows}
          columns={puzzle.configuration.columns}
          pieces={pieces}
          initialZoom={puzzle.session.camera.zoom}
          initialPanX={puzzle.session.camera.x}
          initialPanY={puzzle.session.camera.y}
          externalDrawer
          storageScreenTarget={storageFrame}
          onBoardFrameChange={setBoardFrame}
          onPiecesChange={savePieces}
          onCameraChange={(panX, panY, zoom) => {
            setBoardZoom(zoom);
            setBoardPan({ x: panX, y: panY });
            updatePuzzleCamera(puzzle.id, { x: panX, y: panY, zoom });
          }}
        />
        {puzzle.configuration.hintsEnabled && progress < 100 ? (
          <SecondaryButton className="mt-4" icon={premium ? "bulb-outline" : "play-circle-outline"} onPress={useHint}>{premium ? t("Usar dica Premium", "Use Premium hint") : t("Assistir anúncio para ganhar dica", "Watch ad to get a hint")}</SecondaryButton>
        ) : null}
      </ScrollView>

      <PuzzlePieceDrawer
        imageUri={puzzle.imageUri}
        rows={puzzle.configuration.rows}
        columns={puzzle.configuration.columns}
        pieces={pieces}
        boardFrame={boardFrame}
        boardZoom={boardZoom}
        boardPanX={boardPan.x}
        boardPanY={boardPan.y}
        onReleasePieces={releasePieces}
        onStorageFrameChange={setStorageFrame}
      />

      <Modal visible={showReference} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowReference(false)}>
        <Pressable style={styles.referenceBackdrop} onPress={() => setShowReference(false)}>
          <Pressable
            accessibilityRole="image"
            onPress={(event) => event.stopPropagation()}
            style={[styles.referenceCard, { backgroundColor: colors.panel, borderColor: `${colors.accent}70` }]}
          >
            <View style={styles.referenceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.referenceTitle, { color: colors.text }]}>{t("Imagem original", "Original image")}</Text>
                <Text style={[styles.referenceSubtitle, { color: colors.muted }]}>{t("Use como referência durante a montagem", "Use it as a reference while assembling")}</Text>
              </View>
              <IconButton round icon="close" label={t("Fechar imagem", "Close image")} onPress={() => setShowReference(false)} />
            </View>
            <Image
              source={{ uri: puzzle.imageUri }}
              style={[styles.referenceImage, { aspectRatio: puzzle.configuration.columns / puzzle.configuration.rows }]}
              contentFit="contain"
              transition={180}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  toolbar: { marginHorizontal: 12, marginTop: 6, borderRadius: 25, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, overflow: "hidden" },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 12, fontVariant: ["tabular-nums"] },
  referenceBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(2,5,16,.84)" },
  referenceCard: { width: "100%", maxWidth: 560, maxHeight: "82%", padding: 14, borderRadius: 26, borderWidth: 1, shadowColor: "#000", shadowOpacity: .35, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 18 },
  referenceHeader: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  referenceTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 19 },
  referenceSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
  referenceImage: { width: "100%", maxHeight: "70%", borderRadius: 18, overflow: "hidden" },
});
