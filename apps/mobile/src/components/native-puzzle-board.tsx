import { neighborSnapOffset, normalizeQuarterTurn, type PuzzlePiece, type PuzzlePieceShape } from "@puzzled/puzzle-engine";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  FadeOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { ClipPath, Defs, Image as SvgImage, Path, Rect } from "react-native-svg";
import { mobileThemes } from "@/constants/pieceful-theme";
import type { ScreenFrame } from "@/components/puzzle-piece-drawer";
import { useApp } from "@/state/app-provider";

interface NativePuzzleBoardProps {
  imageUri: string;
  rows: number;
  columns: number;
  pieces: PuzzlePiece[];
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
  externalDrawer?: boolean;
  storageScreenTarget?: ScreenFrame | null;
  onBoardFrameChange?: (frame: ScreenFrame) => void;
  onPiecesChange: (pieces: PuzzlePiece[]) => void;
  onCameraChange: (panX: number, panY: number, zoom: number) => void;
}

function piecePath(shape: PuzzlePieceShape, size: number, margin: number) {
  const x = margin;
  const y = margin;
  const bump = size * 0.22;
  const edge = (kind: "top" | "right" | "bottom" | "left") => {
    const value = shape[kind];
    const direction = value === "tab" ? 1 : value === "blank" ? -1 : 0;
    if (kind === "top") {
      if (!direction) return `L ${x + size} ${y}`;
      return `L ${x + size * 0.32} ${y} C ${x + size * 0.34} ${y - bump * direction} ${x + size * 0.66} ${y - bump * direction} ${x + size * 0.68} ${y} L ${x + size} ${y}`;
    }
    if (kind === "right") {
      if (!direction) return `L ${x + size} ${y + size}`;
      return `L ${x + size} ${y + size * 0.32} C ${x + size + bump * direction} ${y + size * 0.34} ${x + size + bump * direction} ${y + size * 0.66} ${x + size} ${y + size * 0.68} L ${x + size} ${y + size}`;
    }
    if (kind === "bottom") {
      if (!direction) return `L ${x} ${y + size}`;
      return `L ${x + size * 0.68} ${y + size} C ${x + size * 0.66} ${y + size + bump * direction} ${x + size * 0.34} ${y + size + bump * direction} ${x + size * 0.32} ${y + size} L ${x} ${y + size}`;
    }
    if (!direction) return `L ${x} ${y}`;
    return `L ${x} ${y + size * 0.68} C ${x - bump * direction} ${y + size * 0.66} ${x - bump * direction} ${y + size * 0.34} ${x} ${y + size * 0.32} L ${x} ${y}`;
  };
  return `M ${x} ${y} ${edge("top")} ${edge("right")} ${edge("bottom")} ${edge("left")} Z`;
}

function drawerOrder(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  return Math.imul(hash, 2246822507) >>> 0;
}

export function NativePuzzleBoard({
  imageUri,
  rows,
  columns,
  pieces,
  initialZoom,
  initialPanX,
  initialPanY,
  externalDrawer = false,
  storageScreenTarget,
  onBoardFrameChange,
  onPiecesChange,
  onCameraChange,
}: NativePuzzleBoardProps) {
  const { preferences, theme, t } = useApp();
  const { width } = useWindowDimensions();
  const colors = mobileThemes[theme];
  const boardWidth = Math.min(352, width - 24);
  const cell = boardWidth / columns;
  const boardHeight = rows * cell;
  const cameraEdgePadding = Math.max(18, Math.min(34, cell * 0.65));
  const storedPieces = pieces.filter((piece) => !piece.isPlaced && piece.trayId !== null);
  const drawerColumns = Math.max(3, Math.min(columns, Math.floor(columns * 0.75)));
  const drawerColumnStep = columns / drawerColumns;
  const displayedStoredPieces = useMemo(
    () =>
      [...storedPieces]
        .sort((left, right) => drawerOrder(left.id) - drawerOrder(right.id))
        .map((piece, index) => ({
          ...piece,
          currentPosition: {
            ...piece.currentPosition,
            x:
              (index % drawerColumns) * drawerColumnStep +
              Math.max(0, (drawerColumnStep - 1) / 2),
            y: rows + 1.55 + Math.floor(index / drawerColumns) * 1.12,
          },
        })),
    [drawerColumnStep, drawerColumns, rows, storedPieces],
  );
  const activePieces = pieces.filter((piece) => piece.isPlaced || piece.trayId === null);
  const drawerRows = Math.ceil(storedPieces.length / drawerColumns);
  const drawerTop = boardHeight + Math.max(16, cell * 0.36);
  const drawerHeaderHeight = Math.max(62, cell * 1.02);
  const drawerBodyTop = drawerTop + drawerHeaderHeight;
  const drawerBodyHeight = Math.max(cell * 1.3, drawerRows * cell * 1.12 + cell * 0.42);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draggingActivePiece, setDraggingActivePiece] = useState(false);
  const contentHeight = externalDrawer
    ? boardHeight
    : drawerOpen
    ? drawerBodyTop + drawerBodyHeight
    : drawerTop + drawerHeaderHeight + cell * 0.16;
  const storageDockSize = Math.max(42, Math.min(54, cell * 0.82));
  const storageDockLeft = boardWidth - storageDockSize - 42;
  const storageDockTop = drawerTop + (drawerHeaderHeight - storageDockSize) / 2;
  const storageTarget = {
    x: storageDockLeft / cell,
    y: storageDockTop / cell,
    width: storageDockSize / cell,
    height: storageDockSize / cell,
  };
  const migratedLegacyTray = useRef(false);
  const normalizedInitialPanX = initialZoom > 1.01 ? initialPanX : 0;
  const normalizedInitialPanY = initialZoom > 1.01 ? initialPanY : 0;
  const boardRef = useRef<View>(null);
  const scale = useSharedValue(initialZoom);
  const savedScale = useSharedValue(initialZoom);
  const panX = useSharedValue(normalizedInitialPanX);
  const panY = useSharedValue(normalizedInitialPanY);
  const savedPanX = useSharedValue(normalizedInitialPanX);
  const savedPanY = useSharedValue(normalizedInitialPanY);
  const pieceDragActive = useSharedValue(false);
  const activeGroupId = useSharedValue<string | null>(null);
  const activeGroupPieceId = useSharedValue<string | null>(null);
  const groupTranslationX = useSharedValue(0);
  const groupTranslationY = useSharedValue(0);

  useEffect(() => {
    const invalidGroups = new Set(
      pieces
        .filter(
          (piece) =>
            piece.groupId &&
            piece.groupId !== "tabuleiro" &&
            normalizeQuarterTurn(piece.currentPosition.rotation) !== 0,
        )
        .map((piece) => piece.groupId),
    );
    let changed = false;
    const normalizedPieces = pieces.map((piece) => {
      const normalizedRotation = normalizeQuarterTurn(piece.currentPosition.rotation);
      const mustReleaseInvalidGroup = Boolean(piece.groupId && invalidGroups.has(piece.groupId));
      if (normalizedRotation === piece.currentPosition.rotation && !mustReleaseInvalidGroup) return piece;
      changed = true;
      return {
        ...piece,
        groupId: mustReleaseInvalidGroup ? null : piece.groupId,
        currentPosition: { ...piece.currentPosition, rotation: normalizedRotation },
      };
    });
    if (changed) onPiecesChange(normalizedPieces);
  }, [onPiecesChange, pieces]);

  useEffect(() => {
    if (initialZoom <= 1.01 && (initialPanX !== 0 || initialPanY !== 0)) {
      onCameraChange(0, 0, initialZoom);
    }
  }, [initialPanX, initialPanY, initialZoom, onCameraChange]);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.set(Math.max(0.8, Math.min(2.4, savedScale.get() * event.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() <= 1.01) {
        panX.set(0);
        panY.set(0);
        savedPanX.set(0);
        savedPanY.set(0);
        runOnJS(onCameraChange)(0, 0, scale.get());
      } else {
        const horizontalLimit = (boardWidth * (scale.get() - 1)) / (2 * scale.get()) + cameraEdgePadding / scale.get();
        const minimumY = -(boardHeight * (scale.get() - 1)) / scale.get() - cameraEdgePadding / scale.get();
        const maximumY = cameraEdgePadding / scale.get();
        panX.set(Math.max(-horizontalLimit, Math.min(horizontalLimit, panX.get())));
        panY.set(Math.max(minimumY, Math.min(maximumY, panY.get())));
        savedPanX.set(panX.get());
        savedPanY.set(panY.get());
        runOnJS(onCameraChange)(panX.get(), panY.get(), scale.get());
      }
    });
  const boardPan = Gesture.Pan()
    .enabled(true)
    .maxPointers(1)
    .activeOffsetX([-4, 4])
    .activeOffsetY([-4, 4])
    .onStart(() => {
      savedPanX.set(panX.get());
      savedPanY.set(panY.get());
    })
    .onUpdate((event) => {
      if (scale.get() <= 1.01 || pieceDragActive.get()) return;
      const horizontalLimit = (boardWidth * (scale.get() - 1)) / (2 * scale.get()) + cameraEdgePadding / scale.get();
      const minimumY = -(boardHeight * (scale.get() - 1)) / scale.get() - cameraEdgePadding / scale.get();
      const maximumY = cameraEdgePadding / scale.get();
      panX.set(Math.max(-horizontalLimit, Math.min(horizontalLimit, savedPanX.get() + event.translationX / scale.get())));
      panY.set(Math.max(minimumY, Math.min(maximumY, savedPanY.get() + event.translationY / scale.get())));
    })
    .onEnd(() => {
      savedPanX.set(panX.get());
      savedPanY.set(panY.get());
      runOnJS(onCameraChange)(panX.get(), panY.get(), scale.get());
    });
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.get() },
      { translateY: panY.get() },
      { scale: scale.get() },
    ],
  }));

  function toggleDrawer() {
    setDrawerOpen((current) => !current);
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  const drawerTap = Gesture.Tap()
    .maxDuration(350)
    .onEnd((_event, success) => {
      if (success) runOnJS(toggleDrawer)();
    });

  function updatePiece(
    id: string,
    x: number,
    y: number,
    rotation: number,
    isPlaced: boolean,
    destination: "board" | "drawer",
  ) {
    const movingPiece = pieces.find((piece) => piece.id === id);
    if (!movingPiece) return;
    const effectiveRotation = movingPiece.groupId
      ? normalizeQuarterTurn(movingPiece.currentPosition.rotation)
      : normalizeQuarterTurn(rotation);
    const storedSlot = pieces.filter(
      (piece) => piece.id !== id && !piece.isPlaced && piece.trayId !== null,
    ).length;
    if (destination === "drawer") {
      const next = pieces.map((piece) =>
        piece.id === id
          ? {
              ...piece,
              isPlaced: false,
              groupId: null,
              trayId: "drawer",
              currentPosition: {
                x: storedSlot % columns,
                y: rows + 1.55 + Math.floor(storedSlot / columns) * 1.18,
                rotation: effectiveRotation,
              },
            }
          : piece,
      );
      onPiecesChange(next);
      if (preferences.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    const memberIds = new Set(
      movingPiece.groupId && movingPiece.groupId !== "tabuleiro"
        ? pieces.filter((piece) => piece.groupId === movingPiece.groupId).map((piece) => piece.id)
        : [id],
    );
    const deltaX = x - movingPiece.currentPosition.x;
    const deltaY = y - movingPiece.currentPosition.y;
    let next = pieces.map((piece) =>
      memberIds.has(piece.id)
        ? {
            ...piece,
            trayId: null,
            currentPosition: {
              x: piece.currentPosition.x + deltaX,
              y: piece.currentPosition.y + deltaY,
              rotation: normalizeQuarterTurn(
                piece.id === id ? effectiveRotation : piece.currentPosition.rotation,
              ),
            },
          }
        : piece,
    );

    let connected = false;
    if (isPlaced) {
      next = next.map((piece) =>
        memberIds.has(piece.id)
          ? { ...piece, isPlaced: true, groupId: "tabuleiro", currentPosition: { ...piece.correctPosition } }
          : piece,
      );
      connected = true;
    } else {
      let match: { offsetX: number; offsetY: number; stationary: PuzzlePiece } | null = null;
      const movingMembers = next.filter((piece) => memberIds.has(piece.id));
      for (const moving of movingMembers) {
        // Connected groups are locked against rotation. Only correctly oriented
        // loose pieces may create a new group, avoiding an unsolvable rotated set.
        if (normalizeQuarterTurn(moving.currentPosition.rotation) !== 0) continue;
        for (const stationary of next) {
          if (memberIds.has(stationary.id) || stationary.trayId !== null) continue;
          if (normalizeQuarterTurn(stationary.currentPosition.rotation) !== 0) continue;
          const offset = neighborSnapOffset(moving, stationary, 0.3);
          if (offset) {
            match = { offsetX: offset.x, offsetY: offset.y, stationary };
            break;
          }
        }
        if (match) break;
      }

      if (match) {
        const connectedIds = new Set(
          match.stationary.groupId
            ? next.filter((piece) => piece.groupId === match?.stationary.groupId).map((piece) => piece.id)
            : [match.stationary.id],
        );
        const groupId = match.stationary.isPlaced
          ? "tabuleiro"
          : (match.stationary.groupId ?? movingPiece.groupId ?? `grupo-${match.stationary.id}`);
        next = next.map((piece) => {
          if (memberIds.has(piece.id)) {
            return {
              ...piece,
              groupId,
              isPlaced: groupId === "tabuleiro",
              currentPosition: {
                ...piece.currentPosition,
                x: piece.currentPosition.x + match.offsetX,
                y: piece.currentPosition.y + match.offsetY,
              },
            };
          }
          return connectedIds.has(piece.id)
            ? { ...piece, groupId, isPlaced: groupId === "tabuleiro" }
            : piece;
        });
        connected = true;
      }
    }

    onPiecesChange(next);
    if (connected && preferences.haptics)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  useEffect(() => {
    if (migratedLegacyTray.current || pieces.length === 0) return;
    migratedLegacyTray.current = true;
    let slot = storedPieces.length;
    let changed = false;
    const migrated = pieces.map((piece) => {
      if (piece.isPlaced || piece.trayId !== null || piece.currentPosition.y < rows + 0.2)
        return piece;
      const nextSlot = slot;
      slot += 1;
      changed = true;
      return {
        ...piece,
        trayId: "drawer",
        currentPosition: {
          ...piece.currentPosition,
          x: nextSlot % columns,
          y: rows + 1.55 + Math.floor(nextSlot / columns) * 1.18,
        },
      };
    });
    if (changed) onPiecesChange(migrated);
  }, [columns, onPiecesChange, pieces, rows, storedPieces.length]);

  return (
    <View style={styles.container}>
      <View
        ref={boardRef}
        collapsable={false}
        onLayout={() => {
          boardRef.current?.measureInWindow((x, y, measuredWidth) => {
            onBoardFrameChange?.({ x, y, width: measuredWidth, height: boardHeight });
          });
        }}
        style={{ width: boardWidth, height: contentHeight }}
      >
        <GestureDetector gesture={Gesture.Simultaneous(pinch, boardPan)}>
          <Animated.View
            style={[
              {
                width: boardWidth,
                height: contentHeight,
                transformOrigin: "top center",
              },
              zoomStyle,
            ]}
          >
          {!externalDrawer && drawerOpen ? (
            <Animated.View
              entering={FadeInDown.duration(240)}
              exiting={FadeOutDown.duration(160)}
              pointerEvents="none"
              style={[
                styles.drawerPanel,
                {
                  top: drawerTop,
                  height: drawerHeaderHeight + drawerBodyHeight,
                  borderColor: `${colors.accent}62`,
                  borderRadius: Math.max(11, colors.radius),
                  shadowColor: colors.accent,
                },
              ]}
            >
              <LinearGradient colors={[colors.panel, `${colors.panelAlt}fa`, `${colors.primary}16`]} style={StyleSheet.absoluteFill} />
              <View style={[styles.drawerInnerGlow, { backgroundColor: `${colors.accent}0d` }]} />
            </Animated.View>
          ) : null}
          {!externalDrawer && drawerOpen ? <Animated.View entering={FadeInDown.delay(70).duration(220)} pointerEvents="none" style={[styles.traySurface, { top: drawerBodyTop, height: drawerBodyHeight, borderRadius: Math.max(8, colors.radius) }]}>
            {storedPieces.length === 0 ? <View style={styles.emptyDrawer}><Ionicons name="sparkles-outline" size={28} color={colors.accent} /><Text style={[styles.emptyDrawerText, { color: colors.muted }]}>{t("A caixa está vazia", "The drawer is empty")}</Text></View> : null}
            <Ionicons name="extension-puzzle-outline" size={92} color={`${colors.accent}0c`} style={styles.trayWatermark} />
          </Animated.View> : null}
          <Svg width={boardWidth} height={boardHeight} style={{ position: "absolute", left: 0, top: 0 }}>
            <Rect x={1} y={1} width={boardWidth - 2} height={boardHeight - 2} rx={Math.max(5, colors.radius)} fill={colors.panelAlt} stroke={`${colors.accent}70`} strokeWidth={2} />
            {Array.from({ length: columns - 1 }, (_, index) => (
              <Path key={`column-${index}`} d={`M ${(index + 1) * cell} 0 V ${boardHeight}`} stroke={`${colors.accent}18`} strokeWidth={1} />
            ))}
            {Array.from({ length: rows - 1 }, (_, index) => (
              <Path key={`row-${index}`} d={`M 0 ${(index + 1) * cell} H ${boardWidth}`} stroke={`${colors.accent}18`} strokeWidth={1} />
            ))}
          </Svg>

          {!externalDrawer ? <GestureDetector gesture={drawerTap}>
            <View
              accessible
              accessibilityRole="button"
              accessibilityState={{ expanded: drawerOpen }}
              accessibilityLabel={drawerOpen ? t("Fechar bandeja", "Close tray") : t("Abrir bandeja", "Open tray")}
              style={[
                styles.drawerHeaderShell,
                {
                  top: drawerTop,
                  height: drawerHeaderHeight,
                  borderColor: draggingActivePiece ? colors.accent : `${colors.accent}45`,
                  backgroundColor: drawerOpen ? "transparent" : colors.panel,
                  borderRadius: Math.max(9, colors.radius),
                },
              ]}
            >
              <LinearGradient colors={[`${colors.accent}16`, `${colors.primary}0d`]} style={StyleSheet.absoluteFill} />
              <View style={[styles.drawerLeadIcon, { backgroundColor: `${colors.accent}18` }]}><Ionicons name="file-tray-full-outline" size={22} color={colors.accent} /></View>
              <View style={styles.drawerCopy}><Text style={[styles.drawerTitle, { color: colors.text }]}>{drawerOpen ? t("Bandeja de peças", "Piece tray") : t("Abrir bandeja", "Open piece tray")}</Text><Text style={[styles.drawerMeta, { color: colors.muted }]}>{storedPieces.length} {drawerOpen ? t("peças · arraste para o tabuleiro", "pieces · drag onto the board") : t("peças guardadas", "stored pieces")}</Text></View>
              <View
                pointerEvents="none"
                style={[styles.storageDock, { left: storageDockLeft, top: (drawerHeaderHeight - storageDockSize) / 2, width: storageDockSize, height: storageDockSize, borderColor: draggingActivePiece ? colors.accent : `${colors.muted}44`, backgroundColor: draggingActivePiece ? `${colors.accent}30` : colors.panelAlt }]}
              >
                <Ionicons name={draggingActivePiece ? "archive" : "archive-outline"} size={22} color={draggingActivePiece ? colors.accent : colors.muted} />
              </View>
              <Ionicons name={drawerOpen ? "chevron-down" : "chevron-up"} size={20} color={colors.muted} />
            </View>
          </GestureDetector> : null}

          {activePieces.map((piece) => (
            <DraggablePiece
              key={piece.id}
              piece={piece}
              imageUri={imageUri}
              boardWidth={boardWidth}
              boardHeight={boardHeight}
              cell={cell}
              rows={rows}
              columns={columns}
              scale={scale}
              pieceDragActive={pieceDragActive}
              activeGroupId={activeGroupId}
              activeGroupPieceId={activeGroupPieceId}
              groupTranslationX={groupTranslationX}
              groupTranslationY={groupTranslationY}
              storageTarget={storageTarget}
              storageScreenTarget={storageScreenTarget}
              stored={false}
              stroke={piece.isPlaced ? colors.accent : `${colors.text}99`}
              onChange={updatePiece}
              onDragState={setDraggingActivePiece}
            />
          ))}
          {!externalDrawer && drawerOpen ? displayedStoredPieces.map((piece) => (
            <DraggablePiece
              key={piece.id}
              piece={piece}
              imageUri={imageUri}
              boardWidth={boardWidth}
              boardHeight={boardHeight}
              cell={cell}
              rows={rows}
              columns={columns}
              scale={scale}
              pieceDragActive={pieceDragActive}
              activeGroupId={activeGroupId}
              activeGroupPieceId={activeGroupPieceId}
              groupTranslationX={groupTranslationX}
              groupTranslationY={groupTranslationY}
              storageTarget={storageTarget}
              storageScreenTarget={storageScreenTarget}
              stored
              stroke={`${colors.text}b8`}
              onChange={updatePiece}
              onDragState={setDraggingActivePiece}
            />
          )) : null}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

function DraggablePiece({
  piece,
  imageUri,
  boardWidth,
  boardHeight,
  cell,
  rows,
  columns,
  scale,
  pieceDragActive,
  activeGroupId,
  activeGroupPieceId,
  groupTranslationX,
  groupTranslationY,
  storageTarget,
  storageScreenTarget,
  stored,
  stroke,
  onChange,
  onDragState,
}: {
  piece: PuzzlePiece;
  imageUri: string;
  boardWidth: number;
  boardHeight: number;
  cell: number;
  rows: number;
  columns: number;
  scale: SharedValue<number>;
  pieceDragActive: SharedValue<boolean>;
  activeGroupId: SharedValue<string | null>;
  activeGroupPieceId: SharedValue<string | null>;
  groupTranslationX: SharedValue<number>;
  groupTranslationY: SharedValue<number>;
  storageTarget: { x: number; y: number; width: number; height: number };
  storageScreenTarget?: ScreenFrame | null;
  stored: boolean;
  stroke: string;
  onChange: (
    id: string,
    x: number,
    y: number,
    rotation: number,
    isPlaced: boolean,
    destination: "board" | "drawer",
  ) => void;
  onDragState: (active: boolean) => void;
}) {
  const margin = cell * 0.24;
  const extent = cell + margin * 2;
  const x = useSharedValue(piece.currentPosition.x * cell);
  const y = useSharedValue(piece.currentPosition.y * cell);
  const rotation = useSharedValue(normalizeQuarterTurn(piece.currentPosition.rotation));
  const startX = useSharedValue(piece.currentPosition.x * cell);
  const startY = useSharedValue(piece.currentPosition.y * cell);
  const dragging = useSharedValue(false);
  const path = useMemo(() => piecePath(piece.shape, cell, margin), [cell, margin, piece.shape]);
  const clipId = `clip-${piece.id}`;

  useEffect(() => {
    const belongsToMovableGroup = Boolean(piece.groupId && piece.groupId !== "tabuleiro");
    if (belongsToMovableGroup) {
      // Connected pieces must update as one rigid object. A spring per piece
      // creates a visible "tail" where the other members arrive afterwards.
      x.set(piece.currentPosition.x * cell);
      y.set(piece.currentPosition.y * cell);
    } else {
      x.set(withSpring(piece.currentPosition.x * cell, { damping: 18, stiffness: 210 }));
      y.set(withSpring(piece.currentPosition.y * cell, { damping: 18, stiffness: 210 }));
    }
    if (activeGroupPieceId.get() === piece.id) {
      groupTranslationX.set(0);
      groupTranslationY.set(0);
      activeGroupId.set(null);
      activeGroupPieceId.set(null);
    }
    rotation.set(withTiming(normalizeQuarterTurn(piece.currentPosition.rotation), { duration: 180 }));
  }, [activeGroupId, activeGroupPieceId, cell, groupTranslationX, groupTranslationY, piece.currentPosition.rotation, piece.currentPosition.x, piece.currentPosition.y, piece.groupId, piece.id, rotation, x, y]);

  const notify = (
    nextX: number,
    nextY: number,
    nextRotation: number,
    destination: "board" | "drawer",
  ) => {
    const normalized = normalizeQuarterTurn(nextRotation);
    if (destination === "drawer") {
      onChange(piece.id, nextX / cell, nextY / cell, normalized, false, "drawer");
      return;
    }
    const targetX = piece.correctPosition.x * cell;
    const targetY = piece.correctPosition.y * cell;
    const closeEnough = Math.hypot(nextX - targetX, nextY - targetY) <= cell * 0.38;
    onChange(
      piece.id,
      nextX / cell,
      nextY / cell,
      normalized,
      closeEnough && normalized === 0,
      "board",
    );
  };

  const pan = Gesture.Pan()
    .enabled(!piece.isPlaced)
    .minDistance(2)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      dragging.set(true);
      startX.set(x.get());
      startY.set(y.get());
      pieceDragActive.set(true);
      if (piece.groupId && piece.groupId !== "tabuleiro") {
        activeGroupId.set(piece.groupId);
        activeGroupPieceId.set(piece.id);
        groupTranslationX.set(0);
        groupTranslationY.set(0);
      } else {
        activeGroupId.set(null);
        activeGroupPieceId.set(null);
      }
      if (!stored) runOnJS(onDragState)(true);
    })
    .onUpdate((event) => {
      const translationX = event.translationX / scale.get();
      const translationY = event.translationY / scale.get();
      x.set(startX.get() + translationX);
      y.set(startY.get() + translationY);
      if (activeGroupPieceId.get() === piece.id) {
        groupTranslationX.set(translationX);
        groupTranslationY.set(translationY);
      }
    })
    .onEnd((event) => {
      if (stored) {
        const worldX = x.get() / cell;
        const worldY = y.get() / cell;
        const releasedOnBoard =
          worldX > -0.9 && worldX < columns - 0.1 && worldY > -0.9 && worldY < rows - 0.1;
        if (releasedOnBoard) {
          const releasedX = Math.max(-0.15, Math.min(columns - 0.85, worldX)) * cell;
          const releasedY = Math.max(-0.15, Math.min(rows - 0.85, worldY)) * cell;
          x.set(withSpring(releasedX));
          y.set(withSpring(releasedY));
          runOnJS(notify)(releasedX, releasedY, rotation.get(), "board");
        } else {
          x.set(withSpring(piece.currentPosition.x * cell));
          y.set(withSpring(piece.currentPosition.y * cell));
        }
        return;
      }

      const worldCenterX = x.get() / cell + 0.5;
      const worldCenterY = y.get() / cell + 0.5;
      const storageHitSlop = 32;
      const droppedOnScreenStorage = storageScreenTarget
        ? event.absoluteX >= storageScreenTarget.x - storageHitSlop &&
          event.absoluteX <= storageScreenTarget.x + storageScreenTarget.width + storageHitSlop &&
          event.absoluteY >= storageScreenTarget.y - storageHitSlop &&
          event.absoluteY <= storageScreenTarget.y + storageScreenTarget.height + storageHitSlop
        : false;
      const droppedOnStorage = droppedOnScreenStorage ||
        (!storageScreenTarget &&
          worldCenterX >= storageTarget.x &&
          worldCenterX <= storageTarget.x + storageTarget.width &&
          worldCenterY >= storageTarget.y &&
          worldCenterY <= storageTarget.y + storageTarget.height);
      if (droppedOnStorage) {
        runOnJS(notify)(x.get(), y.get(), rotation.get(), "drawer");
        return;
      }

      const targetX = piece.correctPosition.x * cell;
      const targetY = piece.correctPosition.y * cell;
      const currentQuarterTurn = Math.round(rotation.get() / 90) * 90;
      const normalized = ((currentQuarterTurn % 360) + 360) % 360;
      const snaps = Math.hypot(x.get() - targetX, y.get() - targetY) <= cell * 0.38 && normalized === 0;
      if (snaps) {
        if (piece.groupId && piece.groupId !== "tabuleiro") {
          x.set(targetX);
          y.set(targetY);
        } else {
          x.set(withSpring(targetX));
          y.set(withSpring(targetY));
        }
      }
      runOnJS(notify)(
        snaps ? targetX : x.get(),
        snaps ? targetY : y.get(),
        rotation.get(),
        "board",
      );
    })
    .onFinalize((_event, success) => {
      dragging.set(false);
      pieceDragActive.set(false);
      if (!success && activeGroupPieceId.get() === piece.id) {
        groupTranslationX.set(0);
        groupTranslationY.set(0);
        activeGroupId.set(null);
        activeGroupPieceId.set(null);
      }
      if (!stored) runOnJS(onDragState)(false);
    });

  const rotate = Gesture.Tap()
    .enabled(!piece.isPlaced && !stored && piece.groupId === null)
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      const currentQuarterTurn = Math.round(rotation.get() / 90) * 90;
      const nextRotation = ((currentQuarterTurn + 90) % 360 + 360) % 360;
      rotation.set(withTiming(nextRotation, { duration: 180 }));
      runOnJS(notify)(x.get(), y.get(), nextRotation, "board");
    });

  const gesture = Gesture.Race(rotate, pan);
  const animatedStyle = useAnimatedStyle(() => {
    const followsActiveGroup = Boolean(
      piece.groupId &&
      activeGroupId.get() === piece.groupId &&
      activeGroupPieceId.get() !== piece.id,
    );
    return {
      left: x.get() + (followsActiveGroup ? groupTranslationX.get() : 0),
      top: y.get() + (followsActiveGroup ? groupTranslationY.get() : 0),
      zIndex: dragging.get() ? 100 : piece.isPlaced ? 1 : 30,
      transform: [{ rotate: `${rotation.get()}deg` }, { scale: stored ? 0.76 : 1 }],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: cell,
            height: cell,
            overflow: "visible",
          },
          animatedStyle,
        ]}
      >
        <Svg width={extent} height={extent} style={{ position: "absolute", left: -margin, top: -margin }}>
          <Defs><ClipPath id={clipId}><Path d={path} /></ClipPath></Defs>
          <SvgImage
            href={{ uri: imageUri }}
            x={margin - piece.column * cell}
            y={margin - piece.row * cell}
            width={boardWidth}
            height={boardHeight}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
          <Path d={path} fill="transparent" stroke={stroke} strokeWidth={Math.max(1, cell * 0.025)} />
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  drawerPanel: { position: "absolute", left: 0, right: 0, zIndex: 10, borderWidth: 1.5, overflow: "hidden", shadowOpacity: .22, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 9 },
  drawerInnerGlow: { position: "absolute", left: 10, right: 10, top: 70, bottom: 10, borderRadius: 18 },
  traySurface: { position: "absolute", left: 0, width: "100%", zIndex: 11, overflow: "hidden" },
  trayWatermark: { position: "absolute", right: -16, top: 38 },
  drawerHeaderShell: { position: "absolute", left: 0, right: 0, zIndex: 20, borderWidth: 1.5, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 10, paddingRight: 10 },
  drawerLeadIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  drawerCopy: { flex: 1, minWidth: 0, paddingRight: 58 },
  drawerTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 15 },
  drawerMeta: { fontFamily: "Inter_600SemiBold", fontSize: 9, marginTop: 2 },
  storageDock: { position: "absolute", zIndex: 2, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyDrawer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 7 },
  emptyDrawerText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});
