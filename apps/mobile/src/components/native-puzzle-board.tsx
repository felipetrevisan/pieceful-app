import type { PuzzlePiece, PuzzlePieceShape } from "@puzzled/puzzle-engine";
import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { ClipPath, Defs, Image as SvgImage, Path, Rect } from "react-native-svg";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

interface NativePuzzleBoardProps {
  imageUri: string;
  rows: number;
  columns: number;
  pieces: PuzzlePiece[];
  initialZoom: number;
  onPiecesChange: (pieces: PuzzlePiece[]) => void;
  onZoomChange: (zoom: number) => void;
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

export function NativePuzzleBoard({
  imageUri,
  rows,
  columns,
  pieces,
  initialZoom,
  onPiecesChange,
  onZoomChange,
}: NativePuzzleBoardProps) {
  const { theme, t } = useApp();
  const { width } = useWindowDimensions();
  const colors = mobileThemes[theme];
  const boardWidth = Math.min(352, width - 24);
  const cell = boardWidth / columns;
  const boardHeight = rows * cell;
  const trayRows = Math.ceil(pieces.length / columns);
  const contentHeight = boardHeight + cell * 1.25 + trayRows * cell * 1.18;
  const scale = useSharedValue(initialZoom);
  const savedScale = useSharedValue(initialZoom);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(0.8, Math.min(2.4, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(onZoomChange)(scale.value);
    });
  const zoomStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function updatePiece(id: string, x: number, y: number, rotation: number, isPlaced: boolean) {
    const next = pieces.map((piece) =>
      piece.id === id
        ? {
            ...piece,
            isPlaced,
            currentPosition: {
              x: isPlaced ? piece.correctPosition.x : x,
              y: isPlaced ? piece.correctPosition.y : y,
              rotation: isPlaced ? 0 : rotation,
            },
          }
        : piece,
    );
    onPiecesChange(next);
    if (isPlaced) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View className="items-center">
      <View className="mb-3 flex-row items-center gap-2 self-stretch rounded-2xl px-4 py-3" style={{ backgroundColor: colors.panelAlt }}>
        <Text className="text-base">🤏</Text>
        <Text className="flex-1 text-sm font-bold" style={{ color: colors.text }}>
          {t("Use dois dedos para ampliar. Toque duas vezes na peça para girar.", "Pinch to zoom. Double tap a piece to rotate it.")}
        </Text>
      </View>
      <GestureDetector gesture={pinch}>
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
          <Svg width={boardWidth} height={boardHeight} style={{ position: "absolute", left: 0, top: 0 }}>
            <Rect x={0} y={0} width={boardWidth} height={boardHeight} rx={12} fill={colors.panelAlt} stroke={`${colors.accent}55`} strokeWidth={2} />
            {Array.from({ length: columns - 1 }, (_, index) => (
              <Path key={`column-${index}`} d={`M ${(index + 1) * cell} 0 V ${boardHeight}`} stroke={`${colors.accent}18`} strokeWidth={1} />
            ))}
            {Array.from({ length: rows - 1 }, (_, index) => (
              <Path key={`row-${index}`} d={`M 0 ${(index + 1) * cell} H ${boardWidth}`} stroke={`${colors.accent}18`} strokeWidth={1} />
            ))}
          </Svg>

          {pieces.map((piece) => (
            <DraggablePiece
              key={piece.id}
              piece={piece}
              imageUri={imageUri}
              boardWidth={boardWidth}
              boardHeight={boardHeight}
              cell={cell}
              scale={scale}
              stroke={piece.isPlaced ? colors.accent : `${colors.text}99`}
              onChange={updatePiece}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function DraggablePiece({
  piece,
  imageUri,
  boardWidth,
  boardHeight,
  cell,
  scale,
  stroke,
  onChange,
}: {
  piece: PuzzlePiece;
  imageUri: string;
  boardWidth: number;
  boardHeight: number;
  cell: number;
  scale: SharedValue<number>;
  stroke: string;
  onChange: (id: string, x: number, y: number, rotation: number, isPlaced: boolean) => void;
}) {
  const margin = cell * 0.24;
  const extent = cell + margin * 2;
  const x = useSharedValue(piece.currentPosition.x * cell);
  const y = useSharedValue(piece.currentPosition.y * cell);
  const rotation = useSharedValue(piece.currentPosition.rotation);
  const startX = useSharedValue(x.value);
  const startY = useSharedValue(y.value);
  const path = useMemo(() => piecePath(piece.shape, cell, margin), [cell, margin, piece.shape]);
  const clipId = `clip-${piece.id}`;

  const notify = (nextX: number, nextY: number, nextRotation: number) => {
    const normalized = ((nextRotation % 360) + 360) % 360;
    const targetX = piece.correctPosition.x * cell;
    const targetY = piece.correctPosition.y * cell;
    const closeEnough = Math.hypot(nextX - targetX, nextY - targetY) <= cell * 0.58;
    onChange(piece.id, nextX / cell, nextY / cell, normalized, closeEnough && normalized === 0);
  };

  const pan = Gesture.Pan()
    .enabled(!piece.isPlaced)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((event) => {
      x.value = startX.value + event.translationX / scale.value;
      y.value = startY.value + event.translationY / scale.value;
    })
    .onEnd(() => {
      const targetX = piece.correctPosition.x * cell;
      const targetY = piece.correctPosition.y * cell;
      const normalized = ((rotation.value % 360) + 360) % 360;
      const snaps = Math.hypot(x.value - targetX, y.value - targetY) <= cell * 0.58 && normalized === 0;
      if (snaps) {
        x.value = withSpring(targetX);
        y.value = withSpring(targetY);
      }
      runOnJS(notify)(snaps ? targetX : x.value, snaps ? targetY : y.value, rotation.value);
    });

  const rotate = Gesture.Tap()
    .enabled(!piece.isPlaced)
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      const nextRotation = (rotation.value + 90) % 360;
      rotation.value = withTiming(nextRotation, { duration: 180 });
      runOnJS(notify)(x.value, y.value, nextRotation);
    });

  const gesture = Gesture.Race(rotate, pan);
  const animatedStyle = useAnimatedStyle(() => ({
    left: x.value - margin,
    top: y.value - margin,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: extent,
            height: extent,
            zIndex: piece.isPlaced ? 1 : 10,
          },
          animatedStyle,
        ]}
      >
        <Svg width={extent} height={extent}>
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
