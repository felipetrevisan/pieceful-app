import type { Camera, PuzzlePiecePosition } from "./types";

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

export function calculateProgress(placed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((placed / total) * 100);
}
