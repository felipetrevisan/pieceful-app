import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import { useEffect, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { PuzzleHintCommand, PuzzleZoomCommand } from "@/components/native-puzzle-board";

function cameraBounds({
  zoom,
  boardWidth,
  boardHeight,
  viewportWidth,
  viewportTop,
  viewportBottom,
  visibleGrip,
}: {
  zoom: number;
  boardWidth: number;
  boardHeight: number;
  viewportWidth: number;
  viewportTop: number;
  viewportBottom: number;
  visibleGrip: number;
}) {
  "worklet";
  const safeZoom = Math.max(0.8, zoom);
  // The board behaves like a free sheet above a fixed workspace. Every edge can
  // be brought across the entire useful viewport; only a small grip remains on
  // screen so the sheet cannot be lost completely.
  const horizontalLimit =
    (boardWidth * safeZoom + viewportWidth - visibleGrip * 2) / (2 * safeZoom);
  const minimumY = (viewportTop + visibleGrip - boardHeight * safeZoom) / safeZoom;
  const maximumY = (viewportBottom - visibleGrip) / safeZoom;
  return { horizontalLimit, minimumY, maximumY };
}

export function useBoardCamera({
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
}: {
  pieces: PuzzlePiece[];
  boardWidth: number;
  boardHeight: number;
  boardOffsetX: number;
  canvasWidth: number;
  cell: number;
  cameraViewportTop: number;
  cameraViewportBottom: number;
  cameraVisibleGrip: number;
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
  zoomCommand?: PuzzleZoomCommand | null;
  hintCommand?: PuzzleHintCommand | null;
  onCameraChange: (panX: number, panY: number, zoom: number) => void;
}) {
  const scale = useSharedValue(initialZoom);
  const savedScale = useSharedValue(initialZoom);
  const panX = useSharedValue(initialPanX);
  const panY = useSharedValue(initialPanY);
  const savedPanX = useSharedValue(initialPanX);
  const savedPanY = useSharedValue(initialPanY);
  const pieceDragActive = useSharedValue(false);
  const lastZoomCommandId = useRef(0);
  const lastHintCommandId = useRef(0);

  useEffect(() => {
    if (!hintCommand || lastHintCommandId.current === hintCommand.id) return;
    const target = pieces.find((piece) => piece.id === hintCommand.pieceId);
    if (!target) return;
    lastHintCommandId.current = hintCommand.id;

    const startCenterX = boardOffsetX + (target.currentPosition.x + 0.5) * cell;
    const startCenterY = (target.currentPosition.y + 0.5) * cell;
    const targetCenterX = boardOffsetX + (target.correctPosition.x + 0.5) * cell;
    const targetCenterY = (target.correctPosition.y + 0.5) * cell;
    const viewportCenterY = (cameraViewportTop + cameraViewportBottom) / 2;
    const overviewZoom = Math.max(
      1,
      Math.min(
        1.32,
        1.45 -
          (Math.hypot(startCenterX - targetCenterX, startCenterY - targetCenterY) /
            Math.max(boardWidth, boardHeight)) *
            0.35,
      ),
    );
    const focusZoom = Math.min(2.05, Math.max(1.55, 72 / Math.max(32, cell)));
    const midpointX = (startCenterX + targetCenterX) / 2;
    const midpointY = (startCenterY + targetCenterY) / 2;
    const overviewPanX = canvasWidth / 2 - midpointX;
    const overviewPanY = viewportCenterY / overviewZoom - midpointY;
    const focusPanX = canvasWidth / 2 - targetCenterX;
    const focusPanY = viewportCenterY / focusZoom - targetCenterY;

    scale.set(
      withSequence(
        withTiming(overviewZoom, { duration: 300 }),
        withTiming(focusZoom, { duration: 620 }),
      ),
    );
    panX.set(
      withSequence(
        withTiming(overviewPanX, { duration: 300 }),
        withTiming(focusPanX, { duration: 620 }),
      ),
    );
    panY.set(
      withSequence(
        withTiming(overviewPanY, { duration: 300 }),
        withTiming(focusPanY, { duration: 620 }),
      ),
    );
    savedScale.set(focusZoom);
    savedPanX.set(focusPanX);
    savedPanY.set(focusPanY);
    onCameraChange(focusPanX, focusPanY, focusZoom);
  }, [
    boardHeight,
    boardOffsetX,
    boardWidth,
    cameraViewportBottom,
    cameraViewportTop,
    canvasWidth,
    cell,
    hintCommand,
    onCameraChange,
    panX,
    panY,
    pieces,
    savedPanX,
    savedPanY,
    savedScale,
    scale,
  ]);

  useEffect(() => {
    if (!zoomCommand || lastZoomCommandId.current === zoomCommand.id) return;
    lastZoomCommandId.current = zoomCommand.id;

    const currentScale = scale.get();
    const nextScale =
      zoomCommand.action === "reset"
        ? 1
        : Math.max(0.8, Math.min(2.4, currentScale + (zoomCommand.action === "in" ? 0.25 : -0.25)));
    let nextPanX = panX.get();
    let nextPanY = panY.get();

    if (zoomCommand.action === "reset") {
      nextPanX = 0;
      nextPanY = 0;
    } else {
      const bounds = cameraBounds({
        zoom: nextScale,
        boardWidth,
        boardHeight,
        viewportWidth: canvasWidth,
        viewportTop: cameraViewportTop,
        viewportBottom: cameraViewportBottom,
        visibleGrip: cameraVisibleGrip,
      });
      nextPanX = Math.max(-bounds.horizontalLimit, Math.min(bounds.horizontalLimit, nextPanX));
      nextPanY = Math.max(bounds.minimumY, Math.min(bounds.maximumY, nextPanY));
    }

    scale.set(withTiming(nextScale, { duration: 180 }));
    savedScale.set(nextScale);
    panX.set(withTiming(nextPanX, { duration: 180 }));
    panY.set(withTiming(nextPanY, { duration: 180 }));
    savedPanX.set(nextPanX);
    savedPanY.set(nextPanY);
    onCameraChange(nextPanX, nextPanY, nextScale);
  }, [
    boardHeight,
    boardWidth,
    cameraVisibleGrip,
    cameraViewportBottom,
    cameraViewportTop,
    canvasWidth,
    onCameraChange,
    panX,
    panY,
    savedPanX,
    savedPanY,
    savedScale,
    scale,
    zoomCommand,
  ]);

  const pinch = Gesture.Pinch()
    .enabled(!hintCommand)
    .onUpdate((event) => {
      scale.set(Math.max(0.8, Math.min(2.4, savedScale.get() * event.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      const bounds = cameraBounds({
        zoom: scale.get(),
        boardWidth,
        boardHeight,
        viewportWidth: canvasWidth,
        viewportTop: cameraViewportTop,
        viewportBottom: cameraViewportBottom,
        visibleGrip: cameraVisibleGrip,
      });
      panX.set(Math.max(-bounds.horizontalLimit, Math.min(bounds.horizontalLimit, panX.get())));
      panY.set(Math.max(bounds.minimumY, Math.min(bounds.maximumY, panY.get())));
      savedPanX.set(panX.get());
      savedPanY.set(panY.get());
      runOnJS(onCameraChange)(panX.get(), panY.get(), scale.get());
    });

  const boardPan = Gesture.Pan()
    .enabled(!hintCommand)
    .maxPointers(1)
    .activeOffsetX([-4, 4])
    .activeOffsetY([-4, 4])
    .onStart(() => {
      savedPanX.set(panX.get());
      savedPanY.set(panY.get());
    })
    .onUpdate((event) => {
      if (pieceDragActive.get()) return;
      const bounds = cameraBounds({
        zoom: scale.get(),
        boardWidth,
        boardHeight,
        viewportWidth: canvasWidth,
        viewportTop: cameraViewportTop,
        viewportBottom: cameraViewportBottom,
        visibleGrip: cameraVisibleGrip,
      });
      panX.set(
        Math.max(
          -bounds.horizontalLimit,
          Math.min(bounds.horizontalLimit, savedPanX.get() + event.translationX / scale.get()),
        ),
      );
      panY.set(
        Math.max(
          bounds.minimumY,
          Math.min(bounds.maximumY, savedPanY.get() + event.translationY / scale.get()),
        ),
      );
    })
    .onEnd(() => {
      savedPanX.set(panX.get());
      savedPanY.set(panY.get());
      runOnJS(onCameraChange)(panX.get(), panY.get(), scale.get());
    });

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      // Camera pan is stored in board coordinates. Scaling first keeps the
      // rendered transform aligned with tray-to-board coordinate conversion.
      { scale: scale.get() },
      { translateX: panX.get() },
      { translateY: panY.get() },
    ],
  }));

  return { scale, panX, panY, pieceDragActive, pinch, boardPan, zoomStyle };
}
