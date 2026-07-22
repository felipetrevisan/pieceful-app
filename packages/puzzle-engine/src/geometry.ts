import type { Camera, PuzzlePiece, PuzzlePiecePosition } from "./types";

export interface Point {
  x: number;
  y: number;
}

export function screenToWorld(point: Point, camera: Camera): Point {
  return { x: (point.x - camera.x) / camera.zoom, y: (point.y - camera.y) / camera.zoom };
}

export function worldToScreen(point: Point, camera: Camera): Point {
  return { x: point.x * camera.zoom + camera.x, y: point.y * camera.zoom + camera.y };
}

export function snapDistance(current: PuzzlePiecePosition, target: PuzzlePiecePosition): number {
  return Math.hypot(current.x - target.x, current.y - target.y);
}

export function canSnap(
  current: PuzzlePiecePosition,
  target: PuzzlePiecePosition,
  tolerance: number,
): boolean {
  const rotation = ((current.rotation % 360) + 360) % 360;
  return rotation === target.rotation && snapDistance(current, target) <= tolerance;
}

export function normalizeQuarterTurn(rotation: number): number {
  const quarterTurn = Math.round(rotation / 90) * 90;
  return ((quarterTurn % 360) + 360) % 360;
}

function normalizedRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

export function neighborSnapOffset(
  moving: PuzzlePiece,
  stationary: PuzzlePiece,
  tolerance: number,
): Point | null {
  const rowDistance = Math.abs(moving.row - stationary.row);
  const columnDistance = Math.abs(moving.column - stationary.column);
  if (rowDistance + columnDistance !== 1) return null;

  const rotation = normalizedRotation(moving.currentPosition.rotation);
  if (rotation !== normalizedRotation(stationary.currentPosition.rotation)) return null;

  const radians = (rotation * Math.PI) / 180;
  const correctX = moving.correctPosition.x - stationary.correctPosition.x;
  const correctY = moving.correctPosition.y - stationary.correctPosition.y;
  const rotatedX = correctX * Math.cos(radians) - correctY * Math.sin(radians);
  const rotatedY = correctX * Math.sin(radians) + correctY * Math.cos(radians);
  const targetX = stationary.currentPosition.x + rotatedX;
  const targetY = stationary.currentPosition.y + rotatedY;
  const offset = {
    x: targetX - moving.currentPosition.x,
    y: targetY - moving.currentPosition.y,
  };

  return Math.hypot(offset.x, offset.y) <= tolerance ? offset : null;
}

export function calculateProgress(placed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((placed / total) * 100);
}
