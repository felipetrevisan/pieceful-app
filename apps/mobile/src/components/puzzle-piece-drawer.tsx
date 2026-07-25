import { Ionicons } from "@expo/vector-icons";
import type { PuzzlePiece, PuzzlePieceShape } from "@puzzled/puzzle-engine";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector, type GestureType } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { ClipPath, Defs, Path, Image as SvgImage } from "react-native-svg";
import { FrostedBackdrop } from "@/components/frosted-surface";
import { isLightMobileTheme, mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export interface ScreenFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrayDragPreview {
  piece: PuzzlePiece;
  count: number;
  size: number;
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
  dragScreenX: SharedValue<number>;
  dragScreenY: SharedValue<number>;
  onDragPreviewChange: (preview: TrayDragPreview | null) => void;
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

type TrayFilter = "all" | "edges" | "corners";

function flatEdgeCount(piece: PuzzlePiece) {
  return (["top", "right", "bottom", "left"] as const).filter(
    (edge) => piece.shape[edge] === "flat",
  ).length;
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
  dragScreenX,
  dragScreenY,
  onDragPreviewChange,
  onReleasePieces,
  onStorageFrameChange,
}: PuzzlePieceDrawerProps) {
  const { width } = useWindowDimensions();
  const { preferences, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const storedPieces = useMemo(
    () =>
      pieces
        .filter((piece) => !piece.isPlaced && piece.trayId !== null)
        .sort((left, right) => drawerOrder(left.id) - drawerOrder(right.id)),
    [pieces],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<TrayFilter>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const storageRef = useRef<View>(null);
  const listRef = useRef<FlatList<PuzzlePiece[]>>(null);
  const pageWidth = width - 16;
  const pieceSize = Math.max(36, Math.min(40, (width - 52) / 7));
  const pieceExtent = pieceSize * 1.48;
  const trayColumns = Math.max(4, Math.floor((pageWidth - 20) / pieceExtent));
  const pageSize = trayColumns * 2;
  const filteredPieces = useMemo(() => {
    if (filter === "all") return storedPieces;
    return storedPieces.filter((piece) =>
      filter === "corners" ? flatEdgeCount(piece) >= 2 : flatEdgeCount(piece) >= 1,
    );
  }, [filter, storedPieces]);
  const pages = useMemo(() => {
    const next: PuzzlePiece[][] = [];
    for (let index = 0; index < filteredPieces.length; index += pageSize) {
      next.push(filteredPieces.slice(index, index + pageSize));
    }
    return next.length ? next : [[]];
  }, [filteredPieces, pageSize]);
  const trayScrollGesture = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      if (Math.abs(event.translationX) < 34) return;
      runOnJS(moveTrayPage)(event.translationX < 0 ? 1 : -1);
    });
  function moveTrayPage(direction: number) {
    setPageIndex((current) =>
      Math.max(0, Math.min(pages.length - 1, current + direction)),
    );
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  function releaseSelected(ids: string[], x: number, y: number) {
    onReleasePieces(ids, x, y);
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  }

  useEffect(() => {
    const nextIndex = Math.min(pageIndex, pages.length - 1);
    const frame = requestAnimationFrame(() => {
      if (nextIndex !== pageIndex) setPageIndex(nextIndex);
      listRef.current?.scrollToOffset({ offset: nextIndex * pageWidth, animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pageIndex, pageWidth, pages.length]);

  useEffect(() => {
    const measure = () => {
      storageRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        onStorageFrameChange({ x, y, width: measuredWidth, height: measuredHeight });
      });
    };
    const timeout = setTimeout(measure, 120);
    return () => clearTimeout(timeout);
  }, [onStorageFrameChange, pageWidth]);

  const visibleDots = useMemo(() => {
    if (pages.length <= 7) return pages.map((_, index) => index);
    const start = Math.max(0, Math.min(pages.length - 7, pageIndex - 3));
    return Array.from({ length: 7 }, (_, index) => start + index);
  }, [pageIndex, pages]);

  return (
    <View
      ref={storageRef}
      collapsable={false}
      onLayout={() => {
        storageRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
          onStorageFrameChange({ x, y, width: measuredWidth, height: measuredHeight });
        });
      }}
      style={[
        styles.sheet,
        {
          height: 244,
          bottom: 8,
          backgroundColor: "transparent",
          borderColor: `${colors.accent}70`,
          shadowColor: colors.accent,
        },
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
      ) : (
        <FrostedBackdrop intensity={88} />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isLightMobileTheme(theme)
              ? `${colors.panel}c4`
              : `${colors.background}b8`,
          },
        ]}
      />
      <LinearGradient
        colors={[`${colors.accent}25`, `${colors.panel}a8`, `${colors.primary}24`]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: `${colors.accent}1b` }]}>
            <Ionicons name="file-tray-full-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("Bandeja de peças", "Piece tray")}
            </Text>
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
              <Text style={[styles.selectionCount, { color: colors.background }]}>
                {selectedIds.length}
              </Text>
              <Ionicons name="close" size={14} color={colors.background} />
            </Pressable>
          ) : null}
          <View
            style={[
              styles.storage,
              { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}70` },
            ]}
          >
            <Ionicons name="archive-outline" size={22} color={colors.accent} />
          </View>
      </View>

      <View style={[styles.divider, { backgroundColor: `${colors.accent}30` }]} />
      {storedPieces.length ? (
        <>
          <View style={styles.filters}>
            {(
              [
                ["all", t("Todas", "All")],
                ["edges", t("Bordas", "Edges")],
                ["corners", t("Cantos", "Corners")],
              ] as const
            ).map(([id, label]) => {
              const active = filter === id;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={id}
                  onPress={() => {
                    setFilter(id);
                    setPageIndex(0);
                  }}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: active ? colors.accent : colors.panelAlt,
                      borderColor: active ? colors.accent : `${colors.muted}38`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterLabel,
                      { color: active ? colors.background : colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {filteredPieces.length ? (
            <>
            <GestureDetector gesture={trayScrollGesture}>
            <View
              style={styles.pieceList}
            >
            <FlatList
              ref={listRef}
              key={`tray-pages-${trayColumns}`}
              style={styles.pageScroller}
              data={pages}
              horizontal
              scrollEnabled={false}
              pagingEnabled
              decelerationRate="fast"
              snapToInterval={pageWidth}
              disableIntervalMomentum
              keyExtractor={(_page, index) => `tray-page-${index}`}
              showsHorizontalScrollIndicator={false}
              initialNumToRender={2}
              maxToRenderPerBatch={2}
              windowSize={3}
              onMomentumScrollEnd={(event) => {
                setPageIndex(
                  Math.max(
                    0,
                    Math.min(
                      pages.length - 1,
                      Math.round(event.nativeEvent.contentOffset.x / pageWidth),
                    ),
                  ),
                );
              }}
              getItemLayout={(_data, index) => ({
                length: pageWidth,
                offset: pageWidth * index,
                index,
              })}
              renderItem={({ item: page }) => (
                <View style={[styles.page, { width: pageWidth }]}>
                  {page.map((piece) => (
                    <View
                      key={piece.id}
                      style={[
                        styles.pieceCell,
                        { width: (pageWidth - 8) / trayColumns },
                      ]}
                    >
                      <DrawerPiece
                        piece={piece}
                        imageUri={imageUri}
                        rows={rows}
                        columns={columns}
                        size={pieceSize}
                        boardFrame={boardFrame}
                        boardZoom={boardZoom}
                        boardPanX={boardPanX}
                        boardPanY={boardPanY}
                        dragScreenX={dragScreenX}
                        dragScreenY={dragScreenY}
                        selected={selectedIds.includes(piece.id)}
                        selectedIds={selectedIds}
                        onDragPreviewChange={onDragPreviewChange}
                        onToggleSelected={toggleSelected}
                        onRelease={releaseSelected}
                        scrollGesture={trayScrollGesture}
                      />
                    </View>
                  ))}
                </View>
              )}
            />
            </View>
            </GestureDetector>
            <View style={styles.pagination}>
              {visibleDots.map((index) => (
                <View
                  key={`tray-dot-${index}`}
                  style={[
                    styles.dot,
                    {
                      width: index === pageIndex ? 18 : 6,
                      backgroundColor:
                        index === pageIndex ? colors.accent : `${colors.muted}65`,
                    },
                  ]}
                />
              ))}
              {pages.length > 7 ? (
                <Text style={[styles.pageCount, { color: colors.muted }]}>
                  {pageIndex + 1}/{pages.length}
                </Text>
              ) : null}
            </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="filter-outline" size={31} color={colors.accent} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {t("Nenhuma peça neste filtro", "No pieces in this filter")}
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={34} color={colors.accent} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {t("Nenhuma peça guardada", "No stored pieces")}
          </Text>
        </View>
      )}
    </View>
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
  dragScreenX,
  dragScreenY,
  selected,
  selectedIds,
  onDragPreviewChange,
  onToggleSelected,
  onRelease,
  scrollGesture,
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
  dragScreenX: SharedValue<number>;
  dragScreenY: SharedValue<number>;
  selected: boolean;
  selectedIds: string[];
  onDragPreviewChange: (preview: TrayDragPreview | null) => void;
  onToggleSelected: (id: string) => void;
  onRelease: (ids: string[], x: number, y: number) => void;
  scrollGesture: GestureType;
}) {
  const margin = size * 0.24;
  const extent = size + margin * 2;
  const dragging = useSharedValue(0);
  const dragOriginX = useSharedValue(0);
  const dragOriginY = useSharedValue(0);
  const path = useMemo(() => piecePath(piece.shape, size, margin), [margin, piece.shape, size]);
  const clipId = `drawer-clip-${piece.id}`;

  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(scrollGesture)
    .activateAfterLongPress(320)
    .minDistance(8)
    .onStart((event) => {
      dragging.set(1);
      dragOriginX.set(event.absoluteX);
      dragOriginY.set(event.absoluteY);
      dragScreenX.set(event.absoluteX);
      dragScreenY.set(event.absoluteY);
      runOnJS(onDragPreviewChange)({
        piece,
        count: selected ? Math.max(1, selectedIds.length) : 1,
        size,
      });
    })
    .onUpdate((event) => {
      dragScreenX.set(event.absoluteX);
      dragScreenY.set(event.absoluteY);
    })
    .onEnd((event) => {
      const dragDistance = Math.hypot(
        event.absoluteX - dragOriginX.get(),
        event.absoluteY - dragOriginY.get(),
      );
      if (boardFrame && dragDistance >= 24) {
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
          const x = Math.max(
            -0.15,
            Math.min(columns - 0.85, ((event.absoluteX - visualX) / visualWidth) * columns - 0.5),
          );
          const y = Math.max(
            -0.15,
            Math.min(rows - 0.85, ((event.absoluteY - visualY) / visualHeight) * rows - 0.5),
          );
          runOnJS(onRelease)(selected ? selectedIds : [piece.id], x, y);
          dragging.set(0);
          runOnJS(onDragPreviewChange)(null);
          return;
        }
      }
      dragging.set(0);
      runOnJS(onDragPreviewChange)(null);
    });
  const tap = Gesture.Tap()
    .simultaneousWithExternalGesture(scrollGesture)
    .maxDuration(260)
    .onEnd((_event, success) => {
      if (success) runOnJS(onToggleSelected)(piece.id);
    });
  const gesture = Gesture.Exclusive(pan, tap);
  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: dragging.get() ? 100 : 1,
    opacity: dragging.get() ? 0.28 : 1,
    transform: [{ scale: dragging.get() ? 0.9 : 1 }],
  }));
  const stackStyle = useAnimatedStyle(() => ({ opacity: dragging.get() }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width: extent, height: extent }, animatedStyle]}>
        {selected && selectedIds.length > 1 ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.stackLayer,
                styles.stackLayerBack,
                { borderColor: "rgba(255,255,255,.55)" },
                stackStyle,
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.stackLayer,
                styles.stackLayerMiddle,
                { borderColor: "rgba(255,255,255,.7)" },
                stackStyle,
              ]}
            />
          </>
        ) : null}
        <Svg width={extent} height={extent}>
          <Defs>
            <ClipPath id={clipId}>
              <Path d={path} />
            </ClipPath>
          </Defs>
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
            <View style={styles.selectedCheck}>
              <Ionicons name="checkmark" size={12} color="#071126" />
            </View>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

export function PuzzlePieceDragOverlay({
  preview,
  imageUri,
  rows,
  columns,
  screenX,
  screenY,
  screenOffsetY,
  accent,
}: {
  preview: TrayDragPreview | null;
  imageUri: string;
  rows: number;
  columns: number;
  screenX: SharedValue<number>;
  screenY: SharedValue<number>;
  screenOffsetY: number;
  accent: string;
}) {
  const size = preview?.size ?? 48;
  const margin = size * 0.24;
  const extent = size + margin * 2;
  const path = useMemo(
    () => (preview ? piecePath(preview.piece.shape, size, margin) : ""),
    [margin, preview, size],
  );
  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: screenX.get() - extent / 2 },
      { translateY: screenY.get() - screenOffsetY - extent / 2 },
      { scale: 1.16 },
    ],
  }));

  if (!preview) return null;
  const clipId = `tray-drag-${preview.piece.id}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dragOverlay,
        { width: extent, height: extent, shadowColor: accent },
        overlayStyle,
      ]}
    >
      {preview.count > 1 ? (
        <>
          <View style={[styles.dragStack, styles.dragStackBack, { borderColor: `${accent}b8` }]} />
          <View style={[styles.dragStack, styles.dragStackMiddle, { borderColor: accent }]} />
          <View style={[styles.dragCount, { backgroundColor: accent }]}>
            <Text style={styles.dragCountText}>{preview.count}</Text>
          </View>
        </>
      ) : null}
      <Svg width={extent} height={extent}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={path} />
          </ClipPath>
        </Defs>
        <SvgImage
          href={{ uri: imageUri }}
          x={margin - preview.piece.column * size}
          y={margin - preview.piece.row * size}
          width={columns * size}
          height={rows * size}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
        <Path d={path} fill="transparent" stroke="rgba(255,255,255,.9)" strokeWidth={1.5} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 0,
    zIndex: 80,
    borderWidth: 1.5,
    borderRadius: 26,
    overflow: "hidden",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    elevation: 18,
  },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 15 },
  meta: { fontFamily: "Inter_600SemiBold", fontSize: 9, marginTop: 2 },
  storage: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionBadge: {
    minWidth: 42,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  selectionCount: { fontFamily: "Inter_700Bold", fontSize: 12 },
  divider: { height: 1 },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterButton: {
    flex: 1,
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  filterLabel: { fontFamily: "Inter_700Bold", fontSize: 12 },
  pieceList: { height: 124, flexGrow: 0 },
  pageScroller: { flex: 1 },
  page: {
    height: 124,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  pieceCell: { alignItems: "center", justifyContent: "center" },
  pagination: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingBottom: 4,
  },
  dot: { height: 6, borderRadius: 99 },
  pageCount: { marginLeft: 4, fontFamily: "Inter_700Bold", fontSize: 9 },
  stackLayer: {
    position: "absolute",
    inset: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "rgba(18,27,55,.88)",
  },
  stackLayerBack: { transform: [{ translateX: 8 }, { translateY: -7 }, { rotate: "7deg" }] },
  stackLayerMiddle: { transform: [{ translateX: 4 }, { translateY: -4 }, { rotate: "3deg" }] },
  selectedOutline: {
    position: "absolute",
    inset: 2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#67edf3",
  },
  selectedCheck: {
    position: "absolute",
    top: -7,
    right: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67edf3",
  },
  dragOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 300,
    elevation: 30,
    shadowOpacity: 0.55,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 7 },
  },
  dragStack: {
    position: "absolute",
    inset: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "rgba(12,20,44,.92)",
  },
  dragStackBack: { transform: [{ translateX: 10 }, { translateY: -8 }, { rotate: "8deg" }] },
  dragStackMiddle: { transform: [{ translateX: 5 }, { translateY: -4 }, { rotate: "4deg" }] },
  dragCount: {
    position: "absolute",
    right: -10,
    top: -10,
    zIndex: 4,
    minWidth: 25,
    height: 25,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dragCountText: { color: "#071126", fontFamily: "Inter_800ExtraBold", fontSize: 11 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9 },
  emptyText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
