import { normalizeQuarterTurn, type PuzzlePiece } from "@puzzled/puzzle-engine";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue } from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import type { ScreenFrame } from "@/components/puzzle-piece-drawer";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useBoardCamera } from "@/hooks/use-board-camera";
import { applyPieceTransition } from "@/lib/puzzle-piece-transitions";
import type { MobilePreferences, MobileTheme } from "@/state/app-provider";
import { DraggablePiece, StaticPlacedPiece } from "./native-puzzle-piece";

interface NativePuzzleBoardProps {
  imageUri: string;
  rows: number;
  columns: number;
  pieces: PuzzlePiece[];
  preferences: MobilePreferences;
  theme: MobileTheme;
  rotationEnabled: boolean;
  magnetismEnabled: boolean;
  zoomCommand?: PuzzleZoomCommand | null;
  hintCommand?: PuzzleHintCommand | null;
  highlightCommand?: PuzzleHighlightCommand | null;
  cameraViewportTop: number;
  cameraViewportBottom: number;
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
  headerScreenTarget?: ScreenFrame | null;
  storageScreenTarget?: ScreenFrame | null;
  onBoardFrameChange?: (frame: ScreenFrame) => void;
  onPieceStored?: () => void;
  onPiecesChange: (pieces: PuzzlePiece[]) => void;
  onCameraChange: (panX: number, panY: number, zoom: number) => void;
  onHintAnimationComplete?: (pieceId: string) => void;
}

export interface PuzzleZoomCommand {
  id: number;
  action: "in" | "out" | "reset";
}

export interface PuzzleHintCommand {
  id: number;
  pieceId: string;
}

export interface PuzzleHighlightCommand {
  id: number;
}

// Stable reference so DraggablePiece's memoization isn't broken by a fresh
// closure every render; the board on this screen has no visible drag indicator.
function noop() {}

export const NativePuzzleBoard = memo(function NativePuzzleBoard({
  imageUri,
  rows,
  columns,
  pieces,
  preferences,
  theme,
  rotationEnabled,
  magnetismEnabled,
  zoomCommand,
  hintCommand,
  highlightCommand,
  cameraViewportTop,
  cameraViewportBottom,
  initialZoom,
  initialPanX,
  initialPanY,
  headerScreenTarget,
  storageScreenTarget,
  onBoardFrameChange,
  onPieceStored,
  onPiecesChange,
  onCameraChange,
  onHintAnimationComplete,
}: NativePuzzleBoardProps) {
  const { height, width } = useWindowDimensions();
  const colors = mobileThemes[theme];
  const boardWidth = Math.min(352, width - 24);
  const canvasWidth = width - 24;
  const boardOffsetX = (canvasWidth - boardWidth) / 2;
  const cell = boardWidth / columns;
  const boardHeight = rows * cell;
  const cameraVisibleGrip = Math.max(36, Math.min(48, width * 0.11));
  const storedPieces = useMemo(
    () => pieces.filter((piece) => !piece.isPlaced && piece.trayId !== null),
    [pieces],
  );
  const placedPieces = useMemo(() => pieces.filter((piece) => piece.isPlaced), [pieces]);
  const movablePieces = useMemo(
    () => pieces.filter((piece) => !piece.isPlaced && piece.trayId === null),
    [pieces],
  );
  // Off-board anchor for the archive/storage drop target; the visible tray UI
  // lives in the separate, already-virtualized PuzzlePieceDrawer component.
  const drawerTop = boardHeight + Math.max(16, cell * 0.36);
  const drawerHeaderHeight = Math.max(62, cell * 1.02);
  const contentHeight = Math.max(boardHeight, height - 356);
  const storageDockSize = Math.max(42, Math.min(54, cell * 0.82));
  const storageDockLeft = boardWidth - storageDockSize - 42;
  const storageDockTop = drawerTop + (drawerHeaderHeight - storageDockSize) / 2;
  const storageTarget = useMemo(
    () => ({
      x: storageDockLeft / cell,
      y: storageDockTop / cell,
      width: storageDockSize / cell,
      height: storageDockSize / cell,
    }),
    [cell, storageDockLeft, storageDockSize, storageDockTop],
  );
  const migratedLegacyTray = useRef(false);
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const boardRef = useRef<View>(null);
  const activeGroupId = useSharedValue<string | null>(null);
  const activeGroupPieceId = useSharedValue<string | null>(null);
  const groupTranslationX = useSharedValue(0);
  const groupTranslationY = useSharedValue(0);

  const { scale, panX, panY, pieceDragActive, pinch, boardPan, zoomStyle } = useBoardCamera({
    pieces,
    boardWidth,
    boardHeight,
    boardOffsetX,
    canvasWidth,
    cell,
    cameraViewportTop,
    cameraViewportBottom,
    cameraVisibleGrip,
    initialZoom,
    initialPanX,
    initialPanY,
    zoomCommand,
    hintCommand,
    onCameraChange,
  });

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
      const normalizedRotation = rotationEnabled
        ? normalizeQuarterTurn(piece.currentPosition.rotation)
        : 0;
      const mustReleaseInvalidGroup = Boolean(piece.groupId && invalidGroups.has(piece.groupId));
      if (normalizedRotation === piece.currentPosition.rotation && !mustReleaseInvalidGroup)
        return piece;
      changed = true;
      return {
        ...piece,
        groupId: mustReleaseInvalidGroup ? null : piece.groupId,
        currentPosition: { ...piece.currentPosition, rotation: normalizedRotation },
      };
    });
    if (changed) onPiecesChange(normalizedPieces);
  }, [onPiecesChange, pieces, rotationEnabled]);

  const updatePiece = useCallback(
    (
      id: string,
      x: number,
      y: number,
      rotation: number,
      isPlaced: boolean,
      destination: "board" | "drawer",
    ) => {
      const result = applyPieceTransition(
        piecesRef.current,
        { id, x, y, rotation, isPlaced, destination },
        { rows, columns, cell, rotationEnabled, magnetismEnabled },
      );
      if (!result) return;
      onPiecesChange(result.pieces);
      if (result.stored) {
        onPieceStored?.();
        if (preferences.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (result.connected && preferences.haptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [
      cell,
      columns,
      magnetismEnabled,
      onPieceStored,
      onPiecesChange,
      preferences.haptics,
      rotationEnabled,
      rows,
    ],
  );

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
      <View style={{ width: canvasWidth, height: contentHeight, overflow: "visible" }}>
        <View
          ref={boardRef}
          collapsable={false}
          pointerEvents="none"
          onLayout={() => {
            boardRef.current?.measureInWindow((x, y, measuredWidth) => {
              onBoardFrameChange?.({ x, y, width: measuredWidth, height: boardHeight });
            });
          }}
          style={{
            position: "absolute",
            left: boardOffsetX,
            top: 0,
            width: boardWidth,
            height: boardHeight,
          }}
        />
        <GestureDetector gesture={Gesture.Simultaneous(pinch, boardPan)}>
          <Animated.View
            style={[
              {
                width: canvasWidth,
                height: contentHeight,
                transformOrigin: "top center",
              },
              zoomStyle,
            ]}
          >
            <Svg
              width={boardWidth}
              height={boardHeight}
              style={{ position: "absolute", left: boardOffsetX, top: 0 }}
            >
              <Rect
                x={1}
                y={1}
                width={boardWidth - 2}
                height={boardHeight - 2}
                fill={colors.panelAlt}
                stroke={`${colors.accent}70`}
                strokeWidth={2}
              />
              {Array.from({ length: columns - 1 }, (_, index) => (
                <Path
                  key={`column-${index}`}
                  d={`M ${(index + 1) * cell} 0 V ${boardHeight}`}
                  stroke={`${colors.accent}18`}
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: rows - 1 }, (_, index) => (
                <Path
                  key={`row-${index}`}
                  d={`M 0 ${(index + 1) * cell} H ${boardWidth}`}
                  stroke={`${colors.accent}18`}
                  strokeWidth={1}
                />
              ))}
            </Svg>

            {placedPieces.map((piece) => (
              <StaticPlacedPiece
                key={piece.id}
                piece={piece}
                imageUri={imageUri}
                boardWidth={boardWidth}
                boardHeight={boardHeight}
                boardOffsetX={boardOffsetX}
                cell={cell}
                stroke={colors.accent}
              />
            ))}

            {movablePieces.map((piece) => (
              <DraggablePiece
                key={piece.id}
                piece={piece}
                imageUri={imageUri}
                boardWidth={boardWidth}
                boardHeight={boardHeight}
                boardOffsetX={boardOffsetX}
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
                headerScreenTarget={headerScreenTarget}
                storageScreenTarget={storageScreenTarget}
                rotationEnabled={rotationEnabled}
                magnetismEnabled={magnetismEnabled}
                stored={false}
                stroke={piece.isPlaced ? colors.accent : `${colors.text}99`}
                onChange={updatePiece}
                onDragState={noop}
                hintCommand={hintCommand}
                highlightCommand={highlightCommand}
                onHintAnimationComplete={onHintAnimationComplete}
              />
            ))}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: "center" },
});
