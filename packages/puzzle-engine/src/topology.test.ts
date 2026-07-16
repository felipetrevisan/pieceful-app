import { describe, expect, test } from "bun:test";
import {
  canSnap,
  edgeBump,
  generatePieces,
  neighborSnapOffset,
  screenToWorld,
  worldToScreen,
} from ".";

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

  test("pinos e cavidades compartilham a mesma curva nos quatro lados", () => {
    expect(edgeBump("tab", 1)).toBe(edgeBump("blank", -1));
    expect(edgeBump("blank", 1)).toBe(edgeBump("tab", -1));
    expect(edgeBump("tab", 1)).toBeGreaterThan(0);
    expect(edgeBump("tab", -1)).toBeLessThan(0);
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

  test("ímã reconhece apenas vizinhas corretas e respeita a rotação", () => {
    const [left, right, far] = generatePieces(1, 3, 2026);
    if (!left || !right || !far) throw new Error("Peças de teste ausentes");
    left.currentPosition = { x: 2.92, y: 4, rotation: 0 };
    right.currentPosition = { x: 4, y: 4, rotation: 0 };
    far.currentPosition = { x: 3, y: 4, rotation: 0 };

    const offset = neighborSnapOffset(left, right, 0.12);
    expect(offset?.x).toBeCloseTo(0.08);
    expect(offset?.y).toBe(0);
    expect(neighborSnapOffset(left, far, 0.2)).toBeNull();
    right.currentPosition.rotation = 90;
    expect(neighborSnapOffset(left, right, 0.2)).toBeNull();
  });
});
