"use client";

import {
  calculateProgress,
  canSnap,
  neighborSnapOffset,
  type PuzzlePiece,
  tracePiecePath,
} from "@puzzled/puzzle-engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { controllerLabel, gamepadButtonCommand, gamepadDirections } from "@/lib/gamepad-controls";

interface Props {
  imageUrl: string;
  rows: number;
  columns: number;
  pieces: PuzzlePiece[];
  onPiecesChange: (pieces: PuzzlePiece[]) => void;
  onProgress: (progress: number) => void;
  onPause: () => void;
  onControllerChange: (name: string | null) => void;
  rotationEnabled: boolean;
  focusRegion?: string;
}

interface View {
  zoom: number;
  panX: number;
  panY: number;
}
interface Drag {
  pointerId: number | null;
  id: string | null;
  memberIds: string[];
  offsetX: number;
  offsetY: number;
  panning: boolean;
  startX: number;
  startY: number;
}

interface Pinch {
  startDistance: number;
  startZoom: number;
  worldX: number;
  worldY: number;
}

interface ScreenPoint {
  x: number;
  y: number;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

function emptyDrag(): Drag {
  return {
    pointerId: null,
    id: null,
    memberIds: [],
    offsetX: 0,
    offsetY: 0,
    panning: false,
    startX: 0,
    startY: 0,
  };
}

function pinchMetrics(points: ScreenPoint[]) {
  const first = points[0];
  const second = points[1];
  if (!first || !second) return null;
  return {
    distance: Math.hypot(second.x - first.x, second.y - first.y),
    midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
  };
}

export function PuzzleBoard({
  imageUrl,
  rows,
  columns,
  pieces,
  onPiecesChange,
  onProgress,
  onPause,
  onControllerChange,
  rotationEnabled,
  focusRegion,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const piecesRef = useRef(pieces);
  const viewRef = useRef<View>({ zoom: 1, panX: 0, panY: 0 });
  const dragRef = useRef<Drag>(emptyDrag());
  const touchPointsRef = useRef(new Map<number, ScreenPoint>());
  const pinchRef = useRef<Pinch | null>(null);
  const appliedFocusRegionRef = useRef<string | null>(null);
  const animationRef = useRef(0);
  const gamepadButtonsRef = useRef<boolean[]>([]);
  const gamepadAxisAtRef = useRef(0);
  const gamepadIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomLabel, setZoomLabel] = useState(100);

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const base = Math.min((width - 96) / columns, (height - 96) / rows);
    const { zoom, panX, panY } = viewRef.current;
    const cell = base * zoom;
    const originX = width / 2 - (columns * cell) / 2 + panX;
    const originY = height / 2 - (rows * cell) / 2 + panY;
    ctx.fillStyle = "rgba(6, 14, 32, .58)";
    ctx.strokeStyle = "rgba(208, 188, 255, .18)";
    ctx.lineWidth = 1;
    ctx.fillRect(originX, originY, columns * cell, rows * cell);
    for (let row = 0; row <= rows; row += 1) {
      ctx.beginPath();
      ctx.moveTo(originX, originY + row * cell);
      ctx.lineTo(originX + columns * cell, originY + row * cell);
      ctx.stroke();
    }
    for (let column = 0; column <= columns; column += 1) {
      ctx.beginPath();
      ctx.moveTo(originX + column * cell, originY);
      ctx.lineTo(originX + column * cell, originY + rows * cell);
      ctx.stroke();
    }
    const visible = piecesRef.current.filter((piece) => piece.trayId === null);
    for (const piece of visible) {
      const x = originX + piece.currentPosition.x * cell;
      const y = originY + piece.currentPosition.y * cell;
      if (x < -cell * 2 || y < -cell * 2 || x > width + cell || y > height + cell) continue;
      ctx.save();
      ctx.translate(x + cell / 2, y + cell / 2);
      ctx.rotate((piece.currentPosition.rotation * Math.PI) / 180);
      ctx.translate(-cell / 2, -cell / 2);
      tracePiecePath(ctx, piece.shape, cell);
      ctx.save();
      ctx.clip();
      ctx.drawImage(image, -piece.column * cell, -piece.row * cell, columns * cell, rows * cell);
      ctx.restore();
      ctx.strokeStyle = piece.id === selectedId ? "#4cd7f6" : "rgba(255,255,255,.65)";
      ctx.lineWidth = piece.id === selectedId ? 3 : 1;
      ctx.shadowColor = piece.isPlaced ? "rgba(76,215,246,.25)" : "rgba(0,0,0,.55)";
      ctx.shadowBlur = piece.id === dragRef.current.id ? 22 : 8;
      ctx.shadowOffsetY = piece.id === dragRef.current.id ? 8 : 3;
      tracePiecePath(ctx, piece.shape, cell);
      ctx.stroke();
      ctx.restore();
    }
  }, [columns, rows, selectedId]);

  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      scheduleDraw();
    };
    image.src = imageUrl;
    return () => {
      imageRef.current = null;
    };
  }, [imageUrl, scheduleDraw]);

  useEffect(() => {
    const observer = new ResizeObserver(scheduleDraw);
    if (canvasRef.current) observer.observe(canvasRef.current);
    scheduleDraw();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, [scheduleDraw]);

  useEffect(() => {
    piecesRef.current = pieces;
    scheduleDraw();
  }, [pieces, scheduleDraw]);

  useEffect(() => {
    if (!focusRegion) {
      appliedFocusRegionRef.current = null;
      return;
    }
    if (appliedFocusRegionRef.current === focusRegion) return;
    appliedFocusRegionRef.current = focusRegion;
    const positions: Record<string, [number, number]> = {
      "superior-esquerda": [0.25, 0.25],
      "superior-central": [0, 0.25],
      "superior-direita": [-0.25, 0.25],
      "centro-esquerdo": [0.25, 0],
      centro: [0, 0],
      "centro-direito": [-0.25, 0],
      "inferior-esquerda": [0.25, -0.25],
      "inferior-central": [0, -0.25],
      "inferior-direita": [-0.25, -0.25],
    };
    const position = positions[focusRegion] ?? [0, 0];
    const canvas = canvasRef.current;
    if (canvas) {
      viewRef.current = {
        zoom: focusRegion === "centro" ? 1 : 1.5,
        panX: canvas.clientWidth * position[0],
        panY: canvas.clientHeight * position[1],
      };
      setZoomLabel(Math.round(viewRef.current.zoom * 100));
      scheduleDraw();
    }
  }, [focusRegion, scheduleDraw]);

  useEffect(() => {
    let frame = 0;
    const dispatchKey = (key: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.focus({ preventScroll: true });
      canvas.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    };
    const poll = (now: number) => {
      const gamepad = navigator.getGamepads?.().find((candidate) => candidate?.connected) ?? null;
      const nextId = gamepad?.id ?? null;
      if (nextId !== gamepadIdRef.current) {
        gamepadIdRef.current = nextId;
        onControllerChange(nextId ? controllerLabel(nextId) : null);
        gamepadButtonsRef.current = [];
      }
      if (gamepad) {
        const pressed = gamepad.buttons.map((button) => button.pressed);
        const justPressed = (index: number) =>
          pressed[index] === true && gamepadButtonsRef.current[index] !== true;
        for (let index = 0; index < pressed.length; index += 1) {
          if (!justPressed(index)) continue;
          const command = gamepadButtonCommand(index);
          if (command === "next") dispatchKey("]");
          else if (command === "previous") dispatchKey("[");
          else if (command === "rotate") dispatchKey("r");
          else if (command === "reset") dispatchKey("0");
          else if (command === "zoom-out") dispatchKey("-");
          else if (command === "zoom-in") dispatchKey("+");
          else if (command === "pause") onPause();
        }
        gamepadButtonsRef.current = pressed;

        if (now - gamepadAxisAtRef.current > 85) {
          const { left, right, up, down } = gamepadDirections(gamepad.axes, pressed);
          if (left) dispatchKey("ArrowLeft");
          else if (right) dispatchKey("ArrowRight");
          if (up) dispatchKey("ArrowUp");
          else if (down) dispatchKey("ArrowDown");
          if (left || right || up || down) gamepadAxisAtRef.current = now;
        }
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(frame);
      if (gamepadIdRef.current) onControllerChange(null);
    };
  }, [onControllerChange, onPause]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function worldPoint(screenX: number, screenY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const base = Math.min((canvas.clientWidth - 96) / columns, (canvas.clientHeight - 96) / rows);
    const view = viewRef.current;
    const cell = base * view.zoom;
    return {
      x: (screenX - (canvas.clientWidth / 2 - (columns * cell) / 2 + view.panX)) / cell,
      y: (screenY - (canvas.clientHeight / 2 - (rows * cell) / 2 + view.panY)) / cell,
    };
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    if (event.pointerType === "touch") {
      touchPointsRef.current.set(event.pointerId, point);
      if (touchPointsRef.current.size >= 2) {
        const metrics = pinchMetrics([...touchPointsRef.current.values()]);
        if (!metrics) return;
        const world = worldPoint(metrics.midpoint.x, metrics.midpoint.y);
        pinchRef.current = {
          startDistance: Math.max(metrics.distance, 1),
          startZoom: viewRef.current.zoom,
          worldX: world.x,
          worldY: world.y,
        };
        piecesRef.current = pieces;
        dragRef.current = emptyDrag();
        scheduleDraw();
        return;
      }
    }
    const world = worldPoint(point.x, point.y);
    const hit = [...piecesRef.current]
      .reverse()
      .find(
        (piece) =>
          piece.trayId === null &&
          !piece.isPlaced &&
          world.x >= piece.currentPosition.x - 0.2 &&
          world.x <= piece.currentPosition.x + 1.2 &&
          world.y >= piece.currentPosition.y - 0.2 &&
          world.y <= piece.currentPosition.y + 1.2,
      );
    if (hit) {
      const memberIds = hit.groupId
        ? piecesRef.current
            .filter((piece) => piece.groupId === hit.groupId && !piece.isPlaced)
            .map((piece) => piece.id)
        : [hit.id];
      dragRef.current = {
        pointerId: event.pointerId,
        id: hit.id,
        memberIds,
        offsetX: world.x - hit.currentPosition.x,
        offsetY: world.y - hit.currentPosition.y,
        panning: false,
        startX: point.x,
        startY: point.y,
      };
      setSelectedId(hit.id);
    } else
      dragRef.current = {
        pointerId: event.pointerId,
        id: null,
        memberIds: [],
        offsetX: viewRef.current.panX,
        offsetY: viewRef.current.panY,
        panning: true,
        startX: point.x,
        startY: point.y,
      };
    scheduleDraw();
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch" && touchPointsRef.current.has(event.pointerId)) {
      touchPointsRef.current.set(event.pointerId, canvasPoint(event));
      if (pinchRef.current && touchPointsRef.current.size >= 2) {
        event.preventDefault();
        const metrics = pinchMetrics([...touchPointsRef.current.values()]);
        const canvas = canvasRef.current;
        if (!metrics || !canvas) return;
        const pinch = pinchRef.current;
        const nextZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, pinch.startZoom * (metrics.distance / pinch.startDistance)),
        );
        const base = Math.min(
          (canvas.clientWidth - 96) / columns,
          (canvas.clientHeight - 96) / rows,
        );
        const cell = base * nextZoom;
        viewRef.current = {
          zoom: nextZoom,
          panX:
            metrics.midpoint.x -
            canvas.clientWidth / 2 +
            (columns * cell) / 2 -
            pinch.worldX * cell,
          panY:
            metrics.midpoint.y - canvas.clientHeight / 2 + (rows * cell) / 2 - pinch.worldY * cell,
        };
        setZoomLabel(Math.round(nextZoom * 100));
        scheduleDraw();
        return;
      }
    }
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    if (!drag.id && !drag.panning) return;
    const point = canvasPoint(event);
    if (drag.panning) {
      viewRef.current.panX = drag.offsetX + point.x - drag.startX;
      viewRef.current.panY = drag.offsetY + point.y - drag.startY;
    } else {
      const world = worldPoint(point.x, point.y);
      const anchor = piecesRef.current.find((piece) => piece.id === drag.id);
      if (!anchor) return;
      const nextX = world.x - drag.offsetX;
      const nextY = world.y - drag.offsetY;
      const deltaX = nextX - anchor.currentPosition.x;
      const deltaY = nextY - anchor.currentPosition.y;
      piecesRef.current = piecesRef.current.map((piece) =>
        drag.memberIds.includes(piece.id)
          ? {
              ...piece,
              currentPosition: {
                ...piece.currentPosition,
                x: piece.currentPosition.x + deltaX,
                y: piece.currentPosition.y + deltaY,
              },
            }
          : piece,
      );
    }
    scheduleDraw();
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") {
      touchPointsRef.current.delete(event.pointerId);
      if (pinchRef.current) {
        if (touchPointsRef.current.size < 2) pinchRef.current = null;
        dragRef.current = emptyDrag();
        return;
      }
    }
    if (dragRef.current.pointerId !== event.pointerId) return;
    const { id, memberIds } = dragRef.current;
    dragRef.current = emptyDrag();
    if (!id) return;
    const moving = piecesRef.current.filter((piece) => memberIds.includes(piece.id));
    const boardMatch = moving.find((piece) =>
      canSnap(piece.currentPosition, piece.correctPosition, 0.38),
    );
    let updated = piecesRef.current;

    if (boardMatch) {
      const deltaX = boardMatch.correctPosition.x - boardMatch.currentPosition.x;
      const deltaY = boardMatch.correctPosition.y - boardMatch.currentPosition.y;
      updated = updated.map((piece) =>
        memberIds.includes(piece.id)
          ? {
              ...piece,
              currentPosition: {
                ...piece.currentPosition,
                x: piece.currentPosition.x + deltaX,
                y: piece.currentPosition.y + deltaY,
              },
              isPlaced: true,
              groupId: "tabuleiro",
            }
          : piece,
      );
    } else {
      let connection: { offsetX: number; offsetY: number; stationary: PuzzlePiece } | undefined;
      for (const movingPiece of moving) {
        for (const stationary of updated) {
          if (memberIds.includes(stationary.id) || stationary.trayId !== null) continue;
          const offset = neighborSnapOffset(movingPiece, stationary, 0.28);
          if (offset) {
            connection = { offsetX: offset.x, offsetY: offset.y, stationary };
            break;
          }
        }
        if (connection) break;
      }

      if (connection) {
        const connectedIds = connection.stationary.groupId
          ? updated
              .filter((piece) => piece.groupId === connection?.stationary.groupId)
              .map((piece) => piece.id)
          : [connection.stationary.id];
        const groupId = connection.stationary.isPlaced
          ? "tabuleiro"
          : (connection.stationary.groupId ?? `grupo-${connection.stationary.id}`);
        const mergedIds = new Set([...memberIds, ...connectedIds]);
        updated = updated.map((piece) => {
          if (!mergedIds.has(piece.id)) return piece;
          const wasMoving = memberIds.includes(piece.id);
          return {
            ...piece,
            currentPosition: wasMoving
              ? {
                  ...piece.currentPosition,
                  x: piece.currentPosition.x + connection.offsetX,
                  y: piece.currentPosition.y + connection.offsetY,
                }
              : piece.currentPosition,
            groupId,
            isPlaced: groupId === "tabuleiro",
          };
        });
      }
    }
    piecesRef.current = updated;
    onPiecesChange(updated);
    onProgress(calculateProgress(updated.filter((piece) => piece.isPlaced).length, updated.length));
    scheduleDraw();
  }

  function wheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const next = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, viewRef.current.zoom * (event.deltaY > 0 ? 0.9 : 1.1)),
    );
    viewRef.current.zoom = next;
    setZoomLabel(Math.round(next * 100));
    scheduleDraw();
  }

  function rotateSelectedPiece() {
    if (!rotationEnabled) return;
    const visible = piecesRef.current.filter((piece) => piece.trayId === null && !piece.isPlaced);
    const selected = visible.find((piece) => piece.id === selectedId);
    if (!selected) return;
    const selectedIds = new Set(
      selected.groupId
        ? visible.filter((piece) => piece.groupId === selected.groupId).map((piece) => piece.id)
        : [selected.id],
    );
    const updated = piecesRef.current.map((piece) => {
      if (!selectedIds.has(piece.id)) return piece;
      const relativeX = piece.currentPosition.x - selected.currentPosition.x;
      const relativeY = piece.currentPosition.y - selected.currentPosition.y;
      return {
        ...piece,
        currentPosition: {
          ...piece.currentPosition,
          x: selected.currentPosition.x - relativeY,
          y: selected.currentPosition.y + relativeX,
          rotation: (piece.currentPosition.rotation + 90) % 360,
        },
      };
    });
    piecesRef.current = updated;
    onPiecesChange(updated);
    scheduleDraw();
  }

  function keyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const visible = piecesRef.current.filter((piece) => piece.trayId === null && !piece.isPlaced);
    const selected = visible.find((piece) => piece.id === selectedId) ?? visible[0];
    if (!selected) return;
    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      const currentIndex = visible.findIndex((piece) => piece.id === selectedId);
      const direction = event.key === "]" ? 1 : -1;
      const baseIndex = currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : 0;
      const nextIndex = (baseIndex + direction + visible.length) % visible.length;
      setSelectedId(visible[nextIndex]?.id ?? selected.id);
      scheduleDraw();
      return;
    }
    if (event.key === "+" || event.key === "-") {
      event.preventDefault();
      const multiplier = event.key === "+" ? 1.12 : 0.88;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewRef.current.zoom * multiplier));
      viewRef.current.zoom = next;
      setZoomLabel(Math.round(next * 100));
      scheduleDraw();
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      viewRef.current = { zoom: 1, panX: 0, panY: 0 };
      setZoomLabel(100);
      scheduleDraw();
      return;
    }
    if (event.key.toLowerCase() === "r") {
      if (!rotationEnabled) return;
      event.preventDefault();
      rotateSelectedPiece();
      return;
    }
    const actionable = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!actionable.includes(event.key)) return;
    event.preventDefault();
    const delta = event.shiftKey ? 0.02 : 0.08;
    const selectedIds = new Set(
      selected.groupId
        ? visible.filter((piece) => piece.groupId === selected.groupId).map((piece) => piece.id)
        : [selected.id],
    );
    const updated = piecesRef.current.map((piece) => {
      if (!selectedIds.has(piece.id)) return piece;
      return {
        ...piece,
        currentPosition: {
          ...piece.currentPosition,
          x:
            piece.currentPosition.x +
            (event.key === "ArrowRight" ? delta : event.key === "ArrowLeft" ? -delta : 0),
          y:
            piece.currentPosition.y +
            (event.key === "ArrowDown" ? delta : event.key === "ArrowUp" ? -delta : 0),
        },
      };
    });
    piecesRef.current = updated;
    setSelectedId(selected.id);
    onPiecesChange(updated);
    scheduleDraw();
  }

  return (
    <div className="board-wrap">
      <canvas
        ref={canvasRef}
        className="puzzle-canvas"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onWheel={wheel}
        onKeyDown={keyDown}
        tabIndex={0}
        aria-label="Tabuleiro do quebra-cabeça. Arraste peças com um dedo, use dois dedos para aplicar zoom e selecione uma peça para girá-la."
      />
      {rotationEnabled &&
        selectedId &&
        pieces.some(
          (piece) => piece.id === selectedId && piece.trayId === null && !piece.isPlaced,
        ) && (
          <button
            type="button"
            className="mobile-rotate-button"
            onClick={rotateSelectedPiece}
            aria-label="Girar peça selecionada 90 graus"
          >
            <strong aria-hidden="true">↻</strong>
            Girar peça
          </button>
        )}
      <span className="zoom-badge" aria-live="polite">
        {zoomLabel}%
      </span>
    </div>
  );
}
