"use client";

import {
  calculateProgress,
  canSnap,
  type PuzzlePiece,
  tracePiecePath,
} from "@puzzled/puzzle-engine";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  imageUrl: string;
  rows: number;
  columns: number;
  pieces: PuzzlePiece[];
  onPiecesChange: (pieces: PuzzlePiece[]) => void;
  onProgress: (progress: number) => void;
  focusRegion?: string;
}

interface View {
  zoom: number;
  panX: number;
  panY: number;
}
interface Drag {
  id: string | null;
  offsetX: number;
  offsetY: number;
  panning: boolean;
  startX: number;
  startY: number;
}

export function PuzzleBoard({
  imageUrl,
  rows,
  columns,
  pieces,
  onPiecesChange,
  onProgress,
  focusRegion,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const piecesRef = useRef(pieces);
  const viewRef = useRef<View>({ zoom: 1, panX: 0, panY: 0 });
  const dragRef = useRef<Drag>({
    id: null,
    offsetX: 0,
    offsetY: 0,
    panning: false,
    startX: 0,
    startY: 0,
  });
  const animationRef = useRef(0);
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
    if (!focusRegion) return;
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
      dragRef.current = {
        id: hit.id,
        offsetX: world.x - hit.currentPosition.x,
        offsetY: world.y - hit.currentPosition.y,
        panning: false,
        startX: point.x,
        startY: point.y,
      };
      setSelectedId(hit.id);
    } else
      dragRef.current = {
        id: null,
        offsetX: viewRef.current.panX,
        offsetY: viewRef.current.panY,
        panning: true,
        startX: point.x,
        startY: point.y,
      };
    scheduleDraw();
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag.id && !drag.panning) return;
    const point = canvasPoint(event);
    if (drag.panning) {
      viewRef.current.panX = drag.offsetX + point.x - drag.startX;
      viewRef.current.panY = drag.offsetY + point.y - drag.startY;
    } else {
      const world = worldPoint(point.x, point.y);
      piecesRef.current = piecesRef.current.map((piece) =>
        piece.id === drag.id
          ? {
              ...piece,
              currentPosition: {
                ...piece.currentPosition,
                x: world.x - drag.offsetX,
                y: world.y - drag.offsetY,
              },
            }
          : piece,
      );
    }
    scheduleDraw();
  }

  function pointerUp() {
    const id = dragRef.current.id;
    dragRef.current = { id: null, offsetX: 0, offsetY: 0, panning: false, startX: 0, startY: 0 };
    if (!id) return;
    const updated = piecesRef.current.map((piece) =>
      piece.id === id && canSnap(piece.currentPosition, piece.correctPosition, 0.38)
        ? {
            ...piece,
            currentPosition: { ...piece.correctPosition },
            isPlaced: true,
            groupId: "tabuleiro",
          }
        : piece,
    );
    piecesRef.current = updated;
    onPiecesChange(updated);
    onProgress(calculateProgress(updated.filter((piece) => piece.isPlaced).length, updated.length));
    scheduleDraw();
  }

  function wheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const next = Math.min(4, Math.max(0.25, viewRef.current.zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
    viewRef.current.zoom = next;
    setZoomLabel(Math.round(next * 100));
    scheduleDraw();
  }

  function keyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const visible = piecesRef.current.filter((piece) => piece.trayId === null && !piece.isPlaced);
    const selected = visible.find((piece) => piece.id === selectedId) ?? visible[0];
    if (!selected) return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "r", "R"].includes(event.key))
      event.preventDefault();
    const delta = event.shiftKey ? 0.02 : 0.08;
    const updated = piecesRef.current.map((piece) =>
      piece.id === selected.id
        ? {
            ...piece,
            currentPosition: {
              ...piece.currentPosition,
              x:
                piece.currentPosition.x +
                (event.key === "ArrowRight" ? delta : event.key === "ArrowLeft" ? -delta : 0),
              y:
                piece.currentPosition.y +
                (event.key === "ArrowDown" ? delta : event.key === "ArrowUp" ? -delta : 0),
              rotation:
                event.key.toLowerCase() === "r"
                  ? (piece.currentPosition.rotation + 90) % 360
                  : piece.currentPosition.rotation,
            },
          }
        : piece,
    );
    piecesRef.current = updated;
    setSelectedId(selected.id);
    if (event.key === "0") {
      viewRef.current = { zoom: 1, panX: 0, panY: 0 };
      setZoomLabel(100);
    }
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
        aria-label="Tabuleiro do quebra-cabeça. Use o ponteiro para arrastar peças, a roda para zoom ou as setas para mover a peça selecionada."
      />
      <span className="zoom-badge" aria-live="polite">
        {zoomLabel}%
      </span>
    </div>
  );
}
