import type { PuzzlePiece, PuzzlePieceShape } from "@puzzled/puzzle-engine";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
  const { preferences, theme, t } = useApp();
  const { width } = useWindowDimensions();
  const colors = mobileThemes[theme];
  const boardWidth = Math.min(352, width - 24);
  const cell = boardWidth / columns;
  const boardHeight = rows * cell;
  const trayRows = Math.ceil(pieces.length / columns);
  const contentHeight = boardHeight + cell * 2.2 + trayRows * cell * 1.18;
  const trayTop = boardHeight + cell * 0.55;
  const trayHeight = contentHeight - trayTop;
  const looseCount = pieces.filter((piece) => !piece.isPlaced).length;
  const migratedLegacyTray = useRef(false);
  const scale = useSharedValue(initialZoom);
  const savedScale = useSharedValue(initialZoom);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.set(Math.max(0.8, Math.min(2.4, savedScale.get() * event.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      runOnJS(onZoomChange)(scale.get());
    });
  const zoomStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

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

  const shuffleLoosePieces = useCallback((withFeedback = true) => {
    const loosePieces = pieces.filter((piece) => !piece.isPlaced);
    const slots = Array.from({ length: loosePieces.length }, (_, index) => index);
    for (let index = slots.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [slots[index], slots[target]] = [slots[target], slots[index]];
    }
    const slotByPiece = new Map(loosePieces.map((piece, index) => [piece.id, slots[index] ?? index]));
    onPiecesChange(pieces.map((piece) => {
      if (piece.isPlaced) return piece;
      const slot = slotByPiece.get(piece.id) ?? 0;
      return {
        ...piece,
        currentPosition: {
          ...piece.currentPosition,
          x: slot % columns,
          y: rows + 2.05 + Math.floor(slot / columns) * 1.18,
        },
      };
    }));
    if (withFeedback && preferences.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [columns, onPiecesChange, pieces, preferences.haptics, rows]);

  const legacyOrderedTray = useMemo(() => {
    let loose = 0;
    let ordered = 0;
    pieces.forEach((piece, index) => {
      if (piece.isPlaced) return;
      loose += 1;
      const expectedX = index % columns;
      const expectedY = rows + 1 + Math.floor(index / columns) * 1.18;
      if (Math.abs(piece.currentPosition.x - expectedX) < 0.08 && Math.abs(piece.currentPosition.y - expectedY) < 0.08) ordered += 1;
    });
    return loose > 1 && ordered / loose >= 0.75;
  }, [columns, pieces, rows]);

  useEffect(() => {
    if (!legacyOrderedTray || migratedLegacyTray.current) return;
    migratedLegacyTray.current = true;
    shuffleLoosePieces(false);
  }, [legacyOrderedTray, shuffleLoosePieces]);

  return (
    <View style={styles.container}>
      <View style={styles.gestureRow}>
        <GestureTip icon="expand-outline" label={t("Pinça para zoom", "Pinch to zoom")} />
        <GestureTip icon="sync-outline" label={t("2 toques para girar", "Double tap to rotate")} />
      </View>
      <View style={[styles.workspaceBar, { backgroundColor: colors.panel, borderColor: `${colors.accent}30`, borderRadius: Math.max(8, colors.radius) }]}>
        <View style={[styles.workspaceIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name="grid-outline" size={20} color={colors.accent} /></View>
        <View style={styles.workspaceCopy}><Text style={[styles.workspaceKicker, { color: colors.muted }]}>{t("ÁREA DE MONTAGEM", "PUZZLE WORKSPACE")}</Text><Text style={[styles.workspaceCount, { color: colors.text }]}>{looseCount} {t("peças soltas", "loose pieces")}</Text></View>
        <Pressable accessibilityLabel={t("Embaralhar peças soltas", "Shuffle loose pieces")} onPress={() => shuffleLoosePieces()} style={({ pressed }) => pressed ? styles.pressed : null}>
          <View style={[styles.shuffleButton, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}50`, borderRadius: Math.max(7, colors.radius - 6) }]}><Ionicons name="shuffle" size={20} color={colors.accent} /><Text style={[styles.shuffleLabel, { color: colors.accent }]}>{t("Misturar", "Shuffle")}</Text></View>
        </Pressable>
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
          <View pointerEvents="none" style={[styles.traySurface, { top: trayTop, height: trayHeight, borderColor: `${colors.accent}35`, borderRadius: Math.max(8, colors.radius) }]}>
            <LinearGradient colors={[`${colors.panelAlt}ef`, `${colors.panel}cc`]} style={StyleSheet.absoluteFill} />
            <View style={styles.trayHeading}><View style={[styles.trayPulse, { backgroundColor: colors.primary }]} /><Text style={[styles.trayTitle, { color: colors.muted }]}>{t("BANDEJA EMBARALHADA", "SHUFFLED TRAY")}</Text></View>
            <Ionicons name="extension-puzzle-outline" size={92} color={`${colors.accent}0c`} style={styles.trayWatermark} />
          </View>
          <Svg width={boardWidth} height={boardHeight} style={{ position: "absolute", left: 0, top: 0 }}>
            <Rect x={1} y={1} width={boardWidth - 2} height={boardHeight - 2} rx={Math.max(5, colors.radius)} fill={colors.panelAlt} stroke={`${colors.accent}70`} strokeWidth={2} />
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

function GestureTip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { theme } = useApp(); const colors = mobileThemes[theme];
  return <View style={[styles.gestureTip, { backgroundColor: colors.panelAlt, borderRadius: Math.max(7, colors.radius - 5) }]}><Ionicons name={icon} size={17} color={colors.accent} /><Text numberOfLines={1} style={[styles.gestureLabel, { color: colors.text }]}>{label}</Text></View>;
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
  const startX = useSharedValue(piece.currentPosition.x * cell);
  const startY = useSharedValue(piece.currentPosition.y * cell);
  const path = useMemo(() => piecePath(piece.shape, cell, margin), [cell, margin, piece.shape]);
  const clipId = `clip-${piece.id}`;

  useEffect(() => {
    x.set(withSpring(piece.currentPosition.x * cell, { damping: 18, stiffness: 210 }));
    y.set(withSpring(piece.currentPosition.y * cell, { damping: 18, stiffness: 210 }));
    rotation.set(withTiming(piece.currentPosition.rotation, { duration: 180 }));
  }, [cell, piece.currentPosition.rotation, piece.currentPosition.x, piece.currentPosition.y, rotation, x, y]);

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
      startX.set(x.get());
      startY.set(y.get());
    })
    .onUpdate((event) => {
      x.set(startX.get() + event.translationX / scale.get());
      y.set(startY.get() + event.translationY / scale.get());
    })
    .onEnd(() => {
      const targetX = piece.correctPosition.x * cell;
      const targetY = piece.correctPosition.y * cell;
      const normalized = ((rotation.get() % 360) + 360) % 360;
      const snaps = Math.hypot(x.get() - targetX, y.get() - targetY) <= cell * 0.58 && normalized === 0;
      if (snaps) {
        x.set(withSpring(targetX));
        y.set(withSpring(targetY));
      }
      runOnJS(notify)(snaps ? targetX : x.get(), snaps ? targetY : y.get(), rotation.get());
    });

  const rotate = Gesture.Tap()
    .enabled(!piece.isPlaced)
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      const nextRotation = (rotation.get() + 90) % 360;
      rotation.set(withTiming(nextRotation, { duration: 180 }));
      runOnJS(notify)(x.get(), y.get(), nextRotation);
    });

  const gesture = Gesture.Race(rotate, pan);
  const animatedStyle = useAnimatedStyle(() => ({
    left: x.get() - margin,
    top: y.get() - margin,
    transform: [{ rotate: `${rotation.get()}deg` }],
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

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  gestureRow: { alignSelf: "stretch", flexDirection: "row", gap: 8, marginBottom: 10 },
  gestureTip: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 9 },
  gestureLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  workspaceBar: { alignSelf: "stretch", minHeight: 72, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 11, marginBottom: 14 },
  workspaceIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  workspaceCopy: { flex: 1, minWidth: 0 },
  workspaceKicker: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1 },
  workspaceCount: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 15, marginTop: 2 },
  shuffleButton: { minHeight: 42, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11 },
  shuffleLabel: { fontFamily: "Inter_700Bold", fontSize: 11 },
  pressed: { opacity: .62, transform: [{ scale: .96 }] },
  traySurface: { position: "absolute", left: 0, width: "100%", borderWidth: 1, overflow: "hidden" },
  trayHeading: { height: 38, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12 },
  trayPulse: { width: 7, height: 7, borderRadius: 4 },
  trayTitle: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1.1 },
  trayWatermark: { position: "absolute", right: -16, top: 38 },
});
