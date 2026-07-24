import { Ionicons } from "@expo/vector-icons";
import type { PuzzlePiece, PuzzlePieceShape } from "@puzzled/puzzle-engine";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from "react-native-svg";
import { isLightMobileTheme, mobileThemes } from "@/constants/pieceful-theme";
import { FrostedBackdrop } from "@/components/frosted-surface";
import { useApp } from "@/state/app-provider";

export interface ScreenFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PuzzlePieceDrawerProps {
  imageUri: string;
  rows: number;
  columns: number;
  pieces: PuzzlePiece[];
  boardFrame: ScreenFrame | null;
  boardZoom: number;
  boardPanX: number;
  boardPanY: number;
  onReleasePieces: (ids: string[], x: number, y: number) => void;
  onStorageFrameChange: (frame: ScreenFrame | null) => void;
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
  return Math.imul(hash ^ (hash >>> 16), 2246822507) >>> 0;
}

export function PuzzlePieceDrawer({
  imageUri,
  rows,
  columns,
  pieces,
  boardFrame,
  boardZoom,
  boardPanX,
  boardPanY,
  onReleasePieces,
  onStorageFrameChange,
}: PuzzlePieceDrawerProps) {
  const { height, width } = useWindowDimensions();
  const { preferences, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const storedPieces = useMemo(
    () => pieces.filter((piece) => !piece.isPlaced && piece.trayId !== null).sort((left, right) => drawerOrder(left.id) - drawerOrder(right.id)),
    [pieces],
  );
  const sheetHeight = Math.min(540, height * 0.62);
  const collapsedHeight = 68;
  const closedY = sheetHeight - collapsedHeight;
  const translateY = useSharedValue(closedY);
  const dragStart = useSharedValue(closedY);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const storageRef = useRef<View>(null);
  const pieceSize = Math.max(38, Math.min(50, (width - 48) / 7));

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  function releaseSelected(ids: string[], x: number, y: number) {
    onReleasePieces(ids, x, y);
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  }

  useEffect(() => {
    translateY.set(withSpring(open ? 0 : closedY, { damping: 20, stiffness: 220 }));
    const timeout = setTimeout(() => {
      storageRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        onStorageFrameChange({ x, y, width: measuredWidth, height: measuredHeight });
      });
    }, 320);
    return () => clearTimeout(timeout);
  }, [closedY, onStorageFrameChange, open, translateY]);

  function settle(nextOpen: boolean) {
    setOpen(nextOpen);
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  const sheetPan = Gesture.Pan()
    .onStart(() => dragStart.set(translateY.get()))
    .onUpdate((event) => {
      translateY.set(Math.max(0, Math.min(closedY, dragStart.get() + event.translationY)));
    })
    .onEnd((event) => {
      const nextOpen = event.velocityY < -500 || (event.velocityY <= 500 && translateY.get() < closedY * 0.48);
      translateY.set(withSpring(nextOpen ? 0 : closedY, { damping: 20, stiffness: 230 }));
      runOnJS(settle)(nextOpen);
    });
  const sheetTap = Gesture.Tap().maxDuration(260).onEnd((_event, success) => {
    if (!success) return;
    const nextOpen = !open;
    translateY.set(withSpring(nextOpen ? 0 : closedY, { damping: 20, stiffness: 230 }));
    runOnJS(settle)(nextOpen);
  });
  const headerGesture = Gesture.Race(sheetPan, sheetTap);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: sheetHeight,
          backgroundColor: "transparent",
          borderColor: `${colors.accent}70`,
          shadowColor: colors.accent,
        },
        sheetStyle,
      ]}
    >
      {Platform.OS === "android" ? (
        <BlurView
          blurMethod="dimezisBlurViewSdk31Plus"
          blurReductionFactor={2}
          intensity={88}
          pointerEvents="none"
          tint={isLightMobileTheme(theme) ? "light" : "dark"}
          style={StyleSheet.absoluteFill}
        />
      ) : <FrostedBackdrop intensity={88} />}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isLightMobileTheme(theme) ? `${colors.panel}c4` : `${colors.background}b8` },
        ]}
      />
      <LinearGradient colors={[`${colors.accent}25`, `${colors.panel}a8`, `${colors.primary}24`]} style={StyleSheet.absoluteFill} />
      <GestureDetector gesture={headerGesture}>
        <Animated.View style={styles.header}>
          <View ref={storageRef} collapsable={false} pointerEvents="none" style={styles.storageDropZone} />
          <View style={[styles.grabber, { backgroundColor: `${colors.muted}80` }]} />
          <View style={[styles.headerIcon, { backgroundColor: `${colors.accent}1b` }]}><Ionicons name="file-tray-full-outline" size={22} color={colors.accent} /></View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>{t("Bandeja de peças", "Piece tray")}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>
              {selectedIds.length
                ? `${selectedIds.length} ${t("selecionadas · segure para arrastar", "selected · hold to drag")}`
                : `${storedPieces.length} ${t("guardadas · toque para selecionar", "stored · tap to select")}`}
            </Text>
          </View>
          {selectedIds.length ? (
            <Pressable
              accessibilityLabel={t("Limpar seleção", "Clear selection")}
              hitSlop={8}
              onPress={() => setSelectedIds([])}
              style={[styles.selectionBadge, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.selectionCount, { color: colors.background }]}>{selectedIds.length}</Text>
              <Ionicons name="close" size={14} color={colors.background} />
            </Pressable>
          ) : null}
          <View style={[styles.storage, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}70` }]}>
            <Ionicons name="archive-outline" size={22} color={colors.accent} />
          </View>
          <Ionicons name={open ? "chevron-down" : "chevron-up"} size={22} color={colors.muted} />
        </Animated.View>
      </GestureDetector>

      <View style={[styles.divider, { backgroundColor: `${colors.accent}30` }]} />
      {storedPieces.length ? (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {storedPieces.map((piece) => (
            <DrawerPiece
              key={piece.id}
              piece={piece}
              imageUri={imageUri}
              rows={rows}
              columns={columns}
              size={pieceSize}
              boardFrame={boardFrame}
              boardZoom={boardZoom}
              boardPanX={boardPanX}
              boardPanY={boardPanY}
              selected={selectedIds.includes(piece.id)}
              selectedIds={selectedIds}
              onToggleSelected={toggleSelected}
              onRelease={releaseSelected}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}><Ionicons name="sparkles-outline" size={34} color={colors.accent} /><Text style={[styles.emptyText, { color: colors.muted }]}>{t("Nenhuma peça guardada", "No stored pieces")}</Text></View>
      )}
    </Animated.View>
  );
}

function DrawerPiece({
  piece,
  imageUri,
  rows,
  columns,
  size,
  boardFrame,
  boardZoom,
  boardPanX,
  boardPanY,
  selected,
  selectedIds,
  onToggleSelected,
  onRelease,
}: {
  piece: PuzzlePiece;
  imageUri: string;
  rows: number;
  columns: number;
  size: number;
  boardFrame: ScreenFrame | null;
  boardZoom: number;
  boardPanX: number;
  boardPanY: number;
  selected: boolean;
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onRelease: (ids: string[], x: number, y: number) => void;
}) {
  const margin = size * 0.24;
  const extent = size + margin * 2;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const path = useMemo(() => piecePath(piece.shape, size, margin), [margin, piece.shape, size]);
  const clipId = `drawer-clip-${piece.id}`;

  const pan = Gesture.Pan()
    .activateAfterLongPress(120)
    .onStart(() => dragging.set(1))
    .onUpdate((event) => {
      translateX.set(event.translationX);
      translateY.set(event.translationY);
    })
    .onEnd((event) => {
      if (boardFrame) {
        const visualWidth = boardFrame.width * boardZoom;
        const visualHeight = boardFrame.height * boardZoom;
        const visualX = boardFrame.x - (visualWidth - boardFrame.width) / 2 + boardPanX * boardZoom;
        const visualY = boardFrame.y + boardPanY * boardZoom;
        const insideBoard =
          event.absoluteX >= visualX &&
          event.absoluteX <= visualX + visualWidth &&
          event.absoluteY >= visualY &&
          event.absoluteY <= visualY + visualHeight;
        if (insideBoard) {
          const x = Math.max(-0.15, Math.min(columns - 0.85, ((event.absoluteX - visualX) / visualWidth) * columns - 0.5));
          const y = Math.max(-0.15, Math.min(rows - 0.85, ((event.absoluteY - visualY) / visualHeight) * rows - 0.5));
          runOnJS(onRelease)(selected ? selectedIds : [piece.id], x, y);
          translateX.set(0);
          translateY.set(0);
          dragging.set(0);
          return;
        }
      }
      translateX.set(withSpring(0));
      translateY.set(withSpring(0));
      dragging.set(0);
    });
  const tap = Gesture.Tap()
    .maxDuration(260)
    .onEnd((_event, success) => {
      if (success) runOnJS(onToggleSelected)(piece.id);
    });
  const gesture = Gesture.Exclusive(pan, tap);
  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: dragging.get() ? 100 : 1,
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: dragging.get() ? 1.15 : 1 },
    ],
  }));
  const stackStyle = useAnimatedStyle(() => ({ opacity: dragging.get() }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width: extent, height: extent }, animatedStyle]}>
        {selected && selectedIds.length > 1 ? (
          <>
            <Animated.View pointerEvents="none" style={[styles.stackLayer, styles.stackLayerBack, { borderColor: "rgba(255,255,255,.55)" }, stackStyle]} />
            <Animated.View pointerEvents="none" style={[styles.stackLayer, styles.stackLayerMiddle, { borderColor: "rgba(255,255,255,.7)" }, stackStyle]} />
          </>
        ) : null}
        <Svg width={extent} height={extent}>
          <Defs><ClipPath id={clipId}><Path d={path} /></ClipPath></Defs>
          <SvgImage
            href={{ uri: imageUri }}
            x={margin - piece.column * size}
            y={margin - piece.row * size}
            width={columns * size}
            height={rows * size}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
          <Path d={path} fill="transparent" stroke="rgba(255,255,255,.72)" strokeWidth={1.2} />
        </Svg>
        {selected ? (
          <View pointerEvents="none" style={styles.selectedOutline}>
            <View style={styles.selectedCheck}><Ionicons name="checkmark" size={12} color="#071126" /></View>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", left: 8, right: 8, bottom: 0, zIndex: 80, borderWidth: 1.5, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: "hidden", shadowOpacity: .28, shadowRadius: 24, shadowOffset: { width: 0, height: -10 }, elevation: 18 },
  header: { height: 68, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 7 },
  storageDropZone: { position: "absolute", inset: 0 },
  grabber: { position: "absolute", top: 6, left: "42%", right: "42%", height: 4, borderRadius: 99 },
  headerIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 15 },
  meta: { fontFamily: "Inter_600SemiBold", fontSize: 9, marginTop: 2 },
  storage: { width: 43, height: 43, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  selectionBadge: { minWidth: 42, height: 32, paddingHorizontal: 8, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  selectionCount: { fontFamily: "Inter_700Bold", fontSize: 12 },
  divider: { height: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around", gap: 4, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 32 },
  stackLayer: { position: "absolute", inset: 7, borderRadius: 12, borderWidth: 1.5, backgroundColor: "rgba(18,27,55,.88)" },
  stackLayerBack: { transform: [{ translateX: 8 }, { translateY: -7 }, { rotate: "7deg" }] },
  stackLayerMiddle: { transform: [{ translateX: 4 }, { translateY: -4 }, { rotate: "3deg" }] },
  selectedOutline: { position: "absolute", inset: 2, borderRadius: 14, borderWidth: 2, borderColor: "#67edf3" },
  selectedCheck: { position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#67edf3" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9 },
  emptyText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
