import { Ionicons } from "@expo/vector-icons";
import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState as NativeAppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOutDown, useSharedValue } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NativePuzzleBoard,
  type PuzzleHintCommand,
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

function releaseOffsets(count: number) {
  const offsets = [{ x: 0, y: 0 }];
  const step = 0.76;
  let ring = 1;
  while (offsets.length < count) {
    const ringOffsets: { x: number; y: number }[] = [];
    for (let gridY = -ring; gridY <= ring; gridY += 1) {
      for (let gridX = -ring; gridX <= ring; gridX += 1) {
        if (Math.max(Math.abs(gridX), Math.abs(gridY)) !== ring) continue;
        ringOffsets.push({ x: gridX * step, y: gridY * step });
      }
    }
    ringOffsets.sort(
      (left, right) =>
        Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y) ||
        Math.atan2(left.y, left.x) - Math.atan2(right.y, right.x),
    );
    offsets.push(...ringOffsets);
    ring += 1;
  }
  return offsets.slice(0, count);
}

export default function PuzzleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    consumeHintCredit,
    hintCredits,
    incrementPuzzleHints,
    puzzles,
    language,
    preferences,
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
  const [hintCommand, setHintCommand] = useState<PuzzleHintCommand | null>(null);
  const [elapsedTime, setElapsedTime] = useState(puzzle?.session.elapsedTime ?? 0);
  const elapsedTimeRef = useRef(puzzle?.session.elapsedTime ?? 0);
  const [trayDragPreview, setTrayDragPreview] = useState<TrayDragPreview | null>(null);
  const [pieceStoredNoticeCount, setPieceStoredNoticeCount] = useState(0);
  const trayDragX = useSharedValue(-200);
  const trayDragY = useSharedValue(-200);
  const scrollOffset = useRef(0);
  const toolbarRef = useRef<View>(null);
  const zoomCommandId = useRef(0);
  const hintCommandId = useRef(0);
  const pieceStoredNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placed = useMemo(() => pieces.filter((piece) => piece.isPlaced).length, [pieces]);
  const looseBoardPieces = useMemo(
    () => pieces.filter((piece) => !piece.isPlaced && piece.trayId === null && !piece.groupId),
    [pieces],
  );
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
      if (next % 30 === 0) updatePuzzleElapsedTime(id, next);
    }, 1000);
    return () => {
      clearInterval(timer);
      updatePuzzleElapsedTime(id, elapsedTimeRef.current);
    };
  }, [completed, id, puzzle?.id, updatePuzzleElapsedTime]);

  useEffect(() => () => {
    if (pieceStoredNoticeTimer.current) clearTimeout(pieceStoredNoticeTimer.current);
  }, []);

  useEffect(() => {
    if (!puzzle?.id || completed) return;
    const subscription = NativeAppState.addEventListener("change", (state) => {
      if (state !== "active") updatePuzzleElapsedTime(id, elapsedTimeRef.current);
    });
    return () => subscription.remove();
  }, [completed, id, puzzle?.id, updatePuzzleElapsedTime]);

  const savePieces = useCallback((next: PuzzlePiece[]) => {
    setPieces(next);
    updatePuzzlePieces(id, next, elapsedTimeRef.current);
    if (next.length > 0 && next.every((piece) => piece.isPlaced)) {
      setTimeout(() => router.replace(`/result/${id}` as never), 500);
    }
  }, [id, updatePuzzlePieces]);

  function placeHint() {
    if (hintCommand || !puzzle) return;
    const candidate =
      pieces.find((piece) => !piece.isPlaced && piece.groupId === null) ??
      pieces.find((piece) => !piece.isPlaced);
    if (!candidate) return;
    incrementPuzzleHints(id);
    const startOffsetX = candidate.correctPosition.x < puzzle.configuration.columns / 2 ? 2.1 : -2.1;
    const startOffsetY = candidate.correctPosition.y < puzzle.configuration.rows / 2 ? 1.4 : -1.4;
    const startX = candidate.trayId === null
      ? candidate.currentPosition.x
      : Math.max(-0.15, Math.min(puzzle.configuration.columns - 0.85, candidate.correctPosition.x + startOffsetX));
    const startY = candidate.trayId === null
      ? candidate.currentPosition.y
      : Math.max(-0.15, Math.min(puzzle.configuration.rows - 0.85, candidate.correctPosition.y + startOffsetY));
    const prepared = pieces.map((piece) => {
      if (piece.id === candidate.id)
        return {
          ...piece,
          isPlaced: false,
          groupId: null,
          trayId: null,
          currentPosition: { x: startX, y: startY, rotation: 0 },
        };
      if (candidate.groupId && piece.groupId === candidate.groupId)
        return { ...piece, groupId: null };
      return piece;
    });
    setPieces(prepared);
    hintCommandId.current += 1;
    setHintCommand({ id: hintCommandId.current, pieceId: candidate.id });
  }

  const completeHintAnimation = useCallback((pieceId: string) => {
    const next = pieces.map((piece) =>
      piece.id === pieceId
        ? {
            ...piece,
            isPlaced: true,
            groupId: "tabuleiro",
            trayId: null,
            currentPosition: { ...piece.correctPosition },
          }
        : piece,
    );
    setHintCommand(null);
    savePieces(next);
    if (preferences.haptics)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pieces, preferences.haptics, savePieces]);

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

  const releasePieces = useCallback((ids: string[], x: number, y: number, anchorId: string) => {
    const released = pieces.filter((piece) => ids.includes(piece.id));
    if (!released.length) return;

    const orderedReleased = [
      ...released.filter((piece) => piece.id === anchorId),
      ...released.filter((piece) => piece.id !== anchorId),
    ];
    const offsets = releaseOffsets(orderedReleased.length);
    const releasedIds = new Set(ids);

    savePieces(
      pieces.map((piece) => {
        if (!releasedIds.has(piece.id)) return piece;
        const index = orderedReleased.findIndex((candidate) => candidate.id === piece.id);
        const offset = offsets[index] ?? { x: 0, y: 0 };
        return {
          ...piece,
          isPlaced: false,
          trayId: null,
          groupId: null,
          currentPosition: {
            x: x + offset.x,
            y: y + offset.y,
            rotation: piece.currentPosition.rotation,
          },
        };
      }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  }, [pieces, savePieces]);

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

  const showPieceStoredNotice = useCallback((count = 1) => {
    if (pieceStoredNoticeTimer.current) clearTimeout(pieceStoredNoticeTimer.current);
    setPieceStoredNoticeCount(count);
    pieceStoredNoticeTimer.current = setTimeout(() => {
      setPieceStoredNoticeCount(0);
      pieceStoredNoticeTimer.current = null;
    }, 2200);
  }, []);

  const storeLoosePieces = useCallback(() => {
    if (!puzzle || !looseBoardPieces.length) return;
    const looseIds = new Set(looseBoardPieces.map((piece) => piece.id));
    let slot = pieces.filter((piece) => !piece.isPlaced && piece.trayId !== null).length;
    const next = pieces.map((piece) => {
      if (!looseIds.has(piece.id)) return piece;
      const nextSlot = slot;
      slot += 1;
      return {
        ...piece,
        trayId: "drawer",
        currentPosition: {
          x: nextSlot % puzzle.configuration.columns,
          y:
            puzzle.configuration.rows +
            1.55 +
            Math.floor(nextSlot / puzzle.configuration.columns) * 1.18,
          rotation: piece.currentPosition.rotation,
        },
      };
    });
    savePieces(next);
    showPieceStoredNotice(looseBoardPieces.length);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [looseBoardPieces, pieces, puzzle, savePieces, showPieceStoredNotice]);

  function confirmStoreLoosePieces() {
    if (!looseBoardPieces.length) return;
    showAlert(
      t("Guardar peças soltas?", "Store loose pieces?"),
      t(
        `${looseBoardPieces.length} peças soltas voltarão para a bandeja. Peças conectadas continuarão no tabuleiro.`,
        `${looseBoardPieces.length} loose pieces will return to the tray. Connected pieces will stay on the board.`,
      ),
      [
        { text: t("Cancelar", "Cancel"), style: "cancel" },
        {
          text: t("Mover para bandeja", "Move to tray"),
          icon: "file-tray-full-outline",
          onPress: storeLoosePieces,
        },
      ],
    );
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
          language={language}
          preferences={preferences}
          theme={theme}
          rotationEnabled={puzzle.configuration.rotationEnabled}
          zoomCommand={zoomCommand}
          hintCommand={hintCommand}
          cameraViewportTop={cameraViewportTop}
          cameraViewportBottom={cameraViewportBottom}
          initialZoom={puzzle.session.camera.zoom}
          initialPanX={puzzle.session.camera.x}
          initialPanY={puzzle.session.camera.y}
          externalDrawer
          headerScreenTarget={headerFrame}
          storageScreenTarget={storageFrame}
          onBoardFrameChange={setBoardFrame}
          onPieceStored={showPieceStoredNotice}
          onPiecesChange={savePieces}
          onCameraChange={handleCameraChange}
          onHintAnimationComplete={completeHintAnimation}
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

      <View style={styles.storeLooseControl}>
        <IconButton
          round
          disabled={!looseBoardPieces.length}
          icon="file-tray-full-outline"
          label={t(
            `Mover ${looseBoardPieces.length} peças soltas para a bandeja`,
            `Move ${looseBoardPieces.length} loose pieces to the tray`,
          )}
          onPress={confirmStoreLoosePieces}
          style={!looseBoardPieces.length ? styles.zoomButtonDisabled : undefined}
        />
      </View>

      {pieceStoredNoticeCount > 0 ? (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOutDown.duration(180)}
          pointerEvents="none"
          style={[
            styles.pieceStoredNotice,
            { backgroundColor: colors.panel, borderColor: `${colors.accent}70` },
          ]}
        >
          <View style={[styles.pieceStoredNoticeIcon, { backgroundColor: `${colors.accent}20` }]}>
            <Ionicons name="file-tray-full-outline" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.pieceStoredNoticeText, { color: colors.text }]}>
            {pieceStoredNoticeCount === 1
              ? t("Peça enviada para a bandeja", "Piece moved to the tray")
              : t(
                  `${pieceStoredNoticeCount} peças enviadas para a bandeja`,
                  `${pieceStoredNoticeCount} pieces moved to the tray`,
                )}
          </Text>
        </Animated.View>
      ) : null}

      {hintCommand ? (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOutDown.duration(180)}
          pointerEvents="none"
          style={[
            styles.hintFollowNotice,
            { backgroundColor: colors.panel, borderColor: `${colors.primary}80` },
          ]}
        >
          <Ionicons name="locate-outline" size={19} color={colors.primary} />
          <Text style={[styles.pieceStoredNoticeText, { color: colors.text }]}>
            {t("Acompanhe a peça até o encaixe", "Follow the piece to its place")}
          </Text>
        </Animated.View>
      ) : null}

      <PuzzlePieceDrawer
        imageUri={puzzle.imageUri}
        rows={puzzle.configuration.rows}
        columns={puzzle.configuration.columns}
        pieces={pieces}
        language={language}
        preferences={preferences}
        theme={theme}
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
        boardFrame={boardFrame}
        storageFrame={storageFrame}
        boardZoom={boardZoom}
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
  storeLooseControl: {
    position: "absolute",
    left: 16,
    bottom: 264,
    zIndex: 72,
  },
  pieceStoredNotice: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 266,
    zIndex: 90,
    minHeight: 58,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  pieceStoredNoticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  pieceStoredNoticeText: {
    flexShrink: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    lineHeight: 19,
    textAlign: "center",
  },
  hintFollowNotice: {
    position: "absolute",
    alignSelf: "center",
    top: 128,
    zIndex: 90,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
  },
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
