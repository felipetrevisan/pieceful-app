import { Ionicons } from "@expo/vector-icons";
import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NativePuzzleBoard,
  type PuzzleZoomCommand,
} from "@/components/native-puzzle-board";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { IconButton, PrimaryButton } from "@/components/pieceful-ui";
import {
  PuzzlePieceDragOverlay,
  PuzzlePieceDrawer,
  type ScreenFrame,
  type TrayDragPreview,
} from "@/components/puzzle-piece-drawer";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";
import { useMonetization } from "@/state/monetization-provider";

export default function PuzzleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    consumeHintCredit,
    hintCredits,
    incrementPuzzleHints,
    puzzles,
    setDrawerOpen,
    t,
    theme,
    updatePuzzleCamera,
    updatePuzzleElapsedTime,
    updatePuzzlePieces,
  } = useApp();
  const { premium, showRewardedHint } = useMonetization();
  const { showAlert } = usePiecefulAlert();
  const colors = mobileThemes[theme];
  const insets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const puzzle = puzzles.find((item) => item.id === id);
  const [pieces, setPieces] = useState<PuzzlePiece[]>(puzzle?.session.pieces ?? []);
  const [showReference, setShowReference] = useState(false);
  const [boardFrame, setBoardFrame] = useState<ScreenFrame | null>(null);
  const [headerFrame, setHeaderFrame] = useState<ScreenFrame | null>(null);
  const [storageFrame, setStorageFrame] = useState<ScreenFrame | null>(null);
  const [boardZoom, setBoardZoom] = useState(puzzle?.session.camera.zoom ?? 1);
  const [boardPan, setBoardPan] = useState({
    x: puzzle?.session.camera.x ?? 0,
    y: puzzle?.session.camera.y ?? 0,
  });
  const [zoomCommand, setZoomCommand] = useState<PuzzleZoomCommand | null>(null);
  const [elapsedTime, setElapsedTime] = useState(puzzle?.session.elapsedTime ?? 0);
  const elapsedTimeRef = useRef(puzzle?.session.elapsedTime ?? 0);
  const [trayDragPreview, setTrayDragPreview] = useState<TrayDragPreview | null>(null);
  const trayDragX = useSharedValue(-200);
  const trayDragY = useSharedValue(-200);
  const scrollOffset = useRef(0);
  const toolbarRef = useRef<View>(null);
  const zoomCommandId = useRef(0);

  const placed = useMemo(() => pieces.filter((piece) => piece.isPlaced).length, [pieces]);
  const progress = pieces.length ? Math.round((placed / pieces.length) * 100) : 0;
  const completed = pieces.length > 0 && placed === pieces.length;
  const imageAspect = puzzle
    ? puzzle.configuration.columns / puzzle.configuration.rows
    : 1;
  const referenceMaxWidth = Math.min(532, viewportWidth - 64);
  const referenceMaxHeight = viewportHeight * 0.58;
  const referenceImageWidth = Math.min(referenceMaxWidth, referenceMaxHeight * imageAspect);
  const referenceImageHeight = referenceImageWidth / imageAspect;
  const cameraViewportTop =
    boardFrame && headerFrame
      ? Math.max(0, headerFrame.y + headerFrame.height + 10 - boardFrame.y)
      : 0;
  const cameraViewportBottom = boardFrame && storageFrame
    ? Math.max(cameraViewportTop + 120, storageFrame.y - 10 - boardFrame.y)
    : Math.max(cameraViewportTop + 120, viewportHeight - 356);

  useEffect(() => {
    if (!puzzle?.id || completed) return;
    const timer = setInterval(() => {
      const next = elapsedTimeRef.current + 1;
      elapsedTimeRef.current = next;
      setElapsedTime(next);
      updatePuzzleElapsedTime(id, next);
    }, 1000);
    return () => clearInterval(timer);
  }, [completed, id, puzzle?.id, updatePuzzleElapsedTime]);

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
    showAlert(
      t("Ganhar uma dica", "Get a hint"),
      t(
        "Assista a um anúncio recompensado para encaixar uma peça. O anúncio só abre se você confirmar.",
        "Watch a rewarded ad to place one piece. The ad only opens after you confirm.",
      ),
      [
        { text: t("Agora não", "Not now"), style: "cancel" },
        ...(hintCredits > 0
          ? [{
              text: t(`Usar dica grátis (${hintCredits})`, `Use free hint (${hintCredits})`),
              icon: "bulb" as const,
              onPress: () => {
                if (consumeHintCredit()) placeHint();
              },
            }]
          : []),
        {
          text: t("Assistir anúncio", "Watch ad"),
          icon: "play-circle",
          onPress: () =>
            void showRewardedHint().then((earned) => {
              if (earned) placeHint();
              else
                showAlert(
                  t("Anúncio indisponível", "Ad unavailable"),
                  t(
                    "Não foi possível carregar o anúncio. Tente novamente mais tarde.",
                    "The ad couldn't be loaded. Try again later.",
                  ),
                );
            }),
        },
      ],
    );
  }

  function releasePieces(ids: string[], x: number, y: number) {
    if (!puzzle) return;
    const released = pieces.filter((piece) => ids.includes(piece.id));
    if (!released.length) return;

    const gridColumns = Math.ceil(Math.sqrt(released.length));
    const gridRows = Math.ceil(released.length / gridColumns);
    const horizontalStep = gridColumns > 1 ? 0.72 : 0;
    const verticalStep = gridRows > 1 ? 0.72 : 0;
    const groupWidth = horizontalStep * (gridColumns - 1);
    const groupHeight = verticalStep * (gridRows - 1);
    const startX = x - groupWidth / 2;
    const startY = y - groupHeight / 2;
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

  const handleCameraChange = useCallback(
    (panX: number, panY: number, zoom: number) => {
      setBoardZoom(zoom);
      setBoardPan({ x: panX, y: panY });
      updatePuzzleCamera(id, { x: panX, y: panY, zoom });
    },
    [id, updatePuzzleCamera],
  );

  function controlZoom(action: PuzzleZoomCommand["action"]) {
    zoomCommandId.current += 1;
    setZoomCommand({ id: zoomCommandId.current, action });
    void Haptics.selectionAsync();
  }

  if (!puzzle) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center gap-4 px-6"
        style={{ backgroundColor: colors.background }}
      >
        <Ionicons name="alert-circle-outline" size={44} color={colors.accent} />
        <Text className="text-center text-xl font-black" style={{ color: colors.text }}>
          {t("Quebra-cabeça não encontrado", "Puzzle not found")}
        </Text>
        <PrimaryButton className="w-full" onPress={() => router.replace("/(tabs)/puzzles")}>
          {t("Voltar para a coleção", "Back to collection")}
        </PrimaryButton>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top", "bottom"]}
      style={{ backgroundColor: colors.background }}
    >
      <View
        ref={toolbarRef}
        collapsable={false}
        onLayout={() => {
          toolbarRef.current?.measureInWindow((x, y, width, height) => {
            setHeaderFrame({ x, y, width, height });
          });
        }}
        style={[
          styles.toolbar,
          { borderColor: `${colors.accent}35`, backgroundColor: colors.panel },
        ]}
      >
        <LinearGradient
          colors={[`${colors.accent}35`, "transparent"]}
          style={[StyleSheet.absoluteFill, { width: `${progress}%` }]}
        />
        <View className="flex-row items-center gap-3">
          <IconButton
            round
            icon="home-outline"
            label={t("Ir para início", "Go home")}
            onPress={() => router.replace("/(tabs)" as never)}
          />
          <IconButton
            round
            icon="menu-outline"
            label={t("Abrir menu", "Open menu")}
            onPress={() => setDrawerOpen(true)}
          />
          <View className="flex-1">
            <Text className="text-lg font-black" numberOfLines={1} style={{ color: colors.text }}>
              {puzzle.name}
            </Text>
            <Text className="text-base font-extrabold" style={{ color: colors.accent }}>
              {progress}% · {placed} {t("de", "of")} {pieces.length}
            </Text>
            {puzzle.configuration.timerEnabled ? (
              <View style={styles.timerRow}>
                <Ionicons name="timer-outline" size={15} color={colors.muted} />
                <Text style={[styles.timerText, { color: colors.muted }]}>
                  {formatElapsed(elapsedTime)}
                </Text>
              </View>
            ) : null}
          </View>
          <IconButton
            round
            icon="image-outline"
            label={t("Ver imagem original", "View original image")}
            onPress={() => setShowReference(true)}
          />
          {puzzle.configuration.hintsEnabled && progress < 100 ? (
            <IconButton
              round
              icon="bulb-outline"
              label={
                premium
                  ? t("Usar dica", "Use hint")
                  : hintCredits > 0
                    ? t(`Usar dica grátis · ${hintCredits}`, `Use free hint · ${hintCredits}`)
                  : t("Assistir anúncio para ganhar dica", "Watch ad to get a hint")
              }
              onPress={useHint}
            />
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 268, paddingTop: 12 }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const nextOffset = event.nativeEvent.contentOffset.y;
          const delta = nextOffset - scrollOffset.current;
          scrollOffset.current = nextOffset;
          if (delta !== 0)
            setBoardFrame((current) => (current ? { ...current, y: current.y - delta } : current));
        }}
      >
        <NativePuzzleBoard
          imageUri={puzzle.imageUri}
          rows={puzzle.configuration.rows}
          columns={puzzle.configuration.columns}
          pieces={pieces}
          rotationEnabled={puzzle.configuration.rotationEnabled}
          zoomCommand={zoomCommand}
          cameraViewportTop={cameraViewportTop}
          cameraViewportBottom={cameraViewportBottom}
          initialZoom={puzzle.session.camera.zoom}
          initialPanX={puzzle.session.camera.x}
          initialPanY={puzzle.session.camera.y}
          externalDrawer
          headerScreenTarget={headerFrame}
          storageScreenTarget={storageFrame}
          onBoardFrameChange={setBoardFrame}
          onPiecesChange={savePieces}
          onCameraChange={handleCameraChange}
        />
      </ScrollView>

      <View style={styles.zoomControls}>
        <IconButton
          round
          disabled={boardZoom <= 0.8}
          icon="remove"
          label={t("Diminuir zoom", "Zoom out")}
          onPress={() => controlZoom("out")}
          style={boardZoom <= 0.8 ? styles.zoomButtonDisabled : undefined}
        />
        <IconButton
          round
          icon="scan-outline"
          label={t("Restaurar zoom", "Reset zoom")}
          onPress={() => controlZoom("reset")}
        />
        <IconButton
          round
          disabled={boardZoom >= 2.4}
          icon="add"
          label={t("Aumentar zoom", "Zoom in")}
          onPress={() => controlZoom("in")}
          style={boardZoom >= 2.4 ? styles.zoomButtonDisabled : undefined}
        />
      </View>

      <PuzzlePieceDrawer
        imageUri={puzzle.imageUri}
        rows={puzzle.configuration.rows}
        columns={puzzle.configuration.columns}
        pieces={pieces}
        boardFrame={boardFrame}
        headerFrame={headerFrame}
        storageFrame={storageFrame}
        boardZoom={boardZoom}
        boardPanX={boardPan.x}
        boardPanY={boardPan.y}
        dragScreenX={trayDragX}
        dragScreenY={trayDragY}
        onDragPreviewChange={setTrayDragPreview}
        onReleasePieces={releasePieces}
        onStorageFrameChange={setStorageFrame}
      />

      <PuzzlePieceDragOverlay
        preview={trayDragPreview}
        imageUri={puzzle.imageUri}
        rows={puzzle.configuration.rows}
        columns={puzzle.configuration.columns}
        screenX={trayDragX}
        screenY={trayDragY}
        screenOffsetY={insets.top}
        accent={colors.accent}
      />

      <Modal
        visible={showReference}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowReference(false)}
      >
        <Pressable style={styles.referenceBackdrop} onPress={() => setShowReference(false)}>
          <Pressable
            accessibilityRole="image"
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.referenceCard,
              { backgroundColor: colors.panel, borderColor: `${colors.accent}70` },
            ]}
          >
            <View style={styles.referenceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.referenceTitle, { color: colors.text }]}>
                  {t("Imagem original", "Original image")}
                </Text>
                <Text style={[styles.referenceSubtitle, { color: colors.muted }]}>
                  {t(
                    "Use como referência durante a montagem",
                    "Use it as a reference while assembling",
                  )}
                </Text>
              </View>
              <IconButton
                round
                icon="close"
                label={t("Fechar imagem", "Close image")}
                onPress={() => setShowReference(false)}
              />
            </View>
            <View style={styles.referenceImageStage}>
              <Image
                source={{ uri: puzzle.imageUri }}
                style={[
                  styles.referenceImage,
                  { width: referenceImageWidth, height: referenceImageHeight },
                ]}
                contentFit="contain"
                transition={180}
              />
            </View>
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
  toolbar: {
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: "hidden",
  },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 12, fontVariant: ["tabular-nums"] },
  zoomControls: {
    position: "absolute",
    right: 16,
    bottom: 264,
    zIndex: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  zoomButtonDisabled: { opacity: 0.38 },
  referenceBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(2,5,16,.84)",
  },
  referenceCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "82%",
    padding: 14,
    borderRadius: 26,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  referenceHeader: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  referenceTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 19 },
  referenceSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
  referenceImageStage: { width: "100%", alignItems: "center", justifyContent: "center" },
  referenceImage: { maxWidth: "100%", borderRadius: 18, overflow: "hidden" },
});
