import { describe, expect, test } from "bun:test";
import { canSnap, generatePieces, screenToWorld, worldToScreen } from ".";

describe("topologia", () => {
  test("é determinística e mantém bordas complementares", () => {
    const first = generatePieces(6, 8, 2026);
    const second = generatePieces(6, 8, 2026);
    expect(first).toEqual(second);
    for (const piece of first) {
      if (piece.row === 0) expect(piece.shape.top).toBe("flat");
      if (piece.column === 0) expect(piece.shape.left).toBe("flat");
      const right = first.find(
        (candidate) => candidate.row === piece.row && candidate.column === piece.column + 1,
      );
      if (right) expect(right.shape.left).not.toBe(piece.shape.right);
      const bottom = first.find(
        (candidate) => candidate.row === piece.row + 1 && candidate.column === piece.column,
      );
      if (bottom) expect(bottom.shape.top).not.toBe(piece.shape.bottom);
    }
  });
});

describe("geometria", () => {
  test("converte coordenadas sem perda", () => {
    const camera = { x: 12, y: 20, zoom: 2 };
    expect(screenToWorld(worldToScreen({ x: 5, y: 9 }, camera), camera)).toEqual({ x: 5, y: 9 });
  });

  test("snap exige proximidade e rotação", () => {
    expect(canSnap({ x: 1.05, y: 1, rotation: 360 }, { x: 1, y: 1, rotation: 0 }, 0.1)).toBe(true);
    expect(canSnap({ x: 1.05, y: 1, rotation: 90 }, { x: 1, y: 1, rotation: 0 }, 0.1)).toBe(false);
  });
});
