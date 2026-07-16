import type { PuzzleEdge, PuzzlePieceShape } from "./types";

export function edgeBump(edge: PuzzleEdge, direction: 1 | -1): number {
  if (edge === "flat") return 0;
  return (edge === "tab" ? 0.22 : -0.22) * direction;
}

function horizontal(
  ctx: CanvasRenderingContext2D,
  edge: PuzzleEdge,
  x: number,
  y: number,
  length: number,
  direction: 1 | -1,
) {
  const end = x + length * direction;
  if (edge === "flat") {
    ctx.lineTo(end, y);
    return;
  }
  const bump = -edgeBump(edge, direction);
  ctx.lineTo(x + length * 0.32 * direction, y);
  ctx.bezierCurveTo(
    x + length * 0.34 * direction,
    y + bump * length,
    x + length * 0.66 * direction,
    y + bump * length,
    x + length * 0.68 * direction,
    y,
  );
  ctx.lineTo(end, y);
}

function vertical(
  ctx: CanvasRenderingContext2D,
  edge: PuzzleEdge,
  x: number,
  y: number,
  length: number,
  direction: 1 | -1,
) {
  const end = y + length * direction;
  if (edge === "flat") {
    ctx.lineTo(x, end);
    return;
  }
  const bump = edgeBump(edge, direction);
  ctx.lineTo(x, y + length * 0.32 * direction);
  ctx.bezierCurveTo(
    x + bump * length,
    y + length * 0.34 * direction,
    x + bump * length,
    y + length * 0.66 * direction,
    x,
    y + length * 0.68 * direction,
  );
  ctx.lineTo(x, end);
}

export function tracePiecePath(
  ctx: CanvasRenderingContext2D,
  shape: PuzzlePieceShape,
  size: number,
): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  horizontal(ctx, shape.top, 0, 0, size, 1);
  vertical(ctx, shape.right, size, 0, size, 1);
  horizontal(ctx, shape.bottom, size, size, size, -1);
  vertical(ctx, shape.left, 0, size, size, -1);
  ctx.closePath();
}
