import { normalizeQuarterTurn, type PuzzlePiece } from "@puzzled/puzzle-engine";
import { memo, useEffect, useMemo, useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { ClipPath, Defs, Path, Image as SvgImage } from "react-native-svg";
import type { ScreenFrame } from "@/components/puzzle-piece-drawer";
import { piecePath } from "@/lib/piece-path";
import type { PuzzleHintCommand } from "./native-puzzle-board";

export const StaticPlacedPiece = memo(function StaticPlacedPiece({
  piece,
  imageUri,
  boardWidth,
  boardHeight,
  boardOffsetX,
  cell,
  stroke,
}: {
  piece: PuzzlePiece;
  imageUri: string;
  boardWidth: number;
  boardHeight: number;
  boardOffsetX: number;
  cell: number;
  stroke: string;
}) {
  const margin = cell * 0.24;
  const extent = cell + margin * 2;
  const path = useMemo(() => piecePath(piece.shape, cell, margin), [cell, margin, piece.shape]);
  const clipId = `placed-${piece.id}`;
  return (
    <Svg
      pointerEvents="none"
      width={extent}
      height={extent}
      style={{
        position: "absolute",
        left: boardOffsetX + piece.correctPosition.x * cell - margin,
        top: piece.correctPosition.y * cell - margin,
        zIndex: 1,
      }}
    >
      <Defs>
        <ClipPath id={clipId}>
          <Path d={path} />
        </ClipPath>
      </Defs>
      <SvgImage
        href={{ uri: imageUri }}
        x={margin - piece.column * cell}
        y={margin - piece.row * cell}
        width={boardWidth}
        height={boardHeight}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
      <Path
        d={path}
        fill="transparent"
        stroke={stroke}
        strokeOpacity={0.32}
        strokeWidth={Math.max(0.7, cell * 0.022)}
      />
    </Svg>
  );
});

export const DraggablePiece = memo(function DraggablePiece({
  piece,
  imageUri,
  boardWidth,
  boardHeight,
  boardOffsetX,
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
  headerScreenTarget,
  storageScreenTarget,
  rotationEnabled,
  magnetismEnabled,
  stored,
  stroke,
  onChange,
  onDragState,
  hintCommand,
  onHintAnimationComplete,
}: {
  piece: PuzzlePiece;
  imageUri: string;
  boardWidth: number;
  boardHeight: number;
  boardOffsetX: number;
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
  headerScreenTarget?: ScreenFrame | null;
  storageScreenTarget?: ScreenFrame | null;
  rotationEnabled: boolean;
  magnetismEnabled: boolean;
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
  hintCommand?: PuzzleHintCommand | null;
  onHintAnimationComplete?: (pieceId: string) => void;
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
  // With magnetism off, the piece still clicks into its exact slot once close
  // enough, but the forgiveness radius shrinks a lot instead of disappearing
  // entirely (a literal zero tolerance would be unplayable given touch imprecision).
  const snapRadius = magnetismEnabled ? Math.max(cell * 0.52, 10) : Math.max(cell * 0.12, 4);
  const lastHintCommandId = useRef(0);

  useEffect(() => {
    const belongsToMovableGroup = Boolean(piece.groupId && piece.groupId !== "tabuleiro");
    if (belongsToMovableGroup || piece.isPlaced) {
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
    rotation.set(
      withTiming(normalizeQuarterTurn(piece.currentPosition.rotation), { duration: 180 }),
    );
  }, [
    activeGroupId,
    activeGroupPieceId,
    cell,
    groupTranslationX,
    groupTranslationY,
    piece.currentPosition.rotation,
    piece.currentPosition.x,
    piece.currentPosition.y,
    piece.groupId,
    piece.id,
    piece.isPlaced,
    rotation,
    x,
    y,
  ]);

  useEffect(() => {
    if (
      !hintCommand ||
      hintCommand.pieceId !== piece.id ||
      lastHintCommandId.current === hintCommand.id
    )
      return;
    lastHintCommandId.current = hintCommand.id;
    const targetX = piece.correctPosition.x * cell;
    const targetY = piece.correctPosition.y * cell;
    rotation.set(withDelay(260, withTiming(0, { duration: 520 })));
    x.set(withDelay(260, withTiming(targetX, { duration: 980 })));
    y.set(
      withDelay(
        260,
        withTiming(targetY, { duration: 980 }, (finished) => {
          if (finished && onHintAnimationComplete) runOnJS(onHintAnimationComplete)(piece.id);
        }),
      ),
    );
  }, [
    cell,
    hintCommand,
    onHintAnimationComplete,
    piece.correctPosition.x,
    piece.correctPosition.y,
    piece.id,
    rotation,
    x,
    y,
  ]);

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
    const closeEnough = Math.hypot(nextX - targetX, nextY - targetY) <= snapRadius;
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
    .enabled(!piece.isPlaced && hintCommand?.pieceId !== piece.id)
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

      const droppedOnHeader = headerScreenTarget
        ? event.absoluteY <= headerScreenTarget.y + headerScreenTarget.height
        : false;
      if (droppedOnHeader) {
        x.set(withSpring(startX.get()));
        y.set(withSpring(startY.get()));
        if (activeGroupPieceId.get() === piece.id) {
          groupTranslationX.set(0);
          groupTranslationY.set(0);
          activeGroupId.set(null);
          activeGroupPieceId.set(null);
        }
        return;
      }

      const worldCenterX = x.get() / cell + 0.5;
      const worldCenterY = y.get() / cell + 0.5;
      const droppedOnScreenStorage = storageScreenTarget
        ? event.absoluteX >= storageScreenTarget.x &&
          event.absoluteX <= storageScreenTarget.x + storageScreenTarget.width &&
          event.absoluteY >= storageScreenTarget.y &&
          event.absoluteY <= storageScreenTarget.y + storageScreenTarget.height
        : false;
      const droppedOnStorage =
        droppedOnScreenStorage ||
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
      const snaps =
        Math.hypot(x.get() - targetX, y.get() - targetY) <= snapRadius && normalized === 0;
      if (snaps) {
        x.set(targetX);
        y.set(targetY);
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
    .enabled(
      rotationEnabled &&
        !piece.isPlaced &&
        !stored &&
        piece.groupId === null &&
        hintCommand?.pieceId !== piece.id,
    )
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      const currentQuarterTurn = Math.round(rotation.get() / 90) * 90;
      const nextRotation = (((currentQuarterTurn + 90) % 360) + 360) % 360;
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
      left: boardOffsetX + x.get() + (followsActiveGroup ? groupTranslationX.get() : 0),
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
        <Svg
          width={extent}
          height={extent}
          style={{ position: "absolute", left: -margin, top: -margin }}
        >
          <Defs>
            <ClipPath id={clipId}>
              <Path d={path} />
            </ClipPath>
          </Defs>
          <SvgImage
            href={{ uri: imageUri }}
            x={margin - piece.column * cell}
            y={margin - piece.row * cell}
            width={boardWidth}
            height={boardHeight}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
          <Path
            d={path}
            fill="transparent"
            stroke={stroke}
            strokeWidth={Math.max(1, cell * 0.025)}
          />
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
});
